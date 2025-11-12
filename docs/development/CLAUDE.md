# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Churn 2.0 is a local-first context intelligence layer for AI code agents and workflows. It structures and analyzes codebases using multiple AI providers (Anthropic Claude, OpenAI GPT, Google Gemini, or local Ollama) and generates structured findings for downstream tools and agents.

**Published as**: `churn-cli` on npm (https://www.npmjs.com/package/churn-cli)
**Current Version**: 2.1.3
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
- `config.ts` - Local storage management for global/project configuration, concurrency settings
- `git.ts` - Repository detection, file scanning, Git operations
- `models.ts` - Unified interface for all AI providers with streaming support
- `analysis.ts` - File scanning, **parallel analysis with caching**, suggestion categorization, retry logic
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

### File Scanning & Analysis Strategy
- Uses `fast-glob` for pattern matching
- **Expanded exclusions** (v2.0.4): `node_modules`, `.git`, `dist`, `build`, `.churn`, lock files, minified files, test files, type definitions (`.d.ts`), vendor code, generated code
- Three modes:
  - `full`: Scan entire repository
  - `staged`: Only analyze files in Git staging area (80-90% cost savings)
  - `files`: Specific files/patterns provided via CLI
- **Parallel processing**: Files analyzed concurrently (5-20 files at once based on provider)
- **Smart caching**: Content-based SHA-256 hashing, 30-day cache, ~70% savings on reruns
- **File prioritization**: Analyzed in smart order based on model language familiarity, file size, and importance

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

All UI elements use the vibrant red theme centered on `#ff5656`:

**Colors** (defined in `src/theme.ts`):
- Primary: `#ff5656` (vibrant red) - Progress bars, highlights, logo
- Secondary: `#ff8585` (light red) - Gradients
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

---

## Documentation Coverage for Fumadocs

The following sections were removed from README.md and should be documented in Fumadocs when it's set up:

### 📘 Architecture Deep-Dive
**Location in Codebase**: See "Architecture Overview" section above

**Should Cover**:
- Complete tech stack details (Bun, TypeScript, Ink, AI SDKs)
- Full module breakdown:
  - Engine layer (`config.ts`, `git.ts`, `models.ts`, `analysis.ts`, `reports.ts`)
  - UI components (all components with purpose and props)
  - Theme system (`theme.ts`) with complete color palette
- Architecture principles (Zero-setup, Local-first, Deterministic, etc.)
- Data flow diagrams
- File system structure (`.churn/`, `~/.churn/`)

### 📘 Report Schema Reference
**Location in Codebase**: `src/engine/reports.ts`, `src/engine/analysis.ts`

**Should Cover**:
- Complete TypeScript interface for `ChurnReport`
- `AnalysisResult` structure with all fields
- `FileSuggestion` schema with examples
- Directory structure:
  ```
  .churn/
  ├── config.json
  ├── reports/churn-reports.json
  └── patches/
  ```
- JSON schema with validation rules
- Example reports with annotations

### 📘 Development Setup Guide
**Location in Codebase**: See "Build & Development Commands" section above

**Should Cover**:
- Prerequisites (Bun installation)
- Clone and setup steps
- Development commands (`bun run dev`, `bun run type-check`)
- Build process (`bun run build`, `bun run compile`)
- Testing strategies (manual testing in git repos)
- Debugging tips
- Contributing workflow

### 📘 Ollama Advanced Configuration
**Current Location**: Previously in README.md (removed for brevity)

**Should Cover**:
- Detailed model comparison table (VRAM, RAM, Speed, Quality)
- Hardware requirements:
  - Laptop (8-16 GB RAM) recommendations
  - Desktop (16-32 GB RAM) recommendations
  - Workstation (32+ GB RAM) recommendations
- Performance expectations by project size
- Optimization tips:
  - Staged mode for daily work
  - Concurrency tuning for local models
  - Model selection strategies
- Advanced Ollama commands (`ollama update`, `ollama list`, `ollama rm`)
- Troubleshooting common issues
- Links to Ollama documentation and model library

### 📘 Performance Optimization Guide
**Location in Codebase**: `src/engine/analysis.ts` (parallel processing, caching logic)

**Should Cover**:
- **Speed optimization techniques**:
  - Parallel processing configuration (`--concurrency` flag)
  - Smart caching (content-based SHA-256, 30-day retention)
  - File prioritization strategies
- **Cost optimization strategies**:
  - Staged mode (80-90% savings)
  - Model selection (Haiku vs Sonnet vs Opus)
  - Caching benefits (70% cost reduction)
  - File filtering impact
- **Detailed cost tables** (removed from README):
  - Cost per mode (staged vs full)
  - Cost by model tier
  - Time estimates by project size
- **Best practices**:
  - Daily workflow (staged + cheaper models)
  - Release workflow (full scans + premium models)
  - Team workflows

### 📘 Cost Analysis Tables
**Reference Data**: Previously in README.md

**Should Cover**:
- Cost comparison table:
  ```
  | Mode | Model | Cost | Time | When to Use |
  | --staged (5 files) | Haiku | $0.05 | 5s | Daily commits |
  | Full (50 files) | Sonnet | $1.25 | 1-2min | Release scans |
  ```
- Provider pricing comparison
- Cost estimation calculator
- Usage tracking recommendations
- Budget planning for teams

### 📘 Roadmap & Future Plans
**Reference**: Previously in README.md

**Should Cover**:
- **Planned features**:
  - Language specialties (Python, Rust, Go, Java)
  - Framework detection (React, Next.js, FastAPI, Django, Rails)
  - Repository profiles (monorepos, microservices)
  - Custom analysis packs (security, performance, style)
  - Team workflows and shared configurations
  - CI/CD integration (GitHub Actions, GitLab CI)
- **Future exploration**:
  - Multi-repo analysis
  - Historical trend tracking
  - Custom model fine-tuning
  - Integration with code quality tools
  - Advanced reporting/visualization
- Contribution opportunities
- Timeline estimates (where applicable)

### 📘 Detailed Examples
**Reference**: `docs/guides/EXAMPLES.md` (if exists)

**Should Cover**:
- **Command examples**:
  - Analyzing specific files: `churn run --files src/**/*.tsx`
  - Staged analysis workflow: `git add . && churn run --staged`
  - Model switching for one-off scans
  - Piping exports: `churn pass --to json | jq`
- **Workflow examples**:
  - Daily development workflow
  - Pre-release workflow
  - Team code review workflow
  - CI/CD integration examples
- **Real-world use cases**:
  - Cleaning up technical debt
  - Onboarding new team members
  - Security audit workflow
  - Performance optimization hunt
- **Advanced patterns**:
  - Custom ignore patterns
  - Multi-stage analysis
  - Report aggregation across projects

### Additional Documentation Recommendations

**API Reference**:
- All public functions in engine layer
- Configuration options reference
- CLI flags and options
- Environment variables

**Troubleshooting Guide**:
- Common errors and solutions
- API key issues
- Ollama connection problems
- Performance issues
- Rate limiting

**Migration Guides**:
- Upgrading from v1.x to v2.x
- Changing AI providers
- Moving configurations

**Integration Guides**:
- GitHub Actions workflow
- GitLab CI pipeline
- Pre-commit hooks
- IDE integration (VS Code, etc.)
