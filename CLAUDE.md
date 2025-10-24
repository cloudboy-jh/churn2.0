# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Churn 2.0 is a local-first CLI application for AI-assisted code maintenance and refactoring. It analyzes codebases using multiple AI providers (Anthropic Claude, OpenAI GPT, Google Gemini, or local Ollama) and provides interactive review of suggestions.

**Published as**: `churn-cli` on npm (https://www.npmjs.com/package/churn-cli)
**Current Version**: 2.0.3
**Repository**: https://github.com/cloudboyjh1/churn2.0

## Build & Development Commands

### Setup
```bash
bun install              # Install dependencies
```

### Development
```bash
bun run dev              # Run in development mode (executes src/index.tsx directly)
bun run type-check       # Run TypeScript type checking
```

### Building
```bash
bun run build            # Transpile to dist/ directory
bun run compile          # Create single executable binary (churn or churn.exe)
```

### Testing the CLI
```bash
# After compilation, test in any git repository
cd /path/to/test-repo
/path/to/churn2.0/churn run
```

## Architecture Overview

### Local-First Design
- **No cloud backend**: All data stored locally in `~/.churn/` (global) and `.churn/` (project-level)
- **No database**: Configuration and reports stored as JSON files
- **No GitHub auth**: Removed complexity, only AI provider API keys needed
- **API keys**: Stored in `~/.churn/config.json`, never transmitted except to respective AI providers

### Layer Structure

**Engine Layer** (`src/engine/`) - Business logic, no UI dependencies:
- `config.ts` - Local storage management for global/project configuration
- `git.ts` - Repository detection, file scanning, Git operations
- `models.ts` - Unified interface for all AI providers with streaming support
- `analysis.ts` - File scanning, parallel analysis, suggestion categorization
- `reports.ts` - JSON report schema, export to multiple formats

**UI Layer** (`src/components/`) - Ink components for terminal rendering:
- `Logo.tsx` - ASCII art with coral gradient
- `ModelSelect.tsx` - Provider and model selection with API key input
- `ConfirmRun.tsx` - Confirmation screen before starting analysis (prevents auto-start)
- `RunConsole.tsx` - Real-time analysis with progress tracking
- `ReviewPanel.tsx` - Interactive suggestion review with keyboard navigation
- `ExportPanel.tsx` - Export confirmation and file generation
- `AskConsole.tsx` - One-off question interface
- `CommandsList.tsx` - First-run help display

**Entry Point**:
- `src/index.tsx` - CLI argument parsing (Commander.js), phase routing, app orchestration

### Data Flow

1. User runs command → CLI parser (`index.tsx`)
2. App component routes to appropriate phase based on command
3. Repository detection (`git.ts`)
4. **First-run check** - If no model configured, show `ModelSelect.tsx`
5. Model/API key loading or setup (`config.ts`)
6. **Confirmation screen** (`ConfirmRun.tsx`) - user must press Enter to start or Esc to cancel
7. Analysis execution (`analysis.ts` + `models.ts`) with real-time streaming
8. Report generation (`reports.ts`) → `.churn/reports/churn-reports.json`
9. Interactive review (`ReviewPanel.tsx`) - user accepts/rejects suggestions
10. Export (`ExportPanel.tsx`) → `.churn/patches/` (patches, JSON, Markdown)

## Key Technical Details

### TypeScript Configuration
- Module system: ESNext with bundler resolution
- JSX: React (for Ink components)
- Strict mode enabled
- Path alias: `@/*` maps to `./src/*`
- Target: ES2022

### File Scanning Strategy
- Uses `fast-glob` for pattern matching
- Default exclusions: `node_modules`, `.git`, `dist`, `build`, `.churn`, lock files, minified files
- Three modes:
  - `full`: Scan entire repository
  - `staged`: Only analyze files in Git staging area
  - `files`: Specific files/patterns provided via CLI

### AI Model Integration
- Streaming responses supported for real-time UI updates
- Provider abstraction in `models.ts` allows easy addition of new providers
- Each provider has its own streaming implementation
- Error handling: Failed file analysis logs error but continues with remaining files

### Analysis Prompting
- Each file analyzed independently with structured JSON response format
- Categories: `refactor`, `bug`, `optimization`, `style`, `documentation`
- Severity: `low`, `medium`, `high`
- Includes code snippets with before/after and line numbers when applicable
- File size limit: 100KB (larger files skipped)

### Report Schema
See `schema.json` for full structure. Key fields:
- `repository`: Git metadata (name, branch, remote)
- `analysis.summary`: Statistics and categorization
- `analysis.suggestions[]`: Array of file-specific suggestions
- `analysis.metadata`: Timestamp, model info, analysis mode

## Visual Design System

All UI elements use the coral theme centered on `#ff6f54`:

**Colors** (defined in `src/theme.ts`):
- Primary: `#ff6f54` (coral) - Progress bars, highlights, logo
- Secondary: `#ff9b85` (light coral) - Gradients
- Text: `#f2e9e4` (warm white)
- Gray: `#a6adc8` (muted purple-gray)
- Success: `#a6e3a1`, Info: `#8ab4f8`, Warning: `#f9e2af`, Error: `#f38ba8`

**Utilities in `theme.ts`**:
- Pre-configured chalk instances for each color
- `createBox()` - Formatted boxes with borders
- `createProgressBar()` - Visual progress indicators
- `formatSize()`, `formatDuration()` - Human-readable formatting

## Adding New Features

### Adding a New AI Provider

1. Add provider to `ModelProvider` type in `models.ts`
2. Add model list to `AVAILABLE_MODELS` constant
3. Implement `send[Provider]Prompt()` function with streaming support
4. Add case to `createModelClient()` switch
5. Add case to `sendPrompt()` switch
6. Update `ModelSelect.tsx` to include new provider in options

### Adding a New Command

1. Add command definition in `src/index.tsx` using `program.command()`
2. Add corresponding phase to `AppPhase` type
3. Create UI component if needed in `src/components/`
4. Add phase routing logic in `App` component
5. Update README.md and EXAMPLES.md with new command documentation

### Adding a New Export Format

1. Add format generation function in `reports.ts`
2. Call from `exportSuggestions()` function
3. Update `ExportPanel.tsx` to display new format
4. Add to documentation

## Important Constraints

### File Reading
- 100KB limit per file to avoid overwhelming AI context windows
- Binary files and very large files are skipped
- Always handle file read failures gracefully

### Error Handling
- Individual file analysis failures should not crash entire analysis
- Log errors but continue processing remaining files
- API failures should display user-friendly error messages
- Ollama model not found: Shows helpful message with `ollama pull` command

### Performance Considerations
- Files analyzed sequentially (not parallel) to respect API rate limits
- Progress callbacks update UI in real-time
- Use streaming for long responses to show immediate feedback

## Configuration Files

### Global Config (`~/.churn/config.json`)
```typescript
{
  version: string;
  apiKeys?: {
    anthropic?: string;
    openai?: string;
    google?: string;
  };
  defaultModel?: {
    provider: 'anthropic' | 'openai' | 'google' | 'ollama';
    model: string;
  };
  preferences?: {
    autoApply?: boolean;
    verbose?: boolean;
  };
}
```

### Project Config (`.churn/config.json`)
```typescript
{
  lastRun: string;
  lastModel: string;
  ignorePatterns: string[];
}
```

## Dependencies

**Core Runtime**: Bun 1.x (not Node.js)
**UI Framework**: Ink 5.x (React for terminal)
**Git Operations**: simple-git
**File Scanning**: fast-glob, fs-extra
**AI SDKs**: @anthropic-ai/sdk, openai, @google/generative-ai, ollama
**CLI**: commander

## Development Workflow

1. Make changes in `src/`
2. Run `bun run type-check` to verify types
3. Test with `bun run dev` in a test repository
4. Compile with `bun run compile` for production testing
5. Verify the binary works in isolation
6. Update documentation if adding features

## Testing Strategy

Since this is a CLI tool, manual testing is primary:
- Test each command in a real git repository
- Verify all AI providers work correctly
- Test edge cases: large repos, binary files, malformed responses
- Verify exports generate correct formats
- Test keyboard navigation in ReviewPanel

## Common Gotchas

- **Bun vs Node**: This project requires Bun, not Node.js
- **ESM only**: All imports must use `.js` extension even for `.ts` files
- **Ink rendering**: Components must return valid Ink elements, not HTML
- **Streaming**: onStream callback must handle both content chunks and done signal
- **Path handling**: Always use `path.relative()` for display, `path.absolute()` for operations
- **Git detection**: Always verify `isGitRepo()` before attempting Git operations
