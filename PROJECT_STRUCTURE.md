# Churn 2.0 - Project Structure

## Directory Tree

```
churn2.0/
├── src/
│   ├── components/
│   │   ├── Logo.tsx                  # ASCII logo with coral gradient
│   │   ├── AuthPanel.tsx            # GitHub Device Flow authentication
│   │   ├── ModelSelect.tsx          # AI model provider selection
│   │   ├── RunConsole.tsx           # Live analysis with progress tracking
│   │   ├── ReviewPanel.tsx          # Interactive suggestion review
│   │   └── ExportPanel.tsx          # Export results confirmation
│   ├── engine/
│   │   ├── config.ts                # Local storage and configuration
│   │   ├── git.ts                   # Repository detection and Git ops
│   │   ├── models.ts                # Direct API calls to AI providers
│   │   ├── analysis.ts              # Codebase analysis orchestration
│   │   └── reports.ts               # Report generation and export
│   ├── theme.ts                     # Color palette and UI utilities
│   └── index.tsx                    # Main CLI entry point
├── .churn/
│   ├── reports/
│   │   ├── churn-reports.json       # Latest analysis results
│   │   └── .gitkeep
│   └── patches/
│       ├── suggestions-*.json       # Exported suggestions
│       ├── report-*.md              # Markdown reports
│       ├── changes-*.patch          # Git patch files
│       └── .gitkeep
├── package.json                     # Dependencies and scripts
├── tsconfig.json                    # TypeScript configuration
├── .gitignore                       # Git ignore patterns
├── .env.example                     # Environment template (not used in local-first mode)
├── README.md                        # Main documentation
├── EXAMPLES.md                      # Usage examples and workflows
├── LICENSE                          # MIT License
└── PROJECT_STRUCTURE.md            # This file
```

## File Descriptions

### Core Application

**src/index.tsx**
- CLI entry point using Commander.js
- Defines all commands: run, login, model, review, export, pass
- Orchestrates UI component flow
- Handles command-line argument parsing

**src/theme.ts**
- Central color palette centered on #ff6f54 (coral)
- Chalk instances for consistent styling
- Utility functions: createBox, createProgressBar, formatSize, formatDuration
- Gradient definitions for logo and progress elements

### Engine Layer

**src/engine/config.ts**
- Manages ~/.churn/config.json (global settings)
- Manages .churn/config.json (project settings)
- Functions for API keys, GitHub tokens, default models
- Ensures directory structure exists

**src/engine/git.ts**
- Repository detection and validation
- Branch, commit, and status information
- File counting and project type detection
- Diff generation and patch creation
- Integration with simple-git

**src/engine/models.ts**
- Unified interface for all AI providers
- Anthropic (Claude)
- OpenAI (GPT)
- Google (Gemini)
- Ollama (local models)
- Streaming support for real-time output
- Model availability checking

**src/engine/analysis.ts**
- File scanning with fast-glob
- Parallel file analysis
- Progress tracking with callbacks
- Suggestion categorization (refactor, bug, optimization, style, docs)
- Severity classification (low, medium, high)

**src/engine/reports.ts**
- churn-reports.json schema and generation
- Multiple export formats (JSON, Markdown, Patch)
- Report loading and statistics
- Summary formatting utilities

### UI Components

**src/components/Logo.tsx**
- Displays ASCII art from newinlinelogo.md
- Applies coral gradient using gradient-string
- Optional subtitle and message props

**src/components/AuthPanel.tsx**
- GitHub Device Flow implementation
- Polls for authorization completion
- Stores token in ~/.churn/config.json
- Supports anonymous mode

**src/components/ModelSelect.tsx**
- Interactive provider selection
- Model list for each provider
- API key input with masking
- Saves selection as default

**src/components/RunConsole.tsx**
- Real-time analysis progress
- Phase indicators (scanning, analyzing, generating, complete)
- Progress bar with percentage
- Live file updates
- Summary statistics on completion

**src/components/ReviewPanel.tsx**
- List view with navigation (↑↓)
- Detail view for individual suggestions
- Toggle acceptance with Space
- Batch operations (accept all, clear all)
- Category and severity color coding

**src/components/ExportPanel.tsx**
- Exports to JSON, Markdown, and Patch formats
- Timestamped filenames
- Saves to .churn/patches/
- Completion confirmation

## Data Flow

```
User runs: churn run
    ↓
index.tsx parses command
    ↓
App component initializes
    ↓
git.ts detects repository
    ↓
ModelSelect.tsx chooses model
    ↓
config.ts loads API key
    ↓
RunConsole.tsx starts analysis
    ↓
analysis.ts scans files
    ↓
models.ts calls AI API
    ↓
analysis.ts aggregates suggestions
    ↓
reports.ts generates churn-reports.json
    ↓
ReviewPanel.tsx displays results
    ↓
User accepts suggestions
    ↓
ExportPanel.tsx exports to .churn/patches/
    ↓
Complete
```

## Configuration Files

### Global Config (~/.churn/config.json)

Stores:
- GitHub OAuth token and username
- API keys for Anthropic, OpenAI, Google
- Default model provider and model name
- User preferences

### Project Config (.churn/config.json)

Stores:
- Last run timestamp
- Last model used
- Ignore patterns for analysis

## Build and Distribution

### Development
```bash
bun install
bun run dev
```

### Production Build
```bash
bun run build        # Transpiles to dist/
bun run compile      # Creates single binary
```

### Binary Output
- `churn` (macOS/Linux)
- `churn.exe` (Windows)

Single executable with all dependencies bundled.

## Architecture Principles

1. **Local-First**: No remote servers or databases
2. **Zero Configuration**: Works out of the box
3. **Modular Design**: Clear separation of concerns
4. **Type Safety**: Full TypeScript coverage
5. **Streaming UX**: Real-time feedback
6. **Deterministic**: Reproducible results
7. **Visual Consistency**: Coral theme throughout

## Dependencies

### Core
- `ink` - React for terminal UIs
- `react` - Component framework
- `chalk` - Terminal colors
- `commander` - CLI argument parsing

### Git & Files
- `simple-git` - Git operations
- `fs-extra` - File system utilities
- `fast-glob` - Fast file matching

### AI Providers
- `@anthropic-ai/sdk` - Claude API
- `openai` - GPT API
- `@google/generative-ai` - Gemini API
- `ollama` - Local model API

### UI Enhancements
- `gradient-string` - Gradient text
- `ink-spinner` - Loading animations
- `ink-text-input` - Text input component
- `ink-select-input` - Selection lists

## Extension Points

### Adding New Model Providers

1. Add provider to `ModelProvider` type in `models.ts`
2. Implement send function (e.g., `sendNewProviderPrompt`)
3. Add to `AVAILABLE_MODELS` constant
4. Update `sendPrompt` switch statement
5. Add to ModelSelect items

### Adding New Export Formats

1. Add format option to `exportSuggestions` in `reports.ts`
2. Implement format generator function
3. Update ExportPanel to call new format

### Customizing Analysis Prompts

Edit the prompt in `analyzeFile` function in `analysis.ts`:
- Adjust categories
- Change severity criteria
- Add custom rules
- Modify output schema

## Color Theme Reference

All colors defined in `src/theme.ts`:

- **#ff6f54** - Primary (coral)
- **#ff9b85** - Secondary (light coral)
- **#f2e9e4** - Text (warm white)
- **#a6adc8** - Gray (muted)
- **#8ab4f8** - Info (blue)
- **#a6e3a1** - Success (green)
- **#f9e2af** - Warning (yellow)
- **#f38ba8** - Error (red)

Gradient: Primary → Secondary
