import * as vscode from 'vscode'
import type {BunRunner} from './bun.ts'

interface SearchMessage {
	command: 'search' | 'install' | 'openExternal'
	query?: string
	name?: string
	dev?: boolean
	url?: string
}

export class SearchPanel {
	public static currentPanel: SearchPanel | undefined

	private readonly panel: vscode.WebviewPanel
	private disposables: vscode.Disposable[] = []

	public static createOrShow(
		context: vscode.ExtensionContext,
		runner: BunRunner,
		onInstalled: () => void,
	): SearchPanel {
		if (SearchPanel.currentPanel) {
			SearchPanel.currentPanel.panel.reveal(vscode.ViewColumn.Active)
			return SearchPanel.currentPanel
		}
		const panel = vscode.window.createWebviewPanel(
			'bunPackageSearch',
			'Search Packages (bun)',
			vscode.ViewColumn.Active,
			{
				enableScripts: true,
				localResourceRoots: [],
			},
		)
		SearchPanel.currentPanel = new SearchPanel(
			panel,
			context,
			runner,
			onInstalled,
		)
		return SearchPanel.currentPanel
	}

	private constructor(
		panel: vscode.WebviewPanel,
		context: vscode.ExtensionContext,
		private readonly runner: BunRunner,
		private readonly onInstalled: () => void,
	) {
		this.panel = panel
		this.panel.webview.html = this.getHtml(
			this.panel.webview,
			context.extensionUri,
		)
		this.panel.onDidDispose(() => this.dispose(), null, this.disposables)
		this.panel.webview.onDidReceiveMessage(
			(message: SearchMessage) => void this.handleMessage(message),
			null,
			this.disposables,
		)
	}

	private async handleMessage(message: SearchMessage): Promise<void> {
		switch (message.command) {
			case 'search': {
				const query = (message.query ?? '').trim()
				if (query.length === 0) {
					this.post({type: 'results', items: [], query})
					return
				}
				try {
					const items = await this.runner.search(query)
					this.post({type: 'results', items, query})
				} catch (error) {
					this.post({
						type: 'error',
						message: error instanceof Error ? error.message : String(error),
					})
				}
				break
			}
			case 'install': {
				const name = message.name ?? ''
				if (!name) {
					return
				}
				const dev = message.dev === true
				this.post({type: 'busy', name, dev})
				try {
					await this.runner.add(name, dev)
					this.onInstalled()
					this.post({type: 'installed', name, dev})
				} catch (error) {
					this.post({
						type: 'error',
						message: error instanceof Error ? error.message : String(error),
					})
				}
				break
			}
			case 'openExternal': {
				if (message.url) {
					await vscode.env.openExternal(vscode.Uri.parse(message.url))
				}
				break
			}
		}
	}

	private post(message: Record<string, unknown>): void {
		void this.panel.webview.postMessage(message)
	}

	private dispose(): void {
		SearchPanel.currentPanel = undefined
		this.panel.dispose()
		this.disposables.forEach(disposable => disposable.dispose())
		this.disposables = []
	}

	private getHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
		const nonce = getNonce()
		const stylesUri = webview.asWebviewUri(
			vscode.Uri.joinPath(extensionUri, 'media', 'search.css'),
		)
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(extensionUri, 'media', 'search.js'),
		)
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} data:; script-src 'nonce-${nonce}';">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Search Packages (bun)</title>
	<link href="${stylesUri}" rel="stylesheet">
</head>
<body>
	<div class="search-bar">
		<input id="query" type="text" placeholder="Search npm packages to install with bun…" autofocus />
		<button id="search" class="primary" type="button">Search</button>
	</div>
	<div id="status" class="status" hidden></div>
	<div id="results"></div>
	<script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`
	}
}

function getNonce(): string {
	let text = ''
	const possible =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length))
	}
	return text
}
