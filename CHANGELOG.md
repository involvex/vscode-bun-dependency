# Change Log

All notable changes to the "vscode-bun-dependency" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- Initial release

### Fixed

- The package search webview now loads its own script and stylesheet. Previously `localResourceRoots: []` blocked all local resources, so the Search Packages panel opened but search, install, and Add Package did nothing.
