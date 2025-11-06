# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.12] - 2025-11-06

### Fixed
- **Critical:** AI analysis now provides 2-5 actionable suggestions per file instead of returning zero suggestions
- **Critical:** Fixed viewport scrolling during analysis - removed console.log/console.error breaking Ink rendering
- **Critical:** App no longer exits immediately after analysis - waits for user confirmation
- **Critical:** "Press any key to continue" prompt now works correctly in ReviewPanel

### Changed
- **AI Prompt:** Rewrote analysis prompt to be more directive and request specific improvements (src/engine/analysis.ts:438-470)
- **System Message:** Updated to emphasize providing feedback even for well-written code (src/engine/analysis.ts:473-475)
- **RunConsole:** Added user confirmation step with "Press any key to review results" prompt (src/components/RunConsole.tsx)
- **ReviewPanel:** Fixed useInput hook to properly listen for keypresses instead of calling onComplete immediately (src/components/ReviewPanel.tsx:18-62)
- **Viewport:** Analysis progress details now hidden when complete, showing only clean summary (src/components/RunConsole.tsx:105-169)

### Improved
- Clean single-viewport experience throughout analysis - no console output interference
- Professional summary display after analysis with clear next-step prompts
- Better error handling - individual file failures don't crash entire analysis
- AI now looks for low-severity improvements (readability, documentation, structure) even in good code

## [2.0.11] - 2025-11-05

### Fixed
- **Model selection flow:** Model selection now returns to start menu instead of exiting (src/index.tsx:186)
- **Dynamic Ollama models:** Ollama model list now fetches only installed models from local instance (src/engine/models.ts:49)
- **Model visibility:** Current model now displayed in subtitle: "Current model: provider/model" (src/index.tsx:228)

### Changed
- Added `getInstalledOllamaModels()` function to fetch models from Ollama API (src/engine/models.ts:49)
- ModelSelect component now has Ollama-specific state and loading indicators (src/components/ModelSelect.tsx:32)
- Interactive menu subtitle now shows current model configuration or "No model selected" (src/index.tsx:72)

### Improved
- Better user feedback when Ollama has no models installed with helpful error message
- Model selection UI now updates `currentModelDisplay` state when model changes

## [2.0.10] - 2025-11-05

### Fixed
- **Critical:** Fixed arrow key navigation not working in StartMenu interactive menu
- StartMenu `useEffect` dependency array causing constant re-renders and premature cleanup
- Immediate exit issue when selecting "Run scan" from interactive menu

### Changed
- Replaced all emoji/Unicode symbols with ASCII equivalents for better terminal compatibility
- Updated theme.ts symbols: `✓→+`, `✗→x`, `▸→>`, `•→*`, `…→...`, arrows to `^v<>`
- Improved stdin cleanup order in StartMenu component

## [2.0.9] - 2025-11-05

### Fixed
- **Critical:** Fixed `TypeError: color.startsWith is not a function` crash in StartMenu
- StartMenu component now uses `colors` (hex strings) instead of `theme` (chalk functions) for Ink's Text color prop

## [2.0.8] - 2025-11-04

### Added
- Interactive menu for `churn start` command with options: Run scan, Choose model, Exit
- New `StartMenu` component with keyboard navigation
- `.bunfig.toml` configuration to prevent package-lock.json migration issues

### Changed
- **Breaking:** `churn start` now shows interactive menu instead of running directly
- `churn run` remains for direct execution (power users)
- Unified logo rendering at App level to prevent double-render during phase transitions
- Model selection no longer auto-exits, stays on model phase until user manually exits
- Improved help output clarity

### Fixed
- Double ASCII logo render issue during phase transitions
- TUI exiting prematurely after 1-1.5 seconds
- Duplicate "model" and "switch-model" commands in help (merged into single `churn model` command)
- Bun install reading package-lock.json and installing 5933 files unnecessarily
- React Hooks order consistency across all render paths

### Removed
- `switch-model` command (functionality merged into `churn model`)
- Premature phase transitions to "complete" that caused early exits

## [2.0.7] - 2025-11-03

### Fixed
- Version mismatch between package.json and CLI display
- Massive dependency bloat from extraneous packages (reduced from 535 to 139 packages)
- Installation performance (88% reduction in file count: 54,925 → 6,720 files)

### Changed
- Cleaned up node_modules to remove hundreds of extraneous packages
- Optimized package installation speed

## [2.0.6] - 2025-11-03

### Added
- Root-level `CLAUDE.md` for AI assistant guidance with project rules and conventions
- `CHANGELOG.md` to track version history and changes

