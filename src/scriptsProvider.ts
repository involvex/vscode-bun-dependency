import * as vscode from 'vscode'
import type {BunRunner} from './bun.ts'
import {PackageSelectorItem} from './packageJsonProvider.ts'

export class RootTreeItem extends vscode.TreeItem {
	constructor() {
		super('Bun Scripts', vscode.TreeItemCollapsibleState.Expanded)
		this.contextValue = 'bunScriptsRoot'
	}
}

export class ScriptTreeItem extends vscode.TreeItem {
	constructor(
		public readonly script: string,
		command?: string,
	) {
		super(script, vscode.TreeItemCollapsibleState.None)
		this.iconPath = new vscode.ThemeIcon('terminal')
		this.tooltip = new vscode.MarkdownString(`Run \`bun run ${script}\``)
		this.contextValue = 'bunScript'
		if (command) {
			this.command = {
				command,
				title: 'Run Script',
				arguments: [this],
			}
		}
	}
}

export type ScriptsTreeItem = RootTreeItem | ScriptTreeItem

export class ScriptsProvider implements vscode.TreeDataProvider<ScriptsTreeItem> {
	private readonly emitter = new vscode.EventEmitter<
		ScriptsTreeItem | undefined | void
	>()
	readonly onDidChangeTreeData: vscode.Event<
		ScriptsTreeItem | undefined | void
	> = this.emitter.event

	private scripts: string[] = []
	private runScriptCommand = 'vscode-bun-dependency.runScript'

	constructor(
		private readonly runner: BunRunner,
		private readonly activePackageLabel: () => string,
	) {}

	refresh(): void {
		this.emitter.fire()
	}

	setRunScriptCommand(command: string): void {
		this.runScriptCommand = command
	}

	async reload(): Promise<void> {
		const info = await this.runner.readPackageJson()
		this.scripts = Object.keys(info.scripts)
		this.refresh()
	}

	getTreeItem(element: ScriptsTreeItem): vscode.TreeItem {
		return element
	}

	async getChildren(element?: ScriptsTreeItem): Promise<ScriptsTreeItem[]> {
		if (!element) {
			const selector = new PackageSelectorItem(
				'package.json',
				this.activePackageLabel(),
			)
			selector.command = {
				command: 'vscode-bun-dependency.selectPackage',
				title: 'Select package.json',
				arguments: [],
			}
			return [selector]
		}

		if (element instanceof RootTreeItem) {
			if (this.scripts.length === 0) {
				return [new ScriptTreeItem('No scripts defined in package.json')]
			}
			return this.scripts.map(
				script => new ScriptTreeItem(script, this.runScriptCommand),
			)
		}
		return []
	}
}
