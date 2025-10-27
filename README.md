# Churn 2.0

AI-assisted developer tool for maintaining and refactoring codebases. A modern, local-first CLI that brings intelligent code analysis directly to your terminal.

```
 ▄████████    ▄█    █▄    ███    █▄     ▄████████ ███▄▄▄▄  
███    ███   ███    ███   ███    ███   ███    ███ ███▀▀▀██▄
███    █▀    ███    ███   ███    ███   ███    ███ ███   ███
███         ▄███▄▄▄▄███▄▄ ███    ███  ▄███▄▄▄▄██▀ ███   ███
███        ▀▀███▀▀▀▀███▀  ███    ███ ▀▀███▀▀▀▀▀   ███   ███
███    █▄    ███    ███   ███    ███ ▀███████████ ███   ███
███    ███   ███    ███   ███    ███   ███    ███ ███   ███
████████▀    ███    █▀    ████████▀    ███    ███  ▀█   █▀ 
                                       ███    ███          
```

## Features

- **Zero-Setup**: Run from any Git repository - no cloning or configuration required
- **Local-First**: All data stored on your machine under `~/.churn/` and `.churn/`
- **Multi-Model Support**: Claude, GPT, Gemini, or local Ollama
- **Live Analysis**: Real-time streaming output with progress tracking
- **Interactive Review**: Navigate and selectively accept suggestions
- **Export Workflow**: Generate patches, reports, and JSON for downstream tools
- **Beautiful UI**: Clean, coral-themed terminal interface powered by Ink

## Installation

### Quick Install (Recommended)

```bash
# Using npm
npm install -g churn-cli

# Using Bun (faster)
bun install -g churn-cli

# Using pnpm
pnpm install -g churn-cli

# Using yarn
yarn global add churn-cli
```

### From Source (For Development)

```bash
git clone https://github.com/cloudboyjh1/churn2.0.git
cd churn2.0
bun install
bun run compile
```

This creates a single executable binary `churn` or `churn.exe`.

## Quick Start

```bash
# Navigate to your project
cd your-project

# Start interactive analysis (recommended for first-time users)
churn start

# Or use run (same as start)
churn run

# Analyze specific modes
churn run --staged        # Analyze staged files only
churn run --files src/**  # Analyze specific files
```

### First-Run Experience

On first use, Churn will:
1. Show welcome message and available commands
2. Prompt you to select an AI provider (Anthropic, OpenAI, Google, or Ollama)
3. Ask for API key (if using cloud provider)
4. Save your selection as the default
5. Show confirmation screen before analyzing
6. Begin analysis after you press Enter

## Commands

### `churn start` / `churn run`

Run code analysis on your repository. Both commands do the same thing.

**Options:**
- `-s, --staged` - Analyze only staged files
- `-f, --files <files...>` - Analyze specific files
- `-c, --concurrency <number>` - Number of files to analyze in parallel (1-50)

**Flow:**
1. Detects repository and project type
2. Prompts for model selection (if not configured)
3. Shows confirmation screen with file count and model details
4. User presses Enter to start or Esc to cancel
5. Analyzes files with real-time progress
6. Generates `churn-reports.json` in `.churn/reports/`
7. Opens interactive review panel
8. User accepts/rejects suggestions
9. Export patches and reports

### `churn model`

Select or change your AI model provider.

```bash
churn model
```

Supports:
- **Anthropic** (Claude Sonnet 4.5, Opus 4.1, Haiku 4.5, Sonnet 4)
- **OpenAI** (GPT-5, GPT-5 Mini, GPT-5 Nano, GPT-5 Pro)
- **Google** (Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.5 Flash-Lite, Gemini 2.0 Flash)
- **Ollama** (Local models like Llama 3.3, DeepSeek-R1, Qwen 2.5, Mistral, CodeLlama)

Your selection is saved as the default.

### `churn review`

Review results from the last analysis.

```bash
churn review
```

Navigate with arrow keys, press Enter to view details, Space to toggle acceptance.

### `churn export`

Export the last analysis to files.

```bash
churn export
```

Generates:
- `suggestions-<timestamp>.json` - JSON format
- `report-<timestamp>.md` - Markdown report
- `changes-<timestamp>.patch` - Git patch file (if applicable)

