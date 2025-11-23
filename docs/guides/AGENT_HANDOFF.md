# Agent Handoff Guide

**Seamlessly transfer Churn analysis results to AI coding agents for implementation.**

Version: 2.1.6

---

## Overview

Churn's agent handoff system allows you to analyze your codebase with Churn and then automatically pass the results to your preferred AI coding agent for implementation. This creates a streamlined workflow:

1. **Analyze** - Churn identifies issues, refactoring opportunities, and improvements
2. **Review** - You review and accept/reject suggestions interactively
3. **Handoff** - Churn packages the results and launches your chosen agent
4. **Implement** - Your AI agent receives the context and helps you apply changes

---

## Supported Agents

- **Claude Code** - Anthropic's Claude Code CLI
- **Cursor** - Cursor AI editor
- **Gemini CLI** - Google's Gemini CLI tool
- **Codex** - OpenAI Codex CLI

Each agent receives a handoff package containing:
- Markdown report with analysis results
- JSON file with structured suggestions
- Optional: Patch files with proposed code changes
- Optional: Metadata about the analysis

---

## Quick Start

### Interactive Handoff (Recommended)

The easiest way to use handoff is through the interactive prompt after export:

```bash
# Run analysis
churn start

# Review suggestions (press 'd' when done)
# Export panel will show handoff prompt if configured

# Options:
# Y - Launch the configured agent immediately
# N - Skip handoff and complete
# C - Configure handoff settings
```

### Command-Line Handoff

Use `churn pass` for scripted or manual handoff:

```bash
# Create handoff package for Claude Code
churn pass --to claude

# Launch Claude Code immediately with results
churn pass --to claude --launch

# Create comprehensive package with all context
churn pass --to cursor --format comprehensive --launch

# View package as JSON (useful for scripting)
churn pass --to gemini | jq '.files'
```

---

## Configuration

### Global Settings

Edit `~/.churn/config.json` or use the interactive settings UI:

```json
{
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

**Settings Explained:**

- `enabled` - Enable/disable handoff feature globally
- `targetAgent` - Default agent: `claude`, `cursor`, `gemini`, `codex`, or `none`
- `contextFormat` - See [Context Formats](#context-formats) below
- `autoLaunch` - Show interactive prompt after export
- `agentCommands` - Customize CLI commands for each agent

### Interactive Configuration

Access settings during the handoff prompt:

1. Complete analysis and export
2. When prompted "Launch agent now? (Y/N/C)", press `C`
3. Navigate with arrow keys, Tab, and Space
4. Press Enter to save

**Settings UI Controls:**
- `↑` / `↓` - Navigate options
- `Tab` / `←` / `→` - Switch sections
- `Space` - Toggle auto-launch
- `Enter` - Save settings
- `ESC` - Cancel

---

## Context Formats

### Minimal (Default)

**Best for:** Quick iterations, most use cases

**Includes:**
- Markdown report with analysis summary
- JSON file with all suggestions

**Example:**
```bash
.churn/patches/
├── report-2025-01-23T15-30-00.md
└── suggestions-2025-01-23T15-30-00.json
```

**Use when:**
- You want a quick overview for the agent
- File changes are simple and don't require patches
- You're iterating rapidly

### Comprehensive

**Best for:** Complex refactoring, large changes

**Includes:**
- Everything from Minimal
- Git-style patch file with unified diffs
- Analysis metadata (repo info, model used, timing)

**Example:**
```bash
.churn/patches/
├── report-2025-01-23T15-30-00.md
├── suggestions-2025-01-23T15-30-00.json
├── changes-2025-01-23T15-30-00.patch
└── metadata-2025-01-23T15-30-00.json
```

**Use when:**
- You have code changes with before/after snippets
- You need full context about the analysis
- You want to apply patches programmatically

---

## Agent Setup

### Claude Code

```bash
# Install Claude Code CLI (if not already installed)
# Follow instructions at: https://docs.anthropic.com/claude/docs/claude-code

# Verify installation
which claude

# Test handoff
churn pass --to claude --launch
```

**Agent receives:** All files passed as CLI arguments

### Cursor

```bash
# Install Cursor (includes CLI)
# Download from: https://cursor.sh

# Add to PATH (if needed)
export PATH="/Applications/Cursor.app/Contents/Resources/app/bin:$PATH"

# Verify installation
which cursor

# Test handoff
churn pass --to cursor --launch
```

**Agent receives:** Files opened in Cursor workspace

### Gemini CLI

```bash
# Install Gemini CLI
# Follow instructions at: https://ai.google.dev/cli

# Verify installation
which gemini

# Test handoff
churn pass --to gemini --launch
```

**Agent receives:** Files passed as context

### Codex

```bash
# Install OpenAI Codex CLI
# Follow instructions at: https://platform.openai.com/docs/codex

# Verify installation
which codex

