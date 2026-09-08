const vscode = acquireVsCodeApi()

const input = document.getElementById('query')
const searchButton = document.getElementById('search')
const status = document.getElementById('status')
const results = document.getElementById('results')

let debounceTimer

function escapeHtml(value) {
	const div = document.createElement('div')
	div.textContent = value ?? ''
	return div.innerHTML
}

function setStatus(text) {
	status.hidden = !text
	status.textContent = text || ''
}

function search() {
	const query = input.value.trim()
	if (!query) {
		return
	}
	setStatus('Searching…')
	results.replaceChildren()
	vscode.postMessage({command: 'search', query})
}

function renderResults(items) {
	results.replaceChildren()
	if (!items || items.length === 0) {
		setStatus('No packages found.')
		return
	}
	setStatus(`${items.length} result(s)`)
	for (const item of items) {
		results.appendChild(createResultRow(item))
	}
}

function createResultRow(item) {
	const row = document.createElement('div')
	row.className = 'result'
	row.dataset.name = item.name

	const header = document.createElement('div')
	header.className = 'result-header'

	const name = document.createElement('span')
	name.className = 'result-name'
	name.textContent = item.name
	name.title = 'Open on npmjs.com'
	name.addEventListener('click', () => {
		vscode.postMessage({command: 'openExternal', url: item.npmUrl})
	})

	const version = document.createElement('span')
	version.className = 'result-version'
	version.textContent = `v${item.version}`

	header.appendChild(name)
	header.appendChild(version)

	const desc = document.createElement('div')
	desc.className = 'result-desc'
	desc.textContent = item.description || 'No description.'

	const meta = document.createElement('div')
	meta.className = 'result-meta'
	meta.textContent = [
		item.publisher ? `by ${item.publisher}` : '',
		`score ${item.score}`,
	]
		.filter(Boolean)
		.join(' · ')

	const actions = document.createElement('div')
	actions.className = 'result-actions'

	const installButton = document.createElement('button')
	installButton.className = 'primary'
	installButton.textContent = 'Install (bun)'
	installButton.addEventListener('click', () => {
		vscode.postMessage({command: 'install', name: item.name, dev: false})
	})

	const devButton = document.createElement('button')
	devButton.textContent = 'Install as dev (bun)'
	devButton.addEventListener('click', () => {
		vscode.postMessage({command: 'install', name: item.name, dev: true})
	})

	actions.appendChild(installButton)
	actions.appendChild(devButton)

	row.appendChild(header)
	row.appendChild(desc)
	row.appendChild(meta)
	row.appendChild(actions)
	return row
}

window.addEventListener('message', event => {
	const message = event.data
	switch (message.type) {
		case 'results':
			renderResults(message.items)
			break
		case 'busy': {
			setStatus(
				`Installing ${message.name}${message.dev ? ' (dev)' : ''} with bun…`,
			)
			for (const button of document.querySelectorAll(
				`[data-name="${CSS.escape(message.name)}"] button`,
			)) {
				button.disabled = true
			}
			break
		}
		case 'installed':
			setStatus(
				`Installed ${message.name}${message.dev ? ' as devDependency' : ''} with bun.`,
			)
			break
		case 'error':
			setStatus(`Error: ${message.message}`)
			break
	}
})

input.addEventListener('input', () => {
	clearTimeout(debounceTimer)
	debounceTimer = setTimeout(search, 450)
})
input.addEventListener('keydown', event => {
	if (event.key === 'Enter') {
		clearTimeout(debounceTimer)
		search()
	}
})
searchButton.addEventListener('click', search)

// Surface unexpected runtime failures in the webview to the extension host so
// they become visible instead of silently looking like "the button does
// nothing".
window.addEventListener('error', event => {
	vscode.postMessage({command: 'webviewError', message: event.message})
})
