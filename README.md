<div align="center">

![Churn](./assets/churnreadmelogonew.png)

**Your agents favorite context layer.**

Open-source • Local-first • Use as-is

[![npm version](https://img.shields.io/npm/v/churn-cli.svg?style=flat-square&color=ff5656)](https://www.npmjs.com/package/churn-cli)
[![npm downloads](https://img.shields.io/npm/dm/churn-cli.svg?style=flat-square&color=ff5656)](https://www.npmjs.com/package/churn-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-ff5656.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Made with Bun](https://img.shields.io/badge/Made%20with-Bun-ff5656?style=flat-square&logo=bun)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-ff5656?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-ff5656.svg?style=flat-square)](https://github.com/cloudboyjh1/churn2.0/pulls)

</div>

---

## Table of Contents

- [Why Churn?](#why-churn)
- [What Churn Finds](#what-churn-finds)
- [What's New in v2.1](#whats-new-in-v21)
- [Quick Start](#quick-start)
- [Features](#features)
- [Installation](#installation)
- [Running Locally with Ollama](#running-locally-with-ollama)
- [Commands](#commands)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Configuration](#configuration)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Why Churn?

**Built for developers, by developers.** Churn is a context intelligence layer that structures and analyzes code for AI agents and workflows—all from your terminal.

**What makes Churn different:**

- **Truly Open Source** - MIT licensed, no hidden fees, no telemetry, no account required
- **Local-First** - Your code never leaves your machine unless you choose a cloud model
- **Zero Setup** - Run from any Git repository, no configuration needed to start
- **Model Freedom** - Use Claude, GPT, Gemini, or run completely offline with Ollama
- **Production Ready** - v2.1+ is stable and actively maintained
- **Cost Conscious** - Smart caching, adaptive prompts, and staged mode reduce API costs by 70-90%
- **Beautiful Terminal UI** - Clean, focused interface that doesn't get in your way

Churn respects your workflow, your privacy, and your budget.

---

## What Churn Finds

**Real analysis outcomes from actual projects:**

```bash
✓ Removed 47 unused imports across 23 TypeScript files
✓ Detected 12 orphaned utility functions with no references
✓ Flagged 8 dependencies not imported anywhere in src/
✓ Identified 5 performance bottlenecks in rendering loops
✓ Caught 3 security anti-patterns (exposed API keys, eval usage)
✓ Suggested 15 complex functions that would benefit from breaking down
✓ Found 9 TODO comments older than 6 months
✓ Detected duplicate logic across 4 similar components
```

**Common use cases:**

- **Pre-commit checks** - Use `--staged` to analyze only your changes before committing (90% faster)
- **Cleanup before release** - Find dead code, unused dependencies, and orphaned files
- **Onboarding new developers** - Generate a "health report" of technical debt
- **Pre-PR review** - Catch issues before they hit CI/CD with language-specific analysis
- **Refactoring planning** - Identify high-impact areas to improve
- **Dependency audits** - Flag outdated or unused packages
- **Security scanning** - Detect common anti-patterns and vulnerabilities
- **Framework migration** - Get context-aware findings for your specific stack

Churn gives you **actionable insights**, not just observations. Every finding includes context, severity, and suggested fixes tailored to your language and framework.

---

## What's New in v2.1.6

**Agent Handoff System** - Version 2.1.6 introduces seamless integration with AI coding agents:

**New in v2.1.6**
- **Interactive Handoff** - After export, prompt to launch your configured agent immediately
- **Agent Support** - Claude Code, Cursor, Gemini CLI, and Codex integration
- **Context Formats** - Minimal (MD+JSON) or Comprehensive (MD+JSON+patch+metadata)
- **Enhanced `churn pass`** - New `--launch` flag to start agents directly
- **Settings UI** - Press 'C' during handoff prompt to configure preferences
- **Workflow Integration** - Analyze with Churn → Hand off to agent → Implement changes

**Previous Performance Improvements (v2.1.5)** 
- **60-70% faster analysis** - 117 files: 8 minutes → 2-3 minutes
- Fixed broken retry mechanism that prevented proper API error recovery
- Reduced timeout from 120s → 45s for faster failure detection
- Increased concurrency: Anthropic/OpenAI/Google from 8-10 → 15 concurrent files
- JSON extraction reduces parsing failures
- UI components now prioritized in analysis queue
- Fixed ReviewPanel input handler instability (missed in v2.1.4)
- Adaptive viewport sizing based on terminal height (10-25 items vs hardcoded 10)

**Better Error Handling (v2.1.5)** 
- Separated API errors from JSON parsing errors
- Detailed analysis summary shows success/failure breakdown
- Clear distinction: "API error" (will retry) vs "JSON parsing error" (won't retry)
- Tracks parsing errors vs network errors separately

**Rebranding & Narrative Refinement (v2.1.3)**
- Repositioned from "AI-assisted tool" to "context intelligence layer for AI agents"
- Emphasizes role as infrastructure and substrate for AI workflows
- Updated messaging: "Your agents favorite context layer"
- Reframed UI terminology: "Findings" instead of "Suggestions"
- No functional changes - purely narrative and positioning updates

**API Key Management & Global Shortcuts (v2.1.2)**
- View last 4 characters of saved API keys for verification
- Press 'r' to replace/update API keys in model selection screen
- Global keyboard shortcuts work on every screen (z=exit, o=start over, esc=back)
- Persistent model selection remembers last used model per provider
- Better error messages guide users to solutions for auth and rate limit errors

**Adaptive Prompts (v2.1.0)**
- Language-specific analysis tailored to TypeScript/React, Python, Rust, Go, and more
- Framework detection (Next.js, React, FastAPI, Django) for context-aware findings
- Smart config file handling (0-2 findings max, security-focused)
- Real-time token tracking and cost estimation
- 30-50% token reduction through focused, relevant prompts

**Differential Analysis (v2.1.1)**
- Staged mode now analyzes only changed lines, not entire files
- 70-90% token reduction for `churn run --staged` workflow
- Perfect for pre-commit checks and pull request reviews
- Automatic fallback to full analysis when needed

**Stability Improvements (v2.0.13)**
- Fixed infinite re-rendering bug in analysis summary
- Clean, single-render completion screen
- Rock-solid analysis execution

**See [CHANGELOG.md](./CHANGELOG.md) for complete version history.**

---

## Quick Start

**Get your first analysis in 30 seconds:**

```bash
# Install globally
npm install -g churn-cli

# Navigate to your project
cd your-project

# Run analysis
churn start
```

That's it. Churn will:
1. Detect your repository and project type
2. Prompt you to select an AI model (first run only)
3. Show you what it's about to analyze
4. Stream results in real-time
5. Let you review and accept/reject findings
6. Export patches and reports

**First-time users:** Start with `churn start` for an interactive experience. The tool will guide you through model selection and configuration.

**Want to run locally with zero API costs?** See [Running Locally with Ollama](#running-locally-with-ollama) for setup instructions with free, offline models.

**Cost-conscious?** Churn shows real-time token usage and cost estimation during analysis. Combined with smart caching and staged mode, you can reduce API costs by 70-90% while maintaining high-quality insights.

---

## Features

- **Zero-Setup** - Run from any Git repository, no cloning or configuration required
- **Local-First** - All data stored on your machine under `~/.churn/` and `.churn/`
- **Multi-Model Support** - Claude, GPT, Gemini, or local Ollama models
- **Agent Handoff** - Pass analysis results directly to Claude Code, Cursor, Gemini CLI, or Codex for implementation
- **Adaptive Analysis** - Language and framework-aware prompts for context-specific findings
- **Differential Mode** - Analyze only changed lines in staged files (70-90% cost savings)
- **Live Analysis** - Real-time streaming output with progress tracking
- **Interactive Review** - Navigate and selectively accept findings
- **Export Workflow** - Generate patches, reports, and JSON for downstream tools
- **Smart Caching** - Content-based caching reduces repeat analysis costs by 70%
- **Token Tracking** - Real-time cost estimation and transparency
- **Parallel Processing** - Concurrent file analysis for 10x speed improvements
- **Beautiful UI** - Clean, vibrant red-themed terminal interface powered by Ink

---

## Installation

### Quick Install (Recommended)

```bash
# Using npm
npm install -g churn-cli

# Using Bun (faster, recommended)
bun install -g churn-cli

# Using pnpm
pnpm install -g churn-cli

# Using yarn
yarn global add churn-cli
```

**Note:** Churn is built with Bun. While it works with npm/yarn/pnpm, using Bun ensures the best experience.

### For Development

**Requirements:** Bun 1.x (NOT Node.js)

```bash
# Clone the repository
git clone https://github.com/cloudboyjh1/churn2.0.git
cd churn2.0

# Install dependencies with Bun
bun install

# Run in development mode
bun run dev

# Build
bun run build

# Type check
bun run type-check
```

**Important:** This project requires Bun. Do not use `npm install` for development as it may cause dependency issues.

---

## Running Locally with Ollama

**Zero API costs. Run Churn completely offline with local models.**

### Quick Setup

```bash
# 1. Install Ollama (macOS/Linux)
curl -fsSL https://ollama.com/install.sh | sh

# Windows - Download from https://ollama.com/download

# 2. Pull a recommended model
ollama pull deepseek-r1:latest

# 3. Run Churn
cd your-project
churn start
# Select "Ollama" when prompted for provider
```

**Recommended models:** `deepseek-r1:latest`, `qwen2.5-coder:14b`, `phi-3-mini`, `mistral:7b`

**More Information:**
- [Ollama Documentation](https://ollama.com/docs)
- [Browse Models](https://ollama.com/library)

---

## Commands

### `churn start`

Launch interactive menu with options to run analysis, choose model, configure settings, or exit.

```bash
churn start
```

**Menu Options:**
- **Run scan** - Start code analysis with current model
- **Choose model** - Select or switch AI provider/model
- **Settings** - Configure handoff preferences (agent, context format, auto-launch)
- **Exit** - Quit the application

### `churn run`

Direct code analysis for power users (no interactive menu).

**Options:**
- `-s, --staged` - Analyze only staged files using differential analysis (analyzes only changed lines)
- `-f, --files <files...>` - Analyze specific files
- `-c, --concurrency <number>` - Number of files to analyze in parallel (1-50)

**Examples:**
```bash
# Pre-commit check - analyze only your changes
git add .
churn run --staged

# Analyze specific files
churn run --files src/components/Button.tsx src/utils/helpers.ts

# Full repo scan with higher concurrency
churn run --concurrency 20
```

### `churn model`

Select or change your AI model provider. Your selection is remembered per provider.

```bash
churn model
```

**Features (v2.1.2+):**
- Persistent model selection - remembers last used model per provider
- API key verification - shows last 4 characters of saved key
- Press 'r' to replace/update API key
- Pre-selects last used model when switching providers

**Supported Providers:**
- **Anthropic** (Claude Sonnet 4.5, Opus 4.1, Haiku 4.5, Sonnet 4)
- **OpenAI** (GPT-5, GPT-5 Mini, GPT-5 Nano, GPT-5 Pro)
- **Google** (Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.5 Flash-Lite, Gemini 2.0 Flash)
- **Ollama** (Local models like Llama 3.3, DeepSeek-R1, Qwen 2.5, Mistral, CodeLlama)

### `churn review`

Review results from the last analysis.

```bash
churn review
```

**Navigation:**
- Arrow keys - Navigate between findings
- Enter - View details
- Space - Toggle acceptance
- Q - Quit review

### `churn export`

Export the last analysis to files.

```bash
churn export
```

**Generated files (saved to `.churn/patches/`):**
- `findings-<timestamp>.json` - Full analysis results in JSON format
- `report-<timestamp>.md` - Human-readable markdown report with summary
- `changes-<timestamp>.patch` - Git patch file (if applicable)

**Analysis summary includes:**
- Files analyzed and cache hits
- Tokens used and saved
- Estimated cost and savings
- Project type and framework detected
- All findings with severity levels

### `churn pass`

Hand off analysis results to AI coding agents (Claude Code, Cursor, Gemini CLI, Codex).

**Options:**
- `--to <agent>` - Target agent: `claude`, `cursor`, `gemini`, or `codex` (required)
- `--format <format>` - Context format: `minimal` (MD+JSON) or `comprehensive` (MD+JSON+patch+metadata) (default: minimal)
- `--launch` - Launch the agent immediately with the handoff package

**Examples:**
```bash
# Create handoff package and display info
churn pass --to claude

# Create comprehensive package with all context
churn pass --to cursor --format comprehensive

# Launch agent immediately with handoff package
churn pass --to claude --launch

# View handoff package as JSON
churn pass --to gemini | jq '.files'
```

The `pass` command generates a handoff package containing the analysis results and optionally launches the target agent with the files. This enables seamless workflows where Churn analyzes your code and then hands control to your preferred AI coding assistant for implementation.

---

## Keyboard Shortcuts

Churn includes global keyboard shortcuts that work on every screen (added in v2.1.2):

| Key | Action | Description |
|-----|--------|-------------|
| `z` | **Exit** | Exit the application from anywhere |
| `o` | **Start Over** | Return to the start menu |
| `esc` | **Go Back** | Go back one step in the workflow |
| `r` | **Replace Key** | Replace API key (when viewing model selection) |

**Review Panel Shortcuts:**
- `↑` / `↓` - Navigate between findings
- `Enter` - View finding details
- `Space` - Toggle finding acceptance
- `a` - Accept all findings
- `n` - Accept none (clear all)
- `d` - Done (proceed to export)
- `q` - Quit review mode

**Note:** Shortcuts are displayed in the footer on each screen for convenience. Global shortcuts work consistently across all interactive screens including ModelSelect, StartMenu, ConfirmRun, and ReviewPanel.

---

## Configuration

### Global Config (`~/.churn/config.json`)

```json
{
  "version": "2.1.5",
  "apiKeys": {
    "anthropic": "sk-ant-...",
    "openai": "sk-...",
    "google": "AI..."
  },
  "defaultModel": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-5"
  },
  "handoff": {
    "enabled": true,
    "targetAgent": "claude",
    "contextFormat": "minimal",
    "autoLaunch": true,
    "agentCommands": {
      "claude": "claude",
      "cursor": "cursor",
      "gemini": "gemini",
      "codex": "codex"
    }
  }
}
```

**Handoff Configuration:**
- `enabled` - Enable/disable handoff feature
- `targetAgent` - Default agent for handoff (`claude`, `cursor`, `gemini`, `codex`, or `none`)
- `contextFormat` - Context to pass: `minimal` (MD+JSON) or `comprehensive` (MD+JSON+patch+metadata)
- `autoLaunch` - Show interactive prompt after export to launch agent
- `agentCommands` - Custom CLI commands for each agent

Configure handoff settings interactively by pressing 'C' when prompted after export, or edit the config file directly.

**Note:** Ollama models don't require API keys and run completely locally.

### API Keys

Churn requires API keys for cloud models:

- **Anthropic**: [console.anthropic.com](https://console.anthropic.com/)
- **OpenAI**: [platform.openai.com](https://platform.openai.com/)
- **Google**: [makersuite.google.com](https://makersuite.google.com/)
- **Ollama**: Run locally, no key needed

Keys are stored in `~/.churn/config.json` and never sent anywhere except the respective API providers.

---

## Documentation

### Guides
- [Agent Handoff Guide](./docs/guides/AGENT_HANDOFF.md) - Complete guide to integrating with AI coding agents
- [Quickstart Guide](./docs/guides/QUICKSTART.md) - Get started in 5 minutes
- [Examples](./docs/guides/EXAMPLES.md) - Real-world usage examples
- [Install Bun](./docs/guides/INSTALL_BUN.md) - Bun installation guide

### Development
- [Development Guide](./docs/development/CLAUDE.md) - Comprehensive developer documentation
- [Implementation Summary](./docs/development/IMPLEMENTATION_SUMMARY.md) - Architecture overview
- [File Manifest](./docs/development/FILE_MANIFEST.md) - Complete file listing

---

## Contributing

Churn is open-source and welcomes contributions.

**How to Contribute:**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and test thoroughly
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to your branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

[Report bugs or request features](https://github.com/cloudboyjh1/churn2.0/issues)

---

## License

MIT License - see [LICENSE](LICENSE) for details.

Copyright (c) 2025 Churn Contributors

---

## Acknowledgments

Built with [Ink](https://github.com/vadimdemedes/ink), powered by [Bun](https://bun.sh), themed in vibrant red.

Special thanks to the open-source community and all contributors who make Churn better.

---

<div align="center">

**Star the repo if you find Churn useful!**

[Report Bug](https://github.com/cloudboyjh1/churn2.0/issues) • [Request Feature](https://github.com/cloudboyjh1/churn2.0/issues) • [Contribute](https://github.com/cloudboyjh1/churn2.0/pulls)

Made with care for developers everywhere.

</div>