### Changed
- Optimized startup flow to eliminate redundant initialization phase

### Fixed
- Duplicate logo rendering on `churn start` command
- React Hooks violation causing "Rendered more hooks than during the previous render" error
- Component phase transitions now maintain consistent hook call order

### Removed
- `@lobehub/icons@2.43.1` - Unused dependency causing peer dependency warnings (React 19 conflict)
- `react-devtools-core@7.0.1` - Unused dependency causing peer dependency warnings (React 19 conflict)
- Redundant "init" phase that caused duplicate UI renders

## [2.0.5] - 2025-01-31

### Changed
- Repository cleanup and optimization
- Updated color theme to vibrant red (#ff5656)
- Enhanced initialization flow
- Global install support improvements

### Fixed
- Performance improvements and cost optimizations
- Bug fixes and stability enhancements

## [2.0.4] - 2025-01-29

### Added
- Parallel processing support with `--concurrency` flag (1-50 files)
- Smart file caching with content-based SHA-256 hashing (30-day retention)
- Enhanced file exclusion patterns (minified files, test files, type definitions)

### Changed
- Improved analysis speed with concurrent file processing
- Optimized cost efficiency with intelligent caching (70% cost reduction on reruns)

### Fixed
- File scanning performance for large repositories
- Cache invalidation logic

## [2.0.3] - 2025-01-27

### Added
- Staged mode analysis (`--staged` flag) for 80-90% cost savings
- Interactive confirmation screen before starting analysis
- File count display in pre-analysis summary

### Changed
- Updated AI model lists (GPT-5, Gemini 2.5, Claude Sonnet 4.5)
- Improved model selection UI with provider labels

### Fixed
- Auto-start issue - now requires explicit confirmation
- Model configuration persistence

## [2.0.2] - 2025-01-25

### Added
- Ollama local model support for offline, zero-cost analysis
- `churn ask` command for one-off code questions
- API key management improvements

### Changed
- Enhanced streaming response handling
- Improved error messages for missing models

### Fixed
- Ollama connection detection
- API key validation flow

## [2.0.1] - 2025-01-23

### Added
- First-run help display with available commands
- Enhanced progress tracking with file-by-file updates

### Changed
- Improved terminal UI responsiveness
- Better error handling for API failures

### Fixed
- Model selection persistence
- Configuration file creation issues

## [2.0.0] - 2025-01-20

### Added
- Complete rewrite with Ink terminal UI framework
- Multi-model support (Anthropic Claude, OpenAI GPT, Google Gemini)
- Interactive review panel with keyboard navigation
- Export functionality (JSON, Markdown, Git patches)
- Local-first architecture with no cloud backend
- Zero-setup design - works in any Git repository
- Real-time streaming analysis with progress tracking
- Global configuration in `~/.churn/config.json`
- Project-level reports in `.churn/`

### Changed
- Migrated from Python to TypeScript/Bun
- Removed GitHub authentication requirement
- Simplified data storage (JSON files instead of database)
- New vibrant red color theme (#ff5656)

### Removed
- Cloud backend dependencies
- GitHub OAuth requirement
- Database dependencies
- Python runtime requirement

---

## Version History Summary

- **2.0.x** - TypeScript/Bun rewrite with Ink UI, multi-model support, local-first architecture
- **1.x** - Python-based version (deprecated)

---

## Links

- [Repository](https://github.com/cloudboyjh1/churn2.0)
- [npm Package](https://www.npmjs.com/package/churn-cli)
- [Issue Tracker](https://github.com/cloudboyjh1/churn2.0/issues)
- [Documentation](./README.md)

---

[Unreleased]: https://github.com/cloudboyjh1/churn2.0/compare/v2.0.6...HEAD
[2.0.6]: https://github.com/cloudboyjh1/churn2.0/compare/v2.0.5...v2.0.6
[2.0.5]: https://github.com/cloudboyjh1/churn2.0/compare/v2.0.4...v2.0.5
[2.0.4]: https://github.com/cloudboyjh1/churn2.0/compare/v2.0.3...v2.0.4
[2.0.3]: https://github.com/cloudboyjh1/churn2.0/compare/v2.0.2...v2.0.3
[2.0.2]: https://github.com/cloudboyjh1/churn2.0/compare/v2.0.1...v2.0.2
[2.0.1]: https://github.com/cloudboyjh1/churn2.0/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/cloudboyjh1/churn2.0/releases/tag/v2.0.0
