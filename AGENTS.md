# AGENTS.md

Instructions and guidelines for AI agents and human contributors working in this repository.

---

## Project Overview

**Repository:** `vscode-bun-dependency`  
**Type:** Visual Studio Code extension (TypeScript)  
**Purpose:** Manage dependencies, devDependencies, and scripts in `package.json` using **Bun** directly from the VS Code Explorer. Provides tree views for dependencies, devDependencies, and Bun scripts, plus a webview-based package search.

**Runtime requirements:**

- [Bun](https://bun.sh) >= 1.3.0 (required)
- Node.js is **not** used; all scripts and tooling run through `bun`
- Windows, macOS, Linux supported

---

## Useful Commands

All commands should be run from the repository root. Prefer `bun` over `npm`, `npx`, `pnpm`, or `yarn`.

### Development

```powershell
# Install dependencies
bun install

# Compile TypeScript to ./out
bun run compile

# Watch mode (recompile on changes)
bun run watch

# Run the extension in a new VS Code window (Extension Development Host)
# Press F5 in VS Code, or run the "Run Extension" debug configuration
```

### Linting & Formatting

```powershell
# Check formatting and lint, then run typecheck
bun run check

# Format code with Prettier
bun run format

# Lint with ESLint
bun run lint

# Lint and auto-fix
bun run lint:fix

# TypeScript type checking (no emit)
bun run typecheck
```

### Testing

```powershell
# Run tests (pretest runs compile + lint first)
bun run test
```

### Packaging

```powershell
# Clean build artifacts
bun run clean

# Package the extension as .vsix
bun run package

# Prepublish (clean + check + compile)
bun run vscode:prepublish
```

### Git

```powershell
# Stage changes
git add .

# Commit with message
git commit -m "feat: describe your change"

# Push to remote
git push

# Create a PR (requires gh CLI)
gh pr create --title "feat: describe your change" --body "Description"
```

---

## Technologies

| Technology                | Role                          | Notes                                                           |
| ------------------------- | ----------------------------- | --------------------------------------------------------------- |
| **TypeScript**            | Primary language              | Target: ES2022, module: Node16, strict mode enabled             |
| **VS Code Extension API** | Extension host integration    | `vscode` package >= 1.136.0                                     |
| **Bun**                   | Runtime, package manager, CLI | Used for `bun add/remove/update/outdated`                       |
| **ESLint**                | Linting                       | `typescript-eslint` parser, custom rules in `eslint.config.mjs` |
| **Prettier**              | Formatting                    | Config inherited from `@involvex/prettier-config`               |
| **Mocha / vscode-test**   | Testing                       | Tests live in `src/test/extension.test.ts`                      |

### Key Source Files

| File                          | Responsibility                                                         |
| ----------------------------- | ---------------------------------------------------------------------- |
| `src/extension.ts`            | Extension activation, command registration, tree view setup            |
| `src/bun.ts`                  | `BunRunner` class wrapping `bun` CLI, registry search, `parseOutdated` |
| `src/dependenciesProvider.ts` | `TreeDataProvider` for Dependencies / Dev Dependencies                 |
| `src/scriptsProvider.ts`      | `TreeDataProvider` for Bun scripts                                     |
| `src/searchPanel.ts`          | Webview panel for searching and installing npm packages                |

---

## Best Practices and Guidelines

### 1. Bun First

- **Always** use `bun` for package management, scripts, and runtime tasks.
- Do not use `npm`, `npx`, `pnpm`, or `yarn` in scripts or documentation.
- `bun` is available as a system command; the extension shells out to it via `child_process.execFile`.

### 2. TypeScript Strictness

- `tsconfig.json` has `"strict": true`. All new code must pass `bun run typecheck` without errors.
- Prefer explicit types over `any`. Use `unknown` when the shape is uncertain.
- Use `readonly` for properties that should not be reassigned after construction.

### 3. VS Code Extension Patterns

- Register all commands in `activate()` and push disposables to `context.subscriptions`.
- Use `vscode.window.withProgress` for long-running Bun operations so the user sees feedback.
- Always handle errors gracefully; show user-friendly messages via `vscode.window.showErrorMessage`.
- Dispose of `EventEmitter`, `WebviewPanel`, and other disposables to avoid memory leaks.
- Use `ThemeIcon` and theme colors for icons to respect the user's color theme.

### 4. Shelling Out to Bun

- Use `child_process.execFile` (already promisified in `src/bun.ts`).
- Never use `exec` or `spawn` with user input concatenated into a shell string.
- Set `windowsHide: true` to suppress console windows on Windows.
- Set `maxBuffer` to at least `16 * 1024 * 1024` for `bun outdated` output.
- Always capture `stderr` and surface meaningful error messages.

### 5. Security

- The webview in `searchPanel.ts` uses a nonce-based CSP: `script-src 'nonce-...'`.
- Do not enable `enableScripts: true` with `localResourceRoots: []` for untrusted content.
- All external URLs (npm registry, npmjs.com) are opened via `vscode.env.openExternal`, never injected into the webview as executable content.
- Never log or store secrets, tokens, or credentials.
- Validate all JSON parsed from disk or network (`package.json`, registry responses).

### 6. Code Style

- Follow the existing codebase style: 4-space indentation, no semicolons, camelCase for variables/functions, PascalCase for classes.
- Run `bun run format` and `bun run lint:fix` before committing.
- Use `bun run check` to verify everything passes before pushing.
- Keep functions small and focused. Extract complex logic into well-named helper functions.

### 7. Error Handling

- Wrap async command handlers in try/catch and show user-visible errors.
- When a workspace folder is required, call `ensureWorkspace()` and show a warning if missing.
- Do not throw unhandled promise rejections from command handlers.

### 8. Testing

- Tests use the VS Code Extension Test Runner (`@vscode/test-cli`).
- Tests live in `src/test/` and must match the pattern `**.test.ts`.
- Run `bun run test` to execute tests; the `pretest` hook compiles and lints first.
- If you add new commands, add corresponding tests.

### 9. Windows Compatibility

- This extension runs on Windows. Use `path.join` and `path.sep` for path operations.
- Avoid hardcoded forward slashes in shell commands; Bun handles them, but be consistent.
- `bun` must be on the PATH for the extension to work; document this in user-facing messages if needed.

### 10. Documentation

- Update `CHANGELOG.md` for user-facing changes following [Keep a Changelog](http://keepachangelog.com/).
- Update `package.json` contributes/commands if you add or rename commands.
- Do not create new `.md` files unless explicitly requested.

---

## Environment Variables

None required for development. For CI/CD, configure `GITHUB_TOKEN` or equivalent for publishing.

---

## Troubleshooting

- **"bun: command not found"**: Ensure Bun is installed and on PATH. See https://bun.sh/docs/installation.
- **Tests not discovered**: Run `bun run watch` in a separate terminal so the Extension Test Runner can discover compiled output.
- **Extension fails to activate**: Check the VS Code Extension Host console (Help > Toggle Developer Tools) for stack traces.