All saved to `.churn/patches/`.

### `churn pass`

Pass the analysis report to another LLM or tool.

```bash
churn pass --to claude
churn pass --to gpt4
```

Outputs the full `churn-reports.json` to stdout for piping.

## Configuration

### Global Config (`~/.churn/config.json`)

```json
{
  "version": "2.0.0",
  "apiKeys": {
    "anthropic": "sk-ant-...",
    "openai": "sk-...",
    "google": "AI..."
  },
  "defaultModel": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-5"
  },
  "preferences": {
    "autoApply": false,
    "verbose": false
  }
}
```

### Project Config (`.churn/config.json`)

```json
{
  "lastRun": "2025-10-23T10:30:00Z",
  "lastModel": "claude-sonnet-4-5",
  "ignorePatterns": [
    "**/test/**",
    "**/*.test.ts"
  ]
}
```

## Report Schema

The `churn-reports.json` file follows this structure:

```typescript
{
  version: string;
  repository: {
    name: string;
    branch: string;
    path: string;
    remote?: string;
  };
  analysis: {
    summary: {
      filesAnalyzed: number;
      suggestions: number;
      categories: Record<string, number>;
      duration: number;
    };
    suggestions: Array<{
      file: string;
      category: 'refactor' | 'bug' | 'optimization' | 'style' | 'documentation';
      severity: 'low' | 'medium' | 'high';
      title: string;
      description: string;
      suggestion: string;
      code?: {
        before: string;
        after: string;
        startLine?: number;
        endLine?: number;
      };
    }>;
    metadata: {
      timestamp: string;
      model: string;
      provider: string;
      mode: string;
    };
  };
  generatedAt: string;
}
```

## Directory Structure

```
your-project/
├── .churn/
│   ├── config.json           # Project-local settings
│   ├── reports/
│   │   └── churn-reports.json  # Latest analysis
│   └── patches/
│       ├── suggestions-*.json
│       ├── report-*.md
│       └── changes-*.patch
```

```
~/.churn/
└── config.json               # Global settings and credentials
```

## Theme

Churn 2.0 is built around a coral aesthetic centered on **#ff6f54**.

**Color Palette:**
- Primary: `#ff6f54` - Main coral accent
- Secondary: `#ff9b85` - Lighter coral
- Text: `#f2e9e4` - Warm off-white
- Gray: `#a6adc8` - Muted purple-gray
- Info: `#8ab4f8` - Soft blue
- Success: `#a6e3a1` - Soft green
- Warning: `#f9e2af` - Soft yellow
- Error: `#f38ba8` - Soft red

All UI elements - progress bars, borders, highlights, and the ASCII logo - use this color system.

## Development

### Setup

```bash
bun install
```

### Run in Dev Mode

```bash
bun run dev
```

### Build

```bash
bun run build       # Build to dist/
bun run compile     # Compile to single binary
```

### Type Check

```bash
bun run type-check
```

## Architecture

### Tech Stack

- **Runtime**: Bun 1.x
- **Language**: TypeScript
- **UI**: Ink (React for terminal)
- **Git**: simple-git
- **AI Models**: Anthropic SDK, OpenAI SDK, Google Generative AI, Ollama
- **Storage**: Local JSON files (fs-extra)

### Modules

#### Engine Layer

- `engine/config.ts` - Local storage and configuration management
- `engine/git.ts` - Repository detection and Git operations
- `engine/models.ts` - Direct API calls to model providers
- `engine/analysis.ts` - Codebase analysis orchestration
- `engine/reports.ts` - Report generation and export

#### UI Components

- `components/Logo.tsx` - ASCII logo with gradient
- `components/ModelSelect.tsx` - Provider and model selection
- `components/ConfirmRun.tsx` - Confirmation screen before analysis
- `components/RunConsole.tsx` - Live analysis with progress
- `components/ReviewPanel.tsx` - Interactive suggestion review
- `components/ExportPanel.tsx` - Export confirmation
- `components/AskConsole.tsx` - One-off question interface
- `components/CommandsList.tsx` - Available commands display

#### Theme

- `theme.ts` - Color constants, helpers, and formatting utilities

## Principles

