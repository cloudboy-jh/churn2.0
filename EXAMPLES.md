# Churn 2.0 Examples

## Basic Workflows

### First Time Setup

```bash
# Install globally
npm install -g churn-cli

# Or with Bun (faster)
bun install -g churn-cli

# Navigate to your project
cd ~/your-project

# Start for the first time
churn start
# - Selects AI provider and model
# - Enters API key
# - Saves configuration to ~/.churn/config.json
```

### Daily Usage

```bash
# Analyze before committing
git add .
churn run --staged
churn review
```

### Specific File Analysis

```bash
# Single file
churn run --files src/index.ts

# Multiple files
churn run --files src/**/*.tsx

# Specific directories
churn run --files "src/components/**" "src/utils/**"
```

## Advanced Usage

### Model Selection

```bash
# Configure model once
churn model
# > Select: Anthropic
# > Select: claude-3-5-sonnet-20241022
# > Enter API key: sk-ant-...

# All future runs use this model
churn run
```

### Switching Models

```bash
# Change to a different model
churn switch-model
# Or
churn model

# Switch to Ollama for free local analysis
churn model
# > Select: Ollama
# > Select: llama3.3:70b
# > Base URL: http://localhost:11434 (default)
```

### Export Formats

```bash
# Run analysis
churn run

# Export to multiple formats
churn export
# Generates:
# - .churn/patches/suggestions-2025-10-22.json
# - .churn/patches/report-2025-10-22.md
# - .churn/patches/changes-2025-10-22.patch
```

### Review Workflow

```bash
# Run analysis
churn run

# Review interactively
# - Use ↑↓ to navigate
# - Press Enter to view details
# - Press Space to toggle acceptance
# - Press 'a' to accept all
# - Press 'n' to clear all
# - Press 'd' when done

# Export accepted suggestions
# Automatically triggers after review
```

## Integration Examples

### CI/CD Pipeline

```bash
# .github/workflows/churn.yml
name: Churn Analysis

on: [pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install -g churn
      - run: churn run --staged
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      - run: churn export
      - uses: actions/upload-artifact@v3
        with:
          name: churn-report
          path: .churn/patches/
```

### Pre-commit Hook

```bash
# .git/hooks/pre-commit
#!/bin/bash

churn run --staged --quiet
exit 0  # Don't block commit, just analyze
```

### Pass to Other Tools

```bash
# Extract high-severity issues
churn run
churn pass --to json | jq '.analysis.suggestions[] | select(.severity == "high")'

# Count suggestions by category
churn pass --to json | jq '.analysis.summary.categories'

# Get files with bugs
churn pass --to json | jq '.analysis.suggestions[] | select(.category == "bug") | .file' | sort -u
```

## Model-Specific Examples

### Using Claude

```bash
churn model
# > Select: Anthropic
# > Select: claude-3-5-sonnet-20241022
# > Enter API key: sk-ant-...

churn run
```

### Using GPT-4

```bash
churn model
# > Select: OpenAI
# > Select: gpt-4-turbo-preview
# > Enter API key: sk-...

churn run
```

### Using Local Ollama

```bash
# Start Ollama
ollama serve

# Pull a model
ollama pull codellama

# Configure Churn
churn model
# > Select: Ollama
# > Select: codellama

# Run locally (no API costs!)
churn run
```

## Churn Reports Schema

### Example `churn-reports.json`

```json
{
  "version": "2.0.0",
  "repository": {
    "name": "my-app",
    "branch": "main",
    "path": "/Users/me/projects/my-app",
    "remote": "https://github.com/user/my-app.git"
  },
  "analysis": {
    "summary": {
      "filesAnalyzed": 47,
      "suggestions": 12,
      "categories": {
        "refactor": 5,
        "optimization": 3,
        "bug": 2,
        "style": 2
      },
      "duration": 45320
    },
    "suggestions": [
      {
        "file": "src/components/Button.tsx",
        "category": "refactor",
        "severity": "medium",
        "title": "Extract repeated styling logic",
        "description": "The component has duplicated styling logic that could be extracted into a separate utility function.",
        "suggestion": "Create a `getButtonStyles` function to centralize style computation.",
        "code": {
          "before": "const style = variant === 'primary' ? styles.primary : styles.secondary;",
          "after": "const style = getButtonStyles(variant, size);",
          "startLine": 12,
          "endLine": 12
        }
      }
    ],
    "metadata": {
      "timestamp": "2025-10-22T10:30:00.000Z",
      "model": "claude-3-5-sonnet-20241022",
      "provider": "anthropic",
      "mode": "full"
    }
  },
  "generatedAt": "2025-10-22T10:30:45.320Z"
}
```

## Troubleshooting

### API Key Issues

```bash
# Verify key is set
cat ~/.churn/config.json | jq '.apiKeys'

# Re-enter key
churn model
```

### Git Repository Not Found

```bash
# Ensure you're in a git repo
git status

# Initialize if needed
git init
```

### Model Not Available

```bash
# For Ollama, ensure it's running
ollama list

# Pull model if needed
ollama pull llama2
```

### Large Repository Performance

```bash
# Analyze specific directories
churn run --files "src/critical/**"

# Use staged files only
git add src/critical
churn run --staged
```

## Tips and Best Practices

1. **Start Small**: Run on staged files first to test
2. **Review Carefully**: Not all suggestions may be applicable
3. **Save Reports**: Keep `churn-reports.json` for history
4. **Use Filters**: Target specific files or directories
5. **Automate**: Integrate into CI/CD for continuous monitoring
6. **Local First**: Try Ollama for zero-cost analysis

## Color Reference

The Churn 2.0 UI uses a coral palette:

- **Primary** (#ff6f54): Active selections, highlights, progress
- **Secondary** (#ff9b85): Borders, gradients
- **Success** (#a6e3a1): Completed tasks
- **Warning** (#f9e2af): Medium severity
- **Error** (#f38ba8): High severity, errors
- **Info** (#8ab4f8): Status messages
- **Text** (#f2e9e4): Main text
- **Gray** (#a6adc8): Dimmed text, inactive elements
