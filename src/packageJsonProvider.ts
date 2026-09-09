import {join} from 'path'
import * as vscode from 'vscode'

export class PackageSelectorItem extends vscode.TreeItem {
	constructor(label: string, description?: string) {
		super(label, vscode.TreeItemCollapsibleState.None)
		this.contextValue = 'packageSelector'
		this.iconPath = new vscode.ThemeIcon('file')
		if (description) {
			this.description = description
			this.tooltip = new vscode.MarkdownString(
				`Target package.json: \`${description}\``,
			)
		}
	}
}

export class PackageJsonProvider {
	private readonly emitter = new vscode.EventEmitter<void>()
	readonly onDidChangeActivePackage: vscode.Event<void> = this.emitter.event

	private active: vscode.Uri | undefined

	constructor(private readonly workspaceRoot: string) {}

	async discover(): Promise<vscode.Uri[]> {
		const uris = await vscode.workspace.findFiles(
			'**/package.json',
			'**/node_modules/**',
		)
		return uris.sort((a, b) => a.fsPath.localeCompare(b.fsPath))
	}

	getActiveUri(): vscode.Uri | undefined {
		return this.active
	}

	getActivePath(): string | undefined {
		return this.active?.fsPath
	}

	async select(): Promise<void> {
		const files = await this.discover()
		if (files.length === 0) {
			vscode.window.showWarningMessage(
				'Bun Dependencies: no package.json files found in this workspace.',
			)
			return
		}
		const items = files.map(uri => ({
			label: vscode.workspace.asRelativePath(uri),
			description: uri.fsPath,
			uri,
		}))
		const picked = await vscode.window.showQuickPick(items, {
			placeHolder: 'Select a package.json to target',
		})
		if (picked && picked.uri.fsPath !== this.active?.fsPath) {
			this.active = picked.uri
			this.emitter.fire()
		}
	}

	async initialize(): Promise<void> {
		const files = await this.discover()
		if (files.length === 0) {
			return
		}
		const root = files.find(
			uri => join(this.workspaceRoot, 'package.json') === uri.fsPath,
		)
		this.active = root ?? files[0]
	}
}
