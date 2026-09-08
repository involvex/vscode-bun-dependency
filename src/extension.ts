import * as vscode from 'vscode'
import {BunRunner} from './bun.ts'
import {DependenciesProvider, type DepTreeItem} from './dependenciesProvider.ts'
import {ScriptTreeItem, ScriptsProvider} from './scriptsProvider.ts'
import {SearchPanel} from './searchPanel.ts'

function getWorkspaceRoot(): string | undefined {
	return vscode.workspace.workspaceFolders?.find(
		folder => folder.uri.scheme === 'file',
	)?.uri.fsPath
}

const PUBLISHER = 'vscode-bun-dependency'

function runBunWithProgress<T>(
	viewId: string,
	title: string,
	task: () => Thenable<T>,
): Thenable<T> {
	return vscode.window.withProgress({location: {viewId}, title}, async () =>
		task(),
	)
}

function showError(prefix: string, error: unknown): void {
	const message = error instanceof Error ? error.message : String(error)
	vscode.window.showErrorMessage(`Bun Dependencies: ${prefix} ${message}`)
}

export function activate(context: vscode.ExtensionContext) {
	const workspaceRoot = getWorkspaceRoot()

	// Register every command up front, even without a workspace folder, so
	// VS Code never reports "command 'vscode-bun-dependency.*' not found".
	const runner = new BunRunner(workspaceRoot ?? '')

	// Throws (after warning) for user-initiated commands that need a workspace.
	const ensureWorkspace = (): string => {
		if (workspaceRoot) {
			return workspaceRoot
		}
		vscode.window.showWarningMessage(
			'Bun Dependencies: open a workspace folder to use this extension.',
		)
		throw new Error('No workspace folder open.')
	}
	const dependencies = new DependenciesProvider(runner)
	const scripts = new ScriptsProvider(runner)

	const dependenciesView = vscode.window.createTreeView('bunDependencies', {
		treeDataProvider: dependencies,
	})
	const scriptsView = vscode.window.createTreeView('bunScripts', {
		treeDataProvider: scripts,
		showCollapseAll: true,
	})

	// Silent no-op when no workspace is open (used by startup auto-refresh).
	const reloadAll = async (): Promise<void> => {
		if (!workspaceRoot) {
			return
		}
		await Promise.all([dependencies.reload(), scripts.reload()])
	}

	const checkOutdated = async (notify: boolean): Promise<void> => {
		if (!workspaceRoot) {
			return
		}
		try {
			const outdated = await runBunWithProgress(
				'bunDependencies',
				'Checking for outdated packages',
				() => runner.outdated(),
			)
			dependencies.setOutdated(outdated)
			if (notify) {
				if (outdated.length === 0) {
					vscode.window.showInformationMessage(
						'Bun: all dependencies are up to date.',
					)
				} else {
					vscode.window.showInformationMessage(
						`Bun: ${outdated.length} package(s) have updates available.`,
					)
				}
			}
		} catch (error) {
			if (notify) {
				showError('Failed to check for outdated packages.', error)
			}
		}
	}

	const runScript = async (
		scriptOrItem: ScriptTreeItem | string | undefined,
	): Promise<void> => {
		ensureWorkspace()
		let name: string | undefined
		if (typeof scriptOrItem === 'string') {
			name = scriptOrItem
		} else if (scriptOrItem instanceof ScriptTreeItem) {
			name = scriptOrItem.script
		} else {
			const info = await runner.readPackageJson()
			const names = Object.keys(info.scripts)
			if (names.length === 0) {
				vscode.window.showInformationMessage(
					'Bun: no scripts defined in package.json.',
				)
				return
			}
			name = await vscode.window.showQuickPick(names, {
				placeHolder: 'Select a script to run with bun',
			})
			if (!name) {
				return
			}
		}
		const terminalName = `bun run ${name}`
		const terminal =
			vscode.window.terminals.find(
				candidate => candidate.name === terminalName && !candidate.exitStatus,
			) ?? vscode.window.createTerminal(terminalName)
		terminal.show(true)
		terminal.sendText(`bun run ${name}`, true)
	}

	const register = (
		command: string,
		handler: (...args: any[]) => unknown,
	): void => {
		context.subscriptions.push(
			vscode.commands.registerCommand(
				`${PUBLISHER}.${command}`,
				async (...args: unknown[]) => {
					try {
						await handler(...args)
					} catch (error) {
						showError(`Command "${command}" failed.`, error)
					}
				},
			),
		)
	}

	register('refresh', () => reloadAll())

	register('checkOutdated', () => checkOutdated(true))

	register('updateAll', async () => {
		ensureWorkspace()
		await runBunWithProgress(
			'bunDependencies',
			'Updating all packages with bun',
			() => runner.updateAll(),
		)
		await reloadAll()
		void checkOutdated(false)
		vscode.window.showInformationMessage('Bun: updated all packages.')
	})

	register('updatePackage', async (item: DepTreeItem) => {
		ensureWorkspace()
		const name = item?.entry?.name
		if (!name) {
			return
		}
		await runBunWithProgress('bunDependencies', `Updating ${name}`, () =>
			runner.update(name),
		)
		await reloadAll()
		void checkOutdated(false)
		vscode.window.showInformationMessage(`Bun: updated ${name}.`)
	})

	register('updatePackageLatest', async (item: DepTreeItem) => {
		ensureWorkspace()
		const name = item?.entry?.name
		if (!name) {
			return
		}
		await runBunWithProgress(
			'bunDependencies',
			`Updating ${name} to latest`,
			() => runner.updateLatest(name),
		)
		await reloadAll()
		void checkOutdated(false)
		vscode.window.showInformationMessage(
			`Bun: updated ${name} to the latest version.`,
		)
	})

	register('removePackage', async (item: DepTreeItem) => {
		ensureWorkspace()
		const name = item?.entry?.name
		if (!name) {
			return
		}
		const confirm = await vscode.window.showWarningMessage(
			`Bun: remove ${name}?`,
			{modal: true},
			'Remove',
		)
		if (confirm !== 'Remove') {
			return
		}
		await runBunWithProgress('bunDependencies', `Removing ${name}`, () =>
			runner.remove(name),
		)
		await reloadAll()
		vscode.window.showInformationMessage(`Bun: removed ${name}.`)
	})

	register('addPackage', () => openSearchPanel())

	register('openSearch', () => openSearchPanel())

	function openSearchPanel(): void {
		ensureWorkspace()
		SearchPanel.createOrShow(context, runner, () => {
			void reloadAll()
			void checkOutdated(false)
		})
	}

	scripts.setRunScriptCommand(`${PUBLISHER}.runScript`)
	register('runScript', (item: ScriptTreeItem | string | undefined) =>
		runScript(item),
	)

	register('refreshScripts', () => {
		ensureWorkspace()
		return scripts.reload()
	})

	// Keep both views in sync when package.json changes on disk.
	context.subscriptions.push(
		vscode.workspace.onDidSaveTextDocument(document => {
			if (document.fileName.endsWith('package.json')) {
				void reloadAll()
			}
		}),
		dependenciesView,
		scriptsView,
	)

	void reloadAll()
	void checkOutdated(false)
}

export function deactivate() {}
