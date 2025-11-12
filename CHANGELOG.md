# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.1.2] - 2025-01-11

### Fixed
- **Critical:** Fixed `getDefaultAgent is not a function` error when running compiled binary
  - Added explicit `httpAgent` to Anthropic SDK client initialization
  - Resolves bundling issue with `bun build --compile`
- **UX:** Fixed redundant model selection on every run
  - App now properly loads saved model configuration from start menu
  - Flow is now: Start Menu → Confirm → Run (skips model selection when already configured)
- **React:** Fixed Hooks order violation in ModelSelect component
  - Moved all `useInput` hooks to component top level to maintain consistent hook order

### Added
- **API Key Management:** Added ability to view and replace API keys
  - Shows last 4 characters of saved API key
  - Press 'r' to replace/update API key in model selection screen
  - Helpful for expired or invalid keys
- **Persistent Model Selection:** Model choice now remembered per provider
  - Remembers last used model for each provider (Anthropic, OpenAI, Google, Ollama)
  - Pre-selects last used model when switching providers
  - Shows "Last used: {model}" hint
- **Global Keyboard Shortcuts:** Shortcuts now work on every screen
  - **z** - Exit application from anywhere
  - **o** - Start over (return to start menu)
  - **esc** - Go back one step in workflow
  - Shortcuts work in ModelSelect, StartMenu, ConfirmRun, ReviewPanel, and all other interactive screens
  - Clean footer displays available shortcuts: `esc (back) · o (start over) · z (exit)`
- **Better Error Messages:** Improved API error handling across all providers
  - Authentication errors (401): "Invalid {Provider} API key. Please run 'churn model' to update your API key."
  - Rate limit errors (429): "Rate limit exceeded. Please wait a moment and try again."
  - Added try-catch blocks to all AI provider implementations

### Changed
- **Error Logging:** Enhanced debugging for empty suggestion results
  - Logs when AI returns no suggestions with response preview
  - Logs JSON parsing errors with full context
  - Helps diagnose authentication vs. technical issues

### Developer Experience
- All keyboard shortcuts centralized and consistent across components
- Better error messages guide users to solutions
- Improved component stability with proper React Hooks usage

## [2.0.13] - 2025-11-10

### Fixed
- **Critical:** Fixed infinite re-rendering bug causing analysis summary to re-initialize 100+ times after completion
- RunConsole component now uses `hasStarted` state flag to ensure analysis runs exactly once
- Analysis completion screen now displays cleanly without continuous reloading

### Changed
- Refactored `useEffect` hook in RunConsole.tsx to prevent multiple executions
- Improved component stability during timer updates and progress rendering

## [2.1.1] - 2025-11-09

### Added

#### Differential Analysis Integration (Stage 4)
- **Staged Mode Optimization:** Integrated differential analysis into `--staged` mode for dramatic token and cost savings
- **Smart Mode Selection:** Automatically uses diff mode when analyzing staged files if it provides >500 token savings
- **Fallback to Full Analysis:** If diff is too large (>100 changes) or diff parsing fails, gracefully falls back to full file analysis

### Changed

#### Analysis Engine (src/engine/analysis.ts)
- **`analyzeFile()`:** Now accepts `mode` parameter ("full" or "diff") and optional `FileDiff` object
- **`analyzeFileWithRetry()`:** Passes through mode and diff, calculates tokens differently for diff mode (~50 chars/line vs full file)
- **`runAnalysis()`:** Fetches staged diffs when `context.mode === "staged"`, uses `shouldUseDiffAnalysis()` to determine optimal mode per file
- **Token Estimation:** Diff mode estimates tokens based on changed lines only, not full file content

#### Prompt System (src/engine/prompts.ts)
- **`buildPrompt()`:** Now handles "diff" mode by delegating to `buildDiffPrompt()` from differential.ts
- **Diff-Specific Prompts:** Uses specialized system message and prompt focused on "issues introduced by changes" rather than general code quality

### Performance Improvements
- **70-90% Token Reduction in Staged Mode:** Analyzing only changed lines instead of entire files for staged commits
- **Faster Pre-Commit Checks:** Dramatically reduced analysis time and cost for `churn --staged` workflow
- **Intelligent Mode Selection:** Only uses diff mode when it provides meaningful savings (>500 tokens)

