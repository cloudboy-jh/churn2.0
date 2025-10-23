# Churn 2.0 - Quick Start Guide

## Installation

```bash
# Clone and build
git clone <repo-url> churn2.0
cd churn2.0
bun install
bun run compile

# The binary is now available as ./churn or ./churn.exe
```

## First Run

```bash
# Navigate to your project
cd ~/your-awesome-project

# Run Churn
/path/to/churn run

# Follow the prompts:
# 1. Select AI provider (e.g., Anthropic)
# 2. Select model (e.g., Claude 3.5 Sonnet)
# 3. Enter API key (stored securely in ~/.churn/config.json)
# 4. Watch live analysis progress
# 5. Review suggestions interactively
# 6. Accept/reject with arrow keys and Space
# 7. Export results
```

## Essential Commands

```bash
churn run              # Analyze entire repository
churn run --staged     # Analyze staged files only
churn review           # Review last analysis
churn export           # Export last analysis
churn model            # Change AI model
churn login            # Authenticate with GitHub
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
