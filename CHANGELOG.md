# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.2.1] - 2025-12-09

### Added
- **New Review Flow:** Replaced tedious checkbox review with scannable summary + one-decision handoff
  - **AnalysisSummary screen:** Post-analysis view with severity breakdown (HIGH/MEDIUM/LOW), progress bars, category stats
  - **ReviewBrowser:** Tree-based finding browser with exclude mode (everything included by default)
  - **FindingDetail modal:** Extracted detail view for individual findings
  - **AgentOnboarding:** First-run agent configuration as part of init sequence
- **Quick Handoff Actions:** [H] Pass HIGH only, [M] Pass HIGH+MED, [A] Pass ALL, [R] Review first, [E] Export only
- **Theme Enhancements:** Tree chars, checkbox symbols, severity colors (HIGH=#f38ba8, MEDIUM=#f9e2af, LOW=#a6adc8)
- **Security Category:** Added `security` to FileSuggestion.category union type

### Changed
- **ExportPanel:** Refactored with `mode` prop (`'handoff'` | `'export-only'`), Y/N/R confirmation flow
- **StartMenu:** Added `configuredAgent` prop to show agent status indicator
- **App Flow:** New phases (`onboarding`, `summary`) wired into main routing
- **First-Run Experience:** Model Selection → Agent Onboarding → Start Menu

### Technical
- ReviewPanel.tsx kept for backwards compatibility with `churn review` command
- "Skip" during onboarding marks it complete (won't nag again)
- Export-only returns to AnalysisSummary (not exit)

## [2.2.0] - 2025-11-28

### Added
- **Dynamic Model Updates:** Models can now be updated without releasing new CLI versions
  - Remote model manifest fetched from GitHub with 24-hour caching
  - User override support via `~/.churn/models.json`
  - Graceful fallback chain: user override → cached → remote → hardcoded
  - 5-second timeout on remote fetch to avoid blocking startup

### Changed
- **Updated Model Lists:** Refreshed to latest available models (Nov 2025)
  - Anthropic: claude-sonnet-4-5, claude-opus-4-5, claude-haiku-4-5, claude-sonnet-4
  - OpenAI: gpt-5.1, gpt-5 series
  - Google: gemini-3-pro, gemini series
  - Ollama: deepseek-r1, qwen2.5-coder, llama3.3, llama3.2, codellama, mistral, phi-3

## [2.1.9] - 2025-11-25

### Added
- **Droid Agent Support:** Added Factory AI's Droid CLI as a handoff target
  - New `DroidAdapter` in handoff engine
  - Droid option in HandoffSettings UI
  - Order: claude, droid, gemini, codex, cursor

### Changed
- **ReviewPanel Detail View:** Improved card layout with nested bordered code blocks
  - Before/After code sections have their own color-coded borders
  - Status moved inline with category/severity
  - Fixed content overflow issues
- **RunConsole File Display:** Files now grouped by folder in stacked display
  - Shows up to 3 folder groups at once
  - Up to 5 files per folder with "+N more" indicator
  - No cycling animation - updates naturally as analysis progresses
- **Global Footer:** Hidden during review phase (ReviewPanel has its own navigation)

### Fixed
- Duplicate footer display during review phase
- Redundant keyboard handler for 'z' exit in ReviewPanel

## [2.1.8] - 2025-11-24

### Added
- **Fullscreen TUI Mode:** Complete UI overhaul using `fullscreen-ink` for immersive terminal experience
  - All components now render in fullscreen with proper centering and responsive layouts
  - Uses `FullScreenBox` and `useScreenSize` for adaptive viewport management
- **VirtualizedList Component:** New reusable windowed list renderer for large datasets
  - Keyboard navigation (up/down arrows, page up/down)
  - Configurable viewport size based on terminal height
  - Smooth scrolling with position indicators
- **Collapsible Summary in ReviewPanel:** Press 'S' to toggle summary panel visibility
  - Shows severity breakdown (Critical, High, Medium, Low)
  - Shows category breakdown (Security, Performance, etc.)
  - Saves vertical space when collapsed
- **Timestamped Reports System:** Reports now saved with timestamps for history tracking
  - Format: `report-{timestamp}.json` (e.g., `report-2025-11-24T10-30-00.json`)
  - `latest.json` symlink always points to most recent report
  - Auto-cleanup: 30-day retention, max 20 reports
  - `loadAllReports()` function for accessing report history

### Changed
- **RunConsole Redesign:** Centered layout with bordered panels
  - Rounded borders with theme-consistent colors
  - Dot-leader stat formatting ("Files Analyzed ... 42")
  - Section dividers using box-drawing characters
  - Clean progress bar with percentage display
- **Theme Consistency:** Removed all blue colors from UI
  - Reverted from `@inkjs/ui` Select to `ink-select-input` for custom theming
  - All focus/highlight colors now use theme primary (#ff5656)
- **Responsive Layouts:** All TUI components now adapt to terminal size
  - ReviewPanel detail view with text wrapping and truncation
  - StartMenu and ModelSelect with dynamic widths

### Technical
- New dependency: `fullscreen-ink` for fullscreen terminal rendering
- `withFullScreen()` wrapper in index.tsx for app initialization
- `VirtualizedList.tsx` - Reusable component for large lists
- Report retention managed by `cleanupOldReports()` in reports.ts

## [2.1.7] - 2025-01-23

### Added
- **API Key Age Tracking:** Model selection now shows when API keys were last updated
  - Displays human-readable age: "just now", "5 minutes ago", "3 days ago", "2 months ago"
  - Timestamps automatically saved when API keys are set or replaced
  - Helps users track key freshness and know when keys may need rotation
  - Shows as "Last updated: {age}" below saved API key information
  - Legacy keys without timestamps show "unknown" until updated

### Changed
- `ChurnConfig` interface extended with `apiKeyTimestamps` field to track update times
- `setApiKey()` now automatically records timestamp when keys are saved
- ModelSelect UI enhanced to display key age information

### Technical
- Added `getApiKeyTimestamp()` helper function in config.ts
- Added `formatKeyAge()` utility for human-readable time formatting
- Timestamps stored in ISO 8601 format for consistency
- Graceful handling of legacy configurations without timestamps

## [2.1.6] - 2025-01-23

### Added
- **Agent Handoff System:** Seamless integration with AI coding agents
  - Interactive handoff prompt after export: "Launch agent now? (Y/N/C)"
  - Support for Claude Code, Cursor, Gemini CLI, and Codex
  - Configurable context formats: minimal (MD+JSON) or comprehensive (MD+JSON+patch+metadata)
  - New `HandoffSettings` component for configuring handoff preferences
  - Agent availability checking before launch
  - Automatic handoff package creation with timestamp-based files
- **Enhanced `churn pass` command:**
  - `--to <agent>` flag to specify target agent (claude, cursor, gemini, codex)
  - `--format <format>` flag for minimal or comprehensive context
  - `--launch` flag to immediately start the agent with handoff package
  - Validates agent availability in system PATH
  - Displays package contents before handoff
- **Configuration:**
  - New `handoff` section in `~/.churn/config.json`
  - Configurable target agent, context format, and auto-launch behavior
  - Custom agent CLI commands support
  - Interactive settings UI accessible via 'C' key during handoff prompt

### Changed
- ExportPanel now supports handoff callbacks (`onHandoff`, `onConfigureHandoff`)
- Added new phase `handoff-settings` to App state machine
- Removed emojis from handoff-related output (aligns with CLI conventions)

### Technical
- New file: `src/engine/handoff.ts` - Core handoff engine with agent adapters
- New file: `src/components/HandoffSettings.tsx` - Interactive settings UI
- Extended `ChurnConfig` interface with `HandoffConfig` type
- Agent adapters for building CLI commands per agent
- Context packaging functions in `reports.ts`
- Type-safe agent selection with `AgentType` union type

## [2.1.5] - 2025-01-17

### Fixed
- **Critical:** Fixed broken retry mechanism that prevented proper error recovery
  - Separated API errors from JSON parsing errors for correct retry logic
  - API errors (network, timeout, rate limit) now properly trigger retry mechanism
  - JSON parsing errors fail immediately without retry (don't retry malformed AI responses)
  - Parsing errors no longer cached permanently (prevents failed files being cached for 30 days)
  - Eliminated double-retry bug: Set SDK maxRetries to 0, let app-level retry logic handle everything
- **Critical:** Fixed ReviewPanel input handler instability
  - Applied useCallback pattern from v2.1.4 memory leak fixes (was missed in ReviewPanel)
  - Fixes input not registering properly due to handler recreation on every render
- **UI:** Fixed small viewport requiring excessive scrolling
  - Viewport now adaptive based on terminal size (shows 10-25 items vs hardcoded 10)
  - Formula: `Math.max(10, terminalHeight - 15)` leaves room for header/footer
  - Dramatically reduces scrolling in review phase

### Performance
- **Major:** Reduced analysis time by 60-70% for large repositories
  - 117 files: ~8 minutes → **2-3 minutes**
  - Reduced request timeout: 120s → 45s for faster failure detection
  - Increased concurrency: Anthropic 8→15, OpenAI 10→15, Google 10→15
  - Files that would hang for 2 minutes now timeout in 45 seconds
- **Improved:** Multi-strategy JSON extraction reduces parsing failures
  - Strategy 1: Parse pure JSON response
  - Strategy 2: Remove markdown code blocks and parse
  - Strategy 3: Regex extract JSON object from text
  - Handles AI response variations (text before/after JSON, incomplete markdown removal)
- **Improved:** UI component files now prioritized in analysis queue
  - Files matching `dialog|modal|button|input|select|form|component` get +10 priority boost
  - Important UI primitives analyzed earlier instead of being deprioritized

### Added
- **Analysis Summary:** Detailed logging at end of analysis
  - Shows: Total files, successfully analyzed, files with issues, files with no issues
  - Breaks down failures: Parsing errors vs API/Network errors
  - Shows cache hit rate
  - Example output:
    ```
    --- Analysis Summary ---
    Total files: 117
    Successfully analyzed: 115
    Files with suggestions: 42
    Files with no issues: 73
    Failed files: 2
      - Parsing errors: 1
      - API/Network errors: 1
    Cache hits: 38/117
    ```

### Improved
- **Error Logging:** Clear distinction between error types
  - "API error for {file}: {message}" - Network/timeout/rate limit errors (will retry)
  - "JSON parsing error for {file}: {message}" - Malformed AI response (won't retry)
  - Shows response preview on parsing errors for debugging
  - Tracks error types for summary statistics

### Technical
- Parsing errors now throw specific error with `isParsingError` flag
- analyzeFileWithRetry detects parsing errors and skips retry + caching
- All error handling paths properly distinguish between transient vs permanent failures
- ReviewPanel now matches v2.1.4 React optimization patterns

## [2.1.4] - 2025-01-14

### Fixed
- **Critical:** Fixed intermittent API timeout errors across all providers
  - Added explicit timeout configuration: 120s for API requests, 30s for connections
  - Implemented AbortController pattern for proper request cancellation
  - Enhanced timeout error detection (AbortError, ETIMEDOUT, ESOCKETTIMEDOUT)
  - Clear error messages: "Request timeout after Xs. The API is taking too long to respond."
- **Critical:** Fixed React component memory leaks and race conditions
  - ModelSelect.tsx: Added useEffect cleanup with isMounted flag and AbortController
  - ModelSelect.tsx: Fixed setTimeout memory leak by returning cleanup function
  - ModelSelect.tsx: Fixed race conditions in async config operations
  - All components: Wrapped async operations in try-catch with proper error handling
- **Performance:** Optimized React component re-renders
  - Memoized arrays, objects, and callbacks with useMemo/useCallback
  - Fixed unnecessary re-renders in ModelSelect, StartMenu, and ConfirmRun
  - StartMenu: Used stable keys (option.label) instead of array indices
  - ConfirmRun: Extracted InfoRow component with React.memo to prevent recreations

### Improved
- **Retry Logic:** Enhanced retry strategy for network failures
  - Increased maxRetries from 2 to 4 for network/timeout errors
  - Rate limits: Exponential backoff 2s → 4s → 8s → 10s (capped)
  - Timeouts/Network: Exponential backoff 1s → 2s → 4s → 5s (capped)
  - Added comprehensive error detection helpers (isTimeoutError, isNetworkError, isRateLimitError)
  - Don't retry authentication errors (requires user intervention)
  - Better error logging when all retries exhausted
- **Error Detection:** Enhanced network error pattern matching
  - Now detects: ECONNREFUSED, ECONNRESET, ENOTFOUND, ETIMEDOUT, ESOCKETTIMEDOUT
  - Added timeout-specific error handling separate from generic network errors
  - Improved error messages with actionable context

### Added
- **API Configuration:** SDK-level timeout and retry configuration
  - Anthropic: 120s request timeout, 30s connection timeout, 3 SDK retries
  - OpenAI: 120s request timeout, 3 SDK retries
  - Ollama: 30s timeout for local requests
  - PromptOptions interface for advanced request control (abortSignal, custom timeout)

### Technical
- All React hooks now follow consistent order (no conditional hook calls)
- Replaced hardcoded colors with theme constants throughout
- Added boundary checks for array access
- Enhanced type safety with explicit interfaces

## [2.1.3] - 2025-01-12

### Changed
- **Rebranding:** Repositioned Churn from "AI-assisted tool" to "context intelligence layer for AI agents"
  - Updated main tagline: "Your agents favorite context layer"
  - Refined messaging to emphasize infrastructure and substrate role rather than assistant framing
  - Updated package.json description and keywords to reflect positioning as agent infrastructure
  - Modified system prompts to frame analysis as generating structured findings for downstream tools
  - UI updates: "Review Suggestions" → "Review Findings", "No suggestions" → "No findings"
  - Documentation updates across README.md, CLAUDE.md, and docs/development/CLAUDE.md
  - This is a narrative refinement only - no functional changes to features or capabilities

## [2.1.2-beta] - 2025-01-11

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
