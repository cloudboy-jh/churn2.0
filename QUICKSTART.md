# Churn 2.0 - Quick Start Guide

## Installation

```bash
# Quick install (recommended)
npm install -g churn-cli

# Or with Bun (faster)
bun install -g churn-cli

# Or with pnpm
pnpm install -g churn-cli

# Or with yarn
yarn global add churn-cli
```

### From Source (Development)

```bash
git clone https://github.com/cloudboyjh1/churn2.0.git
cd churn2.0
bun install
bun run compile

# The binary is now available as ./churn or ./churn.exe
```

## First Run

```bash
# Navigate to your project
cd ~/your-awesome-project

# Start Churn
churn start

# First-time setup flow:
# 1. Welcome message and available commands
# 2. Select AI provider (Anthropic, OpenAI, Google, or Ollama)
# 3. Select specific model (e.g., Claude Sonnet 4.5)
# 4. Enter API key (stored securely in ~/.churn/config.json)
# 5. Confirmation screen shows files to analyze
# 6. Press Enter to start or Esc to cancel
# 7. Watch live analysis progress with streaming output
# 8. Review suggestions interactively
# 9. Accept/reject with arrow keys and Space
# 10. Export results as patches and reports
```

## Essential Commands

```bash
churn start            # Start interactive analysis (recommended)
churn run              # Same as start - analyze entire repository
churn run --staged     # Analyze staged files only
churn run --files src/**/*.ts  # Analyze specific files
churn review           # Review last analysis
churn export           # Export last analysis
churn model            # Change AI model
churn switch-model     # Same as model
churn ask "question"   # Ask one-off question about code
```

## Quick Reference

### Navigation (Review Mode)

- `↑` / `↓` - Navigate suggestions
- `Enter` - View details
- `Space` - Toggle acceptance
- `a` - Accept all
- `n` - Clear all
- `d` - Done (export)
- `q` / `Esc` - Back to list

### File Locations

```
~/.churn/config.json                    # Your settings & API keys
.churn/reports/churn-reports.json       # Latest analysis
.churn/patches/                         # Exported files
```

### API Keys

Get your keys from:
- Anthropic: https://console.anthropic.com/
- OpenAI: https://platform.openai.com/
- Google: https://makersuite.google.com/
- Ollama: Run locally (no key needed)

## Common Workflows

### Pre-commit Analysis
```bash
git add .
churn run --staged
```

### Specific Files
```bash
churn run --files src/components/*.tsx
```

### Review Previous Run
```bash
churn review
```

### Export Results
```bash
churn export
```

## Troubleshooting

### "Not in a git repository"
```bash
git init
```

### "API key not found"
```bash
churn model  # Re-enter your API key
```

### "Model not available" (Ollama)
```bash
ollama serve           # Start Ollama
ollama pull llama2     # Download model
```

## Tips

1. Start with `--staged` to test on a small set
2. Review suggestions carefully - not all may apply
3. Keep `churn-reports.json` for reference
4. Use Ollama for free local analysis
5. Export results for documentation

## Support

- Documentation: README.md
- Examples: EXAMPLES.md
- Project Structure: PROJECT_STRUCTURE.md
- Issues: GitHub Issues

---

Built with ❤️ and #ff6f54
