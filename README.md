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