1. **Zero-Setup**: Works immediately in any Git repository
2. **Local-First**: Everything stored locally, no cloud dependencies
3. **Deterministic**: Same input produces same output
4. **Visual Discipline**: Consistent coral-centered design
5. **Immediate Feedback**: Real-time streaming, no waiting
6. **Professional**: Quiet, focused, monospaced aesthetic

## API Keys

Churn 2.0 requires API keys for non-local models:

- **Anthropic**: Get at [console.anthropic.com](https://console.anthropic.com/)
- **OpenAI**: Get at [platform.openai.com](https://platform.openai.com/)
- **Google**: Get at [makersuite.google.com](https://makersuite.google.com/)
- **Ollama**: Run locally, no key needed

Keys are stored in `~/.churn/config.json` and never sent anywhere except the respective API providers.

## Performance & Cost Optimization

Churn 2.0 is designed to be fast and cost-effective. Here are strategies to optimize both:

### Speed Optimization

**Parallel Processing** (Default)
- Files are analyzed concurrently (5-10 at a time depending on provider)
- ~10x faster than sequential analysis
- Configurable via CLI or config

```bash
# Adjust concurrency (1-50)
churn run --concurrency 15
```

**Smart Caching**
- Analysis results are automatically cached based on file content
- Unchanged files return instant results on reruns
- Cache persists for 30 days
- ~70% time savings on subsequent runs

**File Prioritization**
- Files analyzed in smart order based on:
  - Model language familiarity
  - File size (smaller first for quick feedback)
  - File importance (entry points prioritized)

### Cost Optimization

Churn is optimized to minimize API costs while providing maximum value.

| Strategy | Cost Savings | Use Case |
|----------|-------------|----------|
| **Staged Mode** | 80-90% | Daily development workflow |
| **Cheaper Models** | 60-80% | Routine scans |
| **Smart Caching** | 70% | Repeated analysis |
| **File Filtering** | 20-40% | Automatic (built-in) |

**Best Practices for Cost-Conscious Development:**

1. **Daily work - Use staged mode** (saves 80-90%)
   ```bash
   # Only analyze files you're actively working on
   git add .
   churn run --staged
   ```

2. **Quick scans - Use cheaper models** (saves 60-80%)
   ```bash
   # For routine checks, use Haiku or GPT-4o-mini
   churn model  # Select claude-haiku-4-5
   churn run --staged
   ```

3. **Leverage caching** (saves 70% on reruns)
   ```bash
   # First run: Full cost
   churn run
   
   # Rerun after minor changes: ~70% cached
   churn run  # Most files returned from cache
   ```

4. **Full scans - Use for releases only**
   ```bash
   # Reserve full repo scans with premium models for important milestones
   churn run --mode full  # Only before releases
   ```

**Cost Comparison Example** (50-file project):

| Mode | Model | Cost | Time | When to Use |
|------|-------|------|------|-------------|
| `--staged` (5 files) | Haiku | $0.05 | 5s | Daily commits |
| `--staged` (5 files) | Sonnet | $0.15 | 5s | Important features |
| Full (50 files, cached) | Sonnet | $0.40 | 15s | Reruns |
| Full (50 files) | Sonnet | $1.25 | 1-2min | First run / Release |
| Full (50 files) | Opus | $3.75 | 1-2min | Critical releases |

### Automatic Optimizations

These are built-in and require no configuration:

- **Smart file filtering**: Skips `node_modules`, `dist`, test files, `.d.ts`, lock files, minified code
- **Content-based caching**: Files analyzed once until content changes
- **Priority scheduling**: Important files analyzed first
- **Retry logic**: Handles rate limits gracefully
- **Parallel processing**: Default concurrency tuned per provider

## Examples

### Analyze specific files

```bash
churn run --files src/components/*.tsx
```

### Analyze staged changes before commit

```bash
git add .
churn run --staged
```

### Use a different model

```bash
churn model  # Select new model
churn run    # Run with new model
```

### Export last results

```bash
churn export
```

### Pass to another tool

```bash
churn pass --to claude | jq '.analysis.suggestions'
```

## Contributing

Churn 2.0 is built to be extended. Contributions welcome for:

- Additional model providers
- Enhanced analysis prompts
- New export formats
- UI improvements
- Bug fixes

## License

MIT

## Acknowledgments

Built with Ink, powered by Bun, themed in coral.
