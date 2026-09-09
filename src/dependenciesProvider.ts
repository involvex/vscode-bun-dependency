import * as vscode from 'vscode'
import type {BunRunner, OutdatedPackage} from './bun.ts'
import {PackageSelectorItem} from './packageJsonProvider.ts'

export interface PackageEntry {
	name: string
	range: string
	dev: boolean
}

export type SectionId = 'dependencies' | 'devDependencies'

export class DepTreeItem extends vscode.TreeItem {
	constructor(
		label: string,
		public readonly section?: SectionId,
		public readonly entry?: PackageEntry,
	) {
		super(
			label,
			section
				? vscode.TreeItemCollapsibleState.Expanded
				: vscode.TreeItemCollapsibleState.None,
		)
	}
}

export class DependenciesProvider implements vscode.TreeDataProvider<DepTreeItem> {
	private readonly emitter = new vscode.EventEmitter<
		DepTreeItem | undefined | void
	>()
	readonly onDidChangeTreeData: vscode.Event<DepTreeItem | undefined | void> =
		this.emitter.event

	private outdatedMap = new Map<string, OutdatedPackage>()
	private packages: PackageEntry[] = []
	private packageName = ''

	constructor(
		private readonly runner: BunRunner,
		private readonly activePackageLabel: () => string,
	) {}

	refresh(): void {
		this.emitter.fire()
	}

	async reload(): Promise<void> {
		const info = await this.runner.readPackageJson()
		this.packageName = info.name
		const entries: PackageEntry[] = [
			...Object.entries(info.dependencies).map(([name, range]) => ({
				name,
				range,
				dev: false,
			})),
			...Object.entries(info.devDependencies).map(([name, range]) => ({
				name,
				range,
				dev: true,
			})),
		]
		this.packages = entries
		this.refresh()
	}

	setOutdated(outdated: OutdatedPackage[]): void {
		this.outdatedMap = new Map(outdated.map(pkg => [pkg.name, pkg]))
		this.refresh()
	}

	getTreeItem(element: DepTreeItem): vscode.TreeItem {
		return element
	}

	async getChildren(element?: DepTreeItem): Promise<DepTreeItem[]> {
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
			const hasDeps = this.packages.some(pkg => !pkg.dev)
			const hasDevDeps = this.packages.some(pkg => pkg.dev)
			const items: DepTreeItem[] = [selector]
			if (hasDeps) {
				items.push(new DepTreeItem('Dependencies', 'dependencies'))
			}
			if (hasDevDeps) {
				items.push(new DepTreeItem('Dev Dependencies', 'devDependencies'))
			}
			if (items.length === 1) {
				const empty = new DepTreeItem('No dependencies found in package.json')
				return [selector, empty]
			}
			return items
		}

		if (element.section) {
			const dev = element.section === 'devDependencies'
			return this.packages
				.filter(pkg => pkg.dev === dev)
				.map(pkg => this.createPackageItem(pkg))
		}
		return []
	}

	private createPackageItem(entry: PackageEntry): DepTreeItem {
		const item = new DepTreeItem(entry.name, undefined, entry)
		const outdated = this.outdatedMap.get(entry.name)
		item.description = entry.range
		item.tooltip = new vscode.MarkdownString(
			`**${entry.name}**\n\nRequired: \`${entry.range}\`${this.packageName ? `\n\nInstalled in ${entry.dev ? 'devDependencies' : 'dependencies'}` : ''}`,
		)
		if (outdated && outdated.current !== outdated.latest) {
			item.description = `${entry.range}  →  ${outdated.latest}`
			item.iconPath = new vscode.ThemeIcon(
				'arrow-up',
				new vscode.ThemeColor('charts.blue'),
			)
			item.tooltip = new vscode.MarkdownString(
				`**${entry.name}**\n\nInstalled: \`${outdated.current}\`\n\nUpdate (within range): \`${outdated.update}\`\n\nLatest: \`${outdated.latest}\``,
			)
			item.contextValue = 'outdatedPackage'
		} else {
			item.contextValue = 'package'
		}
		return item
	}
}
