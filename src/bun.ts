import {execFile} from 'child_process'
import {readFile} from 'fs/promises'
import {dirname, join} from 'path'
import {promisify} from 'util'

const execFileAsync = promisify(execFile)

export interface OutdatedPackage {
	name: string
	isDev: boolean
	current: string
	update: string
	latest: string
}

export interface RegistryPackage {
	name: string
	version: string
	description: string
	publisher: string
	npmUrl: string
	score: number
}

export interface PackageJsonInfo {
	name: string
	dependencies: Record<string, string>
	devDependencies: Record<string, string>
	scripts: Record<string, string>
}

const EMPTY_INFO: PackageJsonInfo = {
	name: '',
	dependencies: {},
	devDependencies: {},
	scripts: {},
}

export class BunRunner {
	private packageJsonPath: string

	constructor(
		readonly workspaceRoot: string,
		packageJsonPath?: string,
	) {
		this.packageJsonPath =
			packageJsonPath ?? join(workspaceRoot, 'package.json')
	}

	setPackageJsonPath(path: string): void {
		this.packageJsonPath = path
	}

	async exec(args: string[]): Promise<string> {
		try {
			const {stdout} = await execFileAsync('bun', args, {
				cwd: dirname(this.packageJsonPath),
				maxBuffer: 16 * 1024 * 1024,
				windowsHide: true,
			})
			return stdout
		} catch (error) {
			const err = error as {stdout?: string; stderr?: string; message?: string}
			const output = `${err.stdout ?? ''}\n${err.stderr ?? ''}`.trim()
			const failure = new Error(
				output || err.message || `bun ${args[0]} failed`,
			)
			failure.name = 'BunError'
			throw failure
		}
	}

	async readPackageJson(): Promise<PackageJsonInfo> {
		try {
			const raw = await readFile(this.packageJsonPath, 'utf8')
			const parsed = JSON.parse(raw) as Partial<PackageJsonInfo>
			return {
				name: parsed.name ?? '',
				dependencies: parsed.dependencies ?? {},
				devDependencies: parsed.devDependencies ?? {},
				scripts: parsed.scripts ?? {},
			}
		} catch {
			return {...EMPTY_INFO}
		}
	}

	async outdated(): Promise<OutdatedPackage[]> {
		const stdout = await this.exec(['outdated'])
		return parseOutdated(stdout)
	}

	async add(name: string, dev: boolean): Promise<string> {
		return this.exec(dev ? ['add', '-d', name] : ['add', name])
	}

	async remove(name: string): Promise<string> {
		return this.exec(['remove', name])
	}

	async updateAll(): Promise<string> {
		return this.exec(['update'])
	}

	async update(name: string): Promise<string> {
		return this.exec(['update', name])
	}

	async updateLatest(name: string): Promise<string> {
		return this.exec(['add', `${name}@latest`])
	}

	async search(query: string, size = 25): Promise<RegistryPackage[]> {
		const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=${size}`
		const response = await fetch(url, {headers: {accept: 'application/json'}})
		if (!response.ok) {
			throw new Error(`Registry search failed with status ${response.status}`)
		}
		const data = (await response.json()) as {
			objects?: Array<{
				package?: {
					name?: string
					version?: string
					description?: string
					publisher?: {username?: string}
					links?: {npm?: string}
				}
				score?: {final?: number}
			}>
		}
		return (data.objects ?? [])
			.filter(entry => entry.package?.name)
			.map(entry => ({
				name: entry.package?.name ?? '',
				version: entry.package?.version ?? '',
				description: entry.package?.description ?? '',
				publisher: entry.package?.publisher?.username ?? '',
				npmUrl:
					entry.package?.links?.npm ??
					`https://www.npmjs.com/package/${entry.package?.name}`,
				score: Math.round((entry.score?.final ?? 0) * 100) / 100,
			}))
	}
}

export function parseOutdated(stdout: string): OutdatedPackage[] {
	const rows: OutdatedPackage[] = []
	for (const line of stdout.split(/\r?\n/)) {
		const trimmed = line.trim()
		if (!trimmed.startsWith('|')) {
			continue
		}
		// Skip separator lines such as |----|----|
		if (/^[-|\s]+$/.test(trimmed)) {
			continue
		}
		const cells = trimmed
			.split('|')
			.slice(1, -1)
			.map(cell => cell.trim())
		if (cells.length < 4 || cells[0] === 'Package') {
			continue
		}
		let name = cells[0]
		let isDev = false
		const marker = /\s\((dev|optional|peer)\)$/.exec(name)
		if (marker) {
			isDev = marker[1] === 'dev'
			name = name.slice(0, marker.index).trim()
		}
		rows.push({
			name,
			isDev,
			current: cells[1],
			update: cells[2],
			latest: cells[3],
		})
	}
	return rows
}
