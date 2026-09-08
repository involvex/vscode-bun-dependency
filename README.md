# vscode-bun-dependency

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A Visual Studio Code extension for managing dependencies, devDependencies, and scripts in `package.json` using [Bun](https://bun.sh) — directly from the Explorer.

Update dependencies/devDependencies for a specific `package.json` with Bun and execute scripts, without leaving your editor.

## Features

- **Bun Dependencies explorer** — dedicated activity bar container with three tree views:
  - **Dependencies** — runtime dependencies from the active `package.json`
  - **Dev Dependencies** — development dependencies
  - **Bun Scripts** — scripts from `package.json`, runnable with one click
- **Check for outdated packages** — runs `bun outdated` and marks packages with newer versions available
- **Update packages** — update a single package, update to the latest version, or update everything at once
- **Add / remove packages** — quick-pick package management backed by `bun add` / `bun remove`
- **Package search** — webview panel to search the npm registry and install packages without leaving VS Code
- **Run scripts** — execute any `package.json` script through Bun from the tree view
- **Theme-aware UI** — icons and colors follow your VS Code color theme

## Requirements

- [Bun](https://bun.sh) >= 1.3.0 installed and available on your `PATH`
- Visual Studio Code >= 1.136.0
- A workspace folder containing a `package.json`

Windows, macOS, and Linux are supported.

## Installation

The extension is not yet published to the marketplace. Build and install it from source:

1. Install dependencies:

   ```powershell
   bun install
   ```

2. Package the extension as a `.vsix`:

   ```powershell
   bun run package
   ```

3. Install the generated `.vsix` from the `dist/` folder:

   ```powershell
   code --install-extension dist\vscode-bun-dependency-0.0.1.vsix
   ```

## Usage

1. Click the **Bun Dependencies** icon in the activity bar.
2. The **Dependencies**, **Dev Dependencies**, and **Bun Scripts** views load from the first workspace folder containing a `package.json`.

### Tree view actions

| Action                           | How                                                               |
| -------------------------------- | ----------------------------------------------------------------- |
| Refresh dependencies             | Refresh button in the view title bar                              |
| Check for outdated packages      | Sync button in the view title bar (outdated packages are flagged) |
| Update all packages              | Cloud download button in the view title bar                       |
| Add a package                    | Add button in the view title bar                                  |
| Search packages to install       | Search button in the view title bar                               |
| Update a single outdated package | Inline arrow-up icon on the package item                          |
| Update a package to latest       | Right-click → **Update Package to Latest**                        |
| Remove a package                 | Inline trash icon, or right-click → **Remove Package**            |
| Run a script                     | Inline play icon on the script item                               |
| Refresh scripts                  | Refresh button in the scripts view title bar                      |

### Commands

All commands are available from the command palette (`Ctrl+Shift+P`) under the **Bun** category:

| Command                                     | Title                       |
| ------------------------------------------- | --------------------------- |
| `vscode-bun-dependency.refresh`             | Refresh Dependencies        |
| `vscode-bun-dependency.checkOutdated`       | Check for Outdated Packages |
| `vscode-bun-dependency.updateAll`           | Update All Packages         |
| `vscode-bun-dependency.updatePackage`       | Update Package              |
| `vscode-bun-dependency.updatePackageLatest` | Update Package to Latest    |
| `vscode-bun-dependency.removePackage`       | Remove Package              |
| `vscode-bun-dependency.addPackage`          | Add Package                 |
| `vscode-bun-dependency.openSearch`          | Search Packages to Install  |
| `vscode-bun-dependency.runScript`           | Run Script                  |
| `vscode-bun-dependency.refreshScripts`      | Refresh Scripts             |

## Development

Requires [Bun](https://bun.sh) >= 1.3.0. All tooling runs through Bun.

```powershell
# Install dependencies
bun install

# Compile TypeScript to ./out
bun run compile

# Watch mode (recompile on changes)
bun run watch
```

Press `F5` in VS Code (or use the **Run Extension** debug configuration) to open an Extension Development Host window with the extension loaded.

### Testing

```powershell
bun run test
```

### Linting, formatting, and type checking

```powershell
# Format, lint (with fixes), and typecheck
bun run check

# Individually
bun run format
bun run lint
bun run lint:fix
bun run typecheck
```

### Packaging

```powershell
# Package the extension as .vsix into ./dist
bun run package

# Clean build artifacts
bun run clean

# Full prepublish pipeline (clean + check + compile)
bun run vscode:prepublish
```

## Project structure

| File                          | Responsibility                                                              |
| ----------------------------- | --------------------------------------------------------------------------- |
| `src/extension.ts`            | Extension activation, command registration, tree view setup                 |
| `src/bun.ts`                  | `BunRunner` class wrapping the `bun` CLI, registry search, outdated parsing |
| `src/dependenciesProvider.ts` | Tree data provider for dependencies and devDependencies                     |
| `src/scriptsProvider.ts`      | Tree data provider for Bun scripts                                          |
| `src/searchPanel.ts`          | Webview panel for searching and installing npm packages                     |

## Troubleshooting

- **"bun: command not found"** — make sure Bun is installed and on your `PATH`. See the [Bun installation docs](https://bun.sh/docs/installation).
- **Extension fails to activate** — check the Extension Host console (`Help > Toggle Developer Tools`) for stack traces.
- **No packages shown** — confirm the workspace contains a `package.json` and use the refresh button.

## License

This project is licensed under the [MIT License](LICENSE).