# Test handoff
churn pass --to codex --launch
```

**Agent receives:** Files passed with structured context

---

## Custom Agent Commands

If your agent uses a non-standard CLI command, customize it in the config:

```json
{
  "handoff": {
    "agentCommands": {
      "claude": "/usr/local/bin/claude-code",
      "cursor": "/Applications/Cursor.app/Contents/MacOS/cursor",
      "gemini": "python3 /path/to/gemini-cli.py",
      "codex": "npx openai-codex"
    }
  }
}
```

---

## Workflow Examples

### Example 1: Pre-commit Review

Analyze staged changes and hand off to Claude for implementation:

```bash
# Stage your changes
git add .

# Analyze only staged files
churn run --staged

# Review results interactively
# Press 'd' when done

# Handoff prompt appears
# Press 'Y' to launch Claude Code

# Claude opens with context about your changes
```

### Example 2: Refactoring Session

Full codebase analysis with comprehensive handoff:

```bash
# Run full analysis
churn start

# Review and accept refactoring suggestions
# Press 'd' when done

# When prompted, press 'C' to configure
# Set contextFormat to "comprehensive"
# Set targetAgent to "cursor"
# Press Enter to save

# On next export, comprehensive package created
# Cursor opens with full context including patches
```

### Example 3: Scripted Workflow

Automate handoff in CI/CD or scripts:

```bash
#!/bin/bash

# Run analysis
churn run --staged

# Create handoff package
PACKAGE=$(churn pass --to claude --format comprehensive)

# Parse package info
FILES=$(echo "$PACKAGE" | jq -r '.files[]')

# Custom processing
for file in $FILES; do
  echo "Processing: $file"
  # Your custom logic here
done

# Launch agent when ready
churn pass --to claude --launch
```

---

## Troubleshooting

### Agent Not Found

**Error:** `WARNING: claude not found in PATH`

**Solution:**
1. Verify agent is installed: `which claude`
2. Add agent to PATH if needed
3. Or configure custom command in `agentCommands`

### Handoff Prompt Not Appearing

**Check:**
- `handoff.enabled` is `true` in config
- `handoff.targetAgent` is not `"none"`
- `handoff.autoLaunch` is `true`

### Agent Launches But Doesn't Receive Files

**Possible causes:**
- Agent CLI doesn't support file arguments
- Custom command format is incorrect
- Files need to be relative paths

**Solution:** Customize `agentCommands` with proper format for your agent

### Context Format Not Changing

**Remember:** Format setting only affects new exports. Previous exports keep their original format.

**To verify:** Check `.churn/patches/` for timestamp-based files

---

## Advanced Usage

### Programmatic Handoff

Use the handoff engine directly in your code:

```typescript
import { createHandoffPackage, executeHandoff } from './engine/handoff.js';
import { loadLastReport } from './engine/reports.js';

const report = await loadLastReport();
const package = await createHandoffPackage(
  report,
  acceptedSuggestions,
  'comprehensive'
);

await executeHandoff('claude', package);
```

### Custom Agent Adapters

Extend Churn to support additional agents:

```typescript
// src/engine/handoff.ts

class MyCustomAgentAdapter implements AgentAdapter {
  buildCommand(files: string[], cwd: string): string {
    return `cd "${cwd}" && my-agent --files ${files.join(' ')}`;
  }
}
```

### Filtering Handoff Content

Only pass specific categories to agents:

```bash
# Export all findings
churn run

# Use jq to filter by category
churn pass --to claude | jq '.suggestions | map(select(.category == "refactor"))'
```

---

## FAQ

**Q: Can I use multiple agents?**  
A: Yes, run `churn pass --to <agent>` multiple times with different agents.

**Q: What if my agent doesn't have a CLI?**  
A: Use `churn pass --to <agent>` without `--launch` to get the files, then open your agent manually.

**Q: Can I disable handoff temporarily?**  
A: Set `targetAgent` to `"none"` or press 'N' when prompted.

**Q: Where are handoff files stored?**  
A: `.churn/patches/` with timestamp-based filenames for each export.

**Q: Can I customize the handoff prompt message?**  
A: Currently no, but you can modify `src/components/ExportPanel.tsx` for custom messages.

**Q: Does handoff work with Ollama models?**  
A: Yes! Handoff is independent of the analysis model. Use Ollama for analysis, then hand off to any agent.

---

## Best Practices

1. **Start with Minimal** - Use minimal format unless you need patches
2. **Review First** - Always review suggestions before handing off
3. **Test Agent Commands** - Verify agent CLI works before configuring
4. **Use Staged Mode** - For pre-commit workflows, use `--staged` for faster analysis
5. **Keep Agents Updated** - Ensure your agent CLIs are up to date
6. **Backup Before Applying** - Let agents suggest changes, but review before committing

---

## See Also

- [Commands Reference](../../README.md#commands)
- [Configuration Guide](../../README.md#configuration)
- [Examples](./EXAMPLES.md)
- [Quickstart Guide](./QUICKSTART.md)

---

**Need help?** [Open an issue](https://github.com/cloudboyjh1/churn2.0/issues) or check the [documentation](../../README.md).
