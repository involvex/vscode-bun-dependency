# Change Log

All notable changes to the "vscode-bun-dependency" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- Initial release

### Added

- A clickable `package.json` selector at the top of the Dependencies and Bun Scripts tree views. Clicking it opens a quick pick of all `package.json` files discovered in the workspace (recursively, excluding `node_modules`). The selection is shared across both views and persists for the session; switching it re-runs `bun` operations against the selected file's directory.

### Fixed

- The package search webview now loads its own script and stylesheet. Previously `localResourceRoots: []` blocked all local resources, so the Search Packages panel opened but search, install, and Add Package did nothing.
