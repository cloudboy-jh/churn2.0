<div align="center">

![Churn](./assets/churnreadme.png)

**Refactor smarter. From your terminal.**

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
- [What's New in v2.0.5](#whats-new-in-v205)
- [Quick Start](#quick-start)
- [Features](#features)
- [Performance & Cost](#performance--cost-optimization)
- [Installation](#installation)
- [Running Locally with Ollama](#running-locally-with-ollama)
- [Commands](#commands)
- [Configuration](#configuration)
- [Report Schema](#report-schema)
- [Examples](#examples)
- [Development](#development)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [Community & Support](#community--support)
- [License](#license)

---

## Why Churn?

**Built for developers, by developers.** Churn is an AI-assisted CLI tool that helps you maintain and refactor codebases with intelligent analysis—all from your terminal.

**What makes Churn different:**

- **Truly Open Source** - MIT licensed, no hidden fees, no telemetry, no account required
- **Local-First** - Your code never leaves your machine unless you choose a cloud model
- **Zero Setup** - Run from any Git repository, no configuration needed to start
- **Model Freedom** - Use Claude, GPT, Gemini, or run completely offline with Ollama
- **Production Ready** - v2.0.5 is stable and actively maintained
- **Cost Conscious** - Smart caching and staged mode reduce API costs by 70-90%
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

- **Cleanup before release** - Find dead code, unused dependencies, and orphaned files
- **Onboarding new developers** - Generate a "health report" of technical debt
- **Pre-PR review** - Catch issues before they hit CI/CD
- **Refactoring planning** - Identify high-impact areas to improve
- **Dependency audits** - Flag outdated or unused packages
- **Security scanning** - Detect common anti-patterns and vulnerabilities

Churn gives you **actionable insights**, not just observations. Every finding includes context, severity, and suggested fixes.

---

## What's New in v2.0.5

**Latest Release** - Published 2 days ago

- Repository cleanup and optimization
- Updated color theme to vibrant red (#ff5656)
- Performance improvements and cost optimizations
- Enhanced initialization flow
- Global install support improvements
- Bug fixes and stability enhancements


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
5. Let you review and accept/reject suggestions
6. Export patches and reports

**First-time users:** Start with `churn start` for an interactive experience. The tool will guide you through model selection and configuration.

**Want to run locally with zero API costs?** See [Running Locally with Ollama](#running-locally-with-ollama) for setup instructions with free, offline models.

---

## Features

- **Zero-Setup** - Run from any Git repository, no cloning or configuration required
- **Local-First** - All data stored on your machine under `~/.churn/` and `.churn/`
- **Multi-Model Support** - Claude, GPT, Gemini, or local Ollama models
- **Live Analysis** - Real-time streaming output with progress tracking
- **Interactive Review** - Navigate and selectively accept suggestions
- **Export Workflow** - Generate patches, reports, and JSON for downstream tools
- **Smart Caching** - Content-based caching reduces repeat analysis costs by 70%
- **Staged Mode** - Analyze only staged files for 80-90% cost savings
- **Parallel Processing** - Concurrent file analysis for 10x speed improvements
- **Beautiful UI** - Clean, vibrant red-themed terminal interface powered by Ink

---

## Performance & Cost Optimization

Churn 2.0 is designed to be fast and cost-effective.

### Speed Optimization

**Parallel Processing** (Default)
- Files analyzed concurrently (5-10 at a time depending on provider)
- ~10x faster than sequential analysis
- Configurable via CLI

```bash
# Adjust concurrency (1-50)
churn run --concurrency 15
```

**Smart Caching**
- Analysis results cached based on file content
- Unchanged files return instant results
- Cache persists for 30 days
- ~70% time savings on subsequent runs

**File Prioritization**
- Smart ordering based on language familiarity, size, and importance
- Entry points analyzed first for quick feedback

### Cost Optimization

| Strategy | Cost Savings | Use Case |
|----------|-------------|----------|
| **Staged Mode** | 80-90% | Daily development workflow |
| **Cheaper Models** | 60-80% | Routine scans |
| **Smart Caching** | 70% | Repeated analysis |
| **File Filtering** | 20-40% | Automatic (built-in) |

**Best Practices:**

1. **Daily work - Use staged mode**
   ```bash
   git add .
   churn run --staged
   ```

2. **Quick scans - Use cheaper models**
   ```bash
   churn model  # Select claude-haiku-4-5 or gpt-4o-mini
   churn run --staged
   ```

3. **Leverage caching** - Rerun after minor changes for 70% cost reduction

4. **Full scans - Reserve for releases**
   ```bash
   churn run  # Only before major releases
   ```

**Cost Example** (50-file project):

| Mode | Model | Cost | Time | When to Use |
|------|-------|------|------|-------------|
| `--staged` (5 files) | Haiku | $0.05 | 5s | Daily commits |
| `--staged` (5 files) | Sonnet | $0.15 | 5s | Important features |
| Full (50 files, cached) | Sonnet | $0.40 | 15s | Reruns |
| Full (50 files) | Sonnet | $1.25 | 1-2min | First run / Release |
| Full (50 files) | Opus | $3.75 | 1-2min | Critical releases |

---

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

---

## Running Locally with Ollama

**Zero API costs. Run Churn completely offline with local models.**

Ollama lets you run powerful AI models on your own hardware—no API keys, no cloud dependencies, no usage fees.

### Quick Setup

```bash
# 1. Install Ollama
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows - Download from https://ollama.com/download

# 2. Pull a recommended model
ollama pull deepseek-r1:latest

# 3. Run Churn
cd your-project
churn start
# Select "Ollama" when prompted for provider
# Select your model from the list
```

### Recommended Models

| Model | VRAM | RAM | Speed | Quality | Best For |
|-------|------|-----|-------|---------|----------|
| **deepseek-r1:latest** | 8 GB | 16 GB | Medium | Excellent | Production analysis, deep reasoning |
| **qwen2.5-coder:14b** | 9 GB | 16 GB | Medium | Excellent | Code-specific tasks, refactoring |
| **llama3.3:70b** | 40 GB | 64 GB | Slow | Best | Workstation/server, comprehensive analysis |
| **phi-3-mini** | 4 GB | 8 GB | Fast | Good | Quick scans, older hardware |
| **codellama:13b** | 8 GB | 16 GB | Medium | Good | Code analysis, legacy support |
| **mistral:7b** | 5 GB | 12 GB | Fast | Good | Daily development, fast iterations |

**Hardware Guide:**

- **Laptop (8-16 GB RAM)** - Use `phi-3-mini` or `mistral:7b` for fast analysis
- **Desktop (16-32 GB RAM)** - Use `deepseek-r1` or `qwen2.5-coder` for balanced performance
- **Workstation (32+ GB RAM)** - Use `llama3.3:70b` for maximum quality

**Performance Expectations:**

- **Small project (10-20 files)** - 30 seconds to 2 minutes depending on model
- **Medium project (50-100 files)** - 2-5 minutes with parallel processing
- **Large project (200+ files)** - 10-20 minutes (use `--staged` mode for daily work)

**Tips for Best Results:**

1. **Use staged mode for daily work** - Analyze only changed files to keep scans under 30 seconds
   ```bash
   git add .
   churn run --staged
   ```

2. **Start with a smaller model** - Test with `phi-3-mini` before pulling larger models

3. **Increase concurrency for faster analysis** - Local models can often handle more parallel requests
   ```bash
   churn run --concurrency 10
   ```

4. **Keep Ollama updated** - New versions improve performance and model support
   ```bash
   ollama update
   ```

**Why Ollama?**

- **Privacy** - Your code never leaves your machine
- **Cost** - Zero API fees, unlimited usage
- **Speed** - No network latency for small files
- **Reliability** - Works offline, no rate limits
- **Control** - Choose your model, adjust settings

**More Information:**

- [Ollama Documentation](https://ollama.com/docs)
- [Browse Models](https://ollama.com/library)
- [Model Comparisons](https://ollama.com/search)

---

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

---

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

### API Keys

Churn requires API keys for non-local models:

- **Anthropic**: Get at [console.anthropic.com](https://console.anthropic.com/)
- **OpenAI**: Get at [platform.openai.com](https://platform.openai.com/)
- **Google**: Get at [makersuite.google.com](https://makersuite.google.com/)
- **Ollama**: Run locally, no key needed

Keys are stored in `~/.churn/config.json` and never sent anywhere except the respective API providers.

---

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

### Directory Structure

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

---

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

### Use a different model for one-off analysis

```bash
churn model  # Select new model
churn run    # Run with new model
```

### Export and pipe to another tool

```bash
churn export
churn pass --to claude | jq '.analysis.suggestions'
```

### Daily workflow example

```bash
# Work on your code
git add src/components/Button.tsx

# Quick analysis with cheap model
churn model  # Select Haiku
churn run --staged

# Review and accept suggestions
# Export patch
churn export
```

---

## Development

### Setup

```bash
git clone https://github.com/cloudboyjh1/churn2.0.git
cd churn2.0
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

---

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

### Theme

Churn 2.0 is built around a vibrant red aesthetic centered on **#ff5656**.

**Color Palette:**
- Primary: `#ff5656` - Main vibrant red accent
- Secondary: `#ff8585` - Lighter red
- Text: `#f2e9e4` - Warm off-white
- Gray: `#a6adc8` - Muted purple-gray
- Info: `#8ab4f8` - Soft blue
- Success: `#a6e3a1` - Soft green
- Warning: `#f9e2af` - Soft yellow
- Error: `#f38ba8` - Soft red

All UI elements - progress bars, borders, highlights, and the ASCII logo - use this color system.

### Principles

1. **Zero-Setup** - Works immediately in any Git repository
2. **Local-First** - Everything stored locally, no cloud dependencies
3. **Deterministic** - Same input produces same output
4. **Visual Discipline** - Consistent color-centered design
5. **Immediate Feedback** - Real-time streaming, no waiting
6. **Professional** - Quiet, focused, monospaced aesthetic

---

## Contributing

Churn is open-source and welcomes contributions from the community.

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes**
4. **Test thoroughly** (`bun run type-check` and test the CLI)
5. **Commit your changes** (`git commit -m 'Add amazing feature'`)
6. **Push to your branch** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request**

### Areas for Contribution

- Additional model providers
- Enhanced analysis prompts
- New export formats
- Language-specific analysis profiles
- UI improvements
- Documentation improvements
- Bug fixes
- Performance optimizations

### Development Guidelines

- Follow the existing code style (TypeScript, functional where possible)
- Maintain the color theme consistency (#ff5656)
- Add tests for new features
- Update documentation for user-facing changes
- Keep the CLI fast and responsive

---

## Roadmap

### Planned Features

**Language Specialties**
- Enhanced analysis for Python, Rust, Go, Java with language-specific best practices
- Framework detection for React, Next.js, FastAPI, Django, Rails
- Language-specific code patterns and anti-patterns

**Repository Profiles**
- Auto-detect and optimize for monorepos, microservices, libraries, frameworks
- Project type-specific analysis rules
- Custom analysis depth based on repo structure

**Custom Analysis Packs**
- Install community-created rule sets for specific use cases
- Security-focused analysis packs
- Performance optimization packs
- Style and convention packs
- Share and discover packs via registry

**Team Workflows**
- Shared configurations across teams
- Standardized analysis profiles
- Team-wide best practices enforcement

**CI/CD Integration**
- Ready-to-use GitHub Actions workflows
- GitLab CI templates
- Jenkins pipeline integration
- Automated PR analysis and comments

### Future Exploration

- Multi-repo analysis and cross-project insights
- Historical trend tracking and code quality metrics
- Custom AI model fine-tuning for your codebase
- Integration with popular code quality tools
- Advanced reporting and visualization

**Have ideas?** [Open an issue](https://github.com/cloudboyjh1/churn2.0/issues) or submit a PR!

---

## Community & Support

### Getting Help

- **GitHub Issues** - [Report bugs or request features](https://github.com/cloudboyjh1/churn2.0/issues)
- **GitHub Discussions** - Ask questions and share experiences (coming soon)
- **Documentation** - Check this README and code comments

### Reporting Bugs

When reporting bugs, please include:
- Churn version (`churn --version`)
- Operating system
- Node/Bun version
- Steps to reproduce
- Expected vs actual behavior
- Any error messages or logs

### Feature Requests

We love feature ideas! When requesting features:
- Describe the problem you're trying to solve
- Explain how the feature would help
- Provide examples if possible
- Consider contributing a PR

---

## License

MIT License - see [LICENSE](LICENSE) for details.

Copyright (c) 2025 Churn Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

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