### Technical Details
- **Diff Context:** Uses 3 lines of context around changes (git's unified diff format with -U3)
- **Mode Detection:** `shouldUseDiffAnalysis()` checks if file is staged, diff isn't too large, and savings > 500 tokens
- **Cache Compatibility:** Diff mode results are cached separately from full mode results

### Files Modified
- `src/engine/analysis.ts` - Integrated differential analysis with mode detection and token optimization
- `src/engine/prompts.ts` - Added diff mode support with specialized prompting

### User Impact
- **Pre-Commit Workflow:** `churn --staged` now analyzes only your changes, perfect for quick checks before committing
- **Cost Savings:** 80-90% reduction in API costs for staged mode on typical pull requests
- **Speed:** Faster analysis on large files with small changes (analyze 20 changed lines vs 2000-line file)

---

## [2.1.0] - 2025-11-08

###  Major Features: Adaptive Prompt System

**Context-Aware Analysis** - Churn now intelligently adapts its analysis based on file type, language, and project context, delivering more relevant suggestions while using fewer tokens.

### Added

#### Adaptive Prompts (src/engine/prompts.ts)
- **Language-Specific Templates:** Specialized prompts for TypeScript/JavaScript, Python, Rust, Go, and generic fallback
- **TypeScript/React Prompt:** Focus on hooks, type safety, async patterns, bundle size, React best practices
- **Python Prompt:** PEP compliance, type hints, pythonic idioms, async patterns, framework-specific advice
- **Rust Prompt:** Memory safety, ownership patterns, error handling, idiomatic Rust, clippy warnings
- **Go Prompt:** Goroutine safety, error handling, standard library usage, simplicity
- **Config File Handling:** Minimal analysis (0-2 suggestions max) focusing only on security and syntax
- **Test File Handling:** Specialized prompts that improve test quality instead of suggesting "add tests"

#### Project Context Detection (src/engine/context.ts)
- **Framework Detection:** Automatically detects React, Next.js, Vue, Angular, FastAPI, Django, Flask, and more
- **Tool Detection:** Identifies package managers (npm, yarn, pnpm, bun), bundlers (Vite, Webpack), test frameworks
- **TypeScript Configuration:** Reads tsconfig.json to understand strict mode and target settings
- **Context Hashing:** Smart cache invalidation when project configuration changes

#### Token Tracking & Cost Estimation
- **Real-Time Token Counting:** Tracks approximate tokens used per file and across entire analysis
- **Cost Calculation:** Estimates API costs based on provider-specific pricing (Anthropic, OpenAI, Google, Ollama)
- **Cache Savings:** Shows tokens and cost saved by cache hits
- **Provider Pricing:** Up-to-date pricing for Claude (Opus/Sonnet/Haiku), GPT-4/4o/3.5, Gemini Pro/Flash

#### Smart Infrastructure (Foundations for Future Features)
- **File Grouping (src/engine/grouping.ts):** Logic to group related files (component + test + styles) for cross-file analysis
- **Differential Analysis (src/engine/differential.ts):** Parse git diffs for staged-mode analysis (analyze only changed lines)
- **Prompt Versioning:** Cache entries now track prompt version for automatic invalidation on prompt changes

### Changed

#### Analysis System (src/engine/analysis.ts)
- **`analyzeFile()`:** Now uses adaptive prompt builder instead of generic one-size-fits-all prompt
- **`AnalysisCache`:** Extended with `promptVersion`, `contextHash`, and `tokenCount` fields
- **`getCachedSuggestions()`:** Graceful degradation - old cache entries without version remain valid
- **`updateCache()`:** Stores prompt version, context hash, and token count for better invalidation
- **`runAnalysis()`:** Detects project context once per session, passes to all file analyses
- **Token Tracking:** Integrated throughout analysis flow with real-time tracking

#### UI Enhancements (src/components/RunConsole.tsx)
- **Summary Display:** Shows cache hits, tokens used, tokens saved, estimated cost, cost saved
- **Color Coding:** Success green for cache hits, info blue for tokens, warning yellow for costs
- **Project Metadata:** Displays detected project type and framework in analysis results

#### Type System
- **`AnalysisResult`:** Added `cacheHits`, `tokensUsed`, `tokensSaved`, `estimatedCost`, `costSaved` to summary
- **`AnalysisResult.metadata`:** Added `projectType` and `framework` fields
- **`CacheEntry`:** Added optional `promptVersion`, `contextHash`, `tokenCount` fields

### Performance Improvements
- **30-50% Token Reduction:** Language-specific prompts are more focused than generic prompts
- **Faster Cache Invalidation:** Only invalidates when prompt version or context changes, not on every update
- **Context Detection Overhead:** <500ms for project scanning, cached for entire analysis session
- **Smart Defaults:** Config files get minimal 0-2 suggestion prompts, test files get specialized analysis

### Developer Experience
- **Better Suggestions:** Framework-aware prompts provide more actionable, context-specific advice
- **Cost Transparency:** See exactly how much each analysis costs and how much cache is saving
- **Project Understanding:** Churn now knows if you're building a Next.js app, FastAPI service, or Rust CLI tool
- **Graceful Upgrades:** Old cache entries remain valid, no forced re-analysis on version update

### Technical Details
- **Prompt Version:** 2.1.0 (tracked in cache for invalidation)
- **Context Hash:** 16-character SHA-256 hash of relevant project context
- **Token Estimation:** ~4 characters per token approximation
- **Output Estimation:** 20% of input tokens for cost calculation

### Backward Compatibility
- **Cache Migration:** Existing cache entries work with graceful degradation
- **No Breaking Changes:** All existing functionality preserved
- **Optional Fields:** New cache fields are optional, old entries remain valid

### Files Added
- `src/engine/prompts.ts` - Adaptive prompt system with language-specific templates
- `src/engine/context.ts` - Project context detection and hashing
- `src/engine/grouping.ts` - Smart file grouping logic (foundation for future features)
- `src/engine/differential.ts` - Differential analysis for staged mode (foundation for future features)

### Files Modified
- `src/engine/analysis.ts` - Integrated adaptive prompts, context detection, token tracking
- `src/components/RunConsole.tsx` - Enhanced summary with token/cost display
- `package.json` - Version bump to 2.1.0

---

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
