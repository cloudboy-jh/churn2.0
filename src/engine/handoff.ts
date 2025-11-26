import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import type { FileSuggestion } from "./analysis.js";
import type { ChurnReport } from "./reports.js";
import type { AgentType, ContextFormat } from "./config.js";

export interface HandoffPackage {
  files: string[];
  summary: string;
  timestamp: string;
  contextFormat: ContextFormat;
}

export interface AgentAdapter {
  buildCommand(files: string[], cwd: string): string;
  formatContext?(
    report: ChurnReport,
    suggestions: FileSuggestion[],
  ): Promise<string>;
  getStartupPrompt?(): string;
}

// Claude Code Adapter
class ClaudeCodeAdapter implements AgentAdapter {
  buildCommand(files: string[], cwd: string): string {
    // Claude Code can accept files as arguments
    // Example: claude file1.md file2.json
    const fileArgs = files.map((f) => `"${f}"`).join(" ");
    return `cd "${cwd}" && claude ${fileArgs}`;
  }

  getStartupPrompt(): string {
    return "Review the Churn analysis results and help implement the suggested changes.";
  }
}

// Cursor Adapter
class CursorAdapter implements AgentAdapter {
  buildCommand(files: string[], cwd: string): string {
    // Cursor CLI can open files
    // Example: cursor file1.md file2.json
    const fileArgs = files.map((f) => `"${f}"`).join(" ");
    return `cd "${cwd}" && cursor ${fileArgs}`;
  }
}

// Gemini CLI Adapter
class GeminiAdapter implements AgentAdapter {
  buildCommand(files: string[], cwd: string): string {
    // Gemini CLI may accept files or context
    // This is a placeholder - adjust based on actual Gemini CLI
    const fileArgs = files.map((f) => `"${f}"`).join(" ");
    return `cd "${cwd}" && gemini ${fileArgs}`;
  }
}

// Codex Adapter
class CodexAdapter implements AgentAdapter {
  buildCommand(files: string[], cwd: string): string {
    // Codex CLI interface
    // This is a placeholder - adjust based on actual Codex CLI
    const fileArgs = files.map((f) => `"${f}"`).join(" ");
    return `cd "${cwd}" && codex ${fileArgs}`;
  }
}

// Droid Adapter (Factory AI)
class DroidAdapter implements AgentAdapter {
  buildCommand(files: string[], cwd: string): string {
    // Droid is interactive and doesn't accept file args at startup
    // Launch in the project directory - user references .churn/patches/ manually
    return `cd "${cwd}" && droid`;
  }

  getStartupPrompt(): string {
    return "Review the Churn analysis in .churn/patches/ and help implement the suggested changes.";
  }
}

// Get adapter for agent type
function getAgentAdapter(agentType: AgentType): AgentAdapter | null {
  const adapters: Record<AgentType, AgentAdapter | null> = {
    claude: new ClaudeCodeAdapter(),
    droid: new DroidAdapter(),
    gemini: new GeminiAdapter(),
    codex: new CodexAdapter(),
    cursor: new CursorAdapter(),
    none: null,
  };

  return adapters[agentType];
}

// Create handoff package with context files
export async function createHandoffPackage(
  report: ChurnReport,
  suggestions: FileSuggestion[],
  contextFormat: ContextFormat,
  cwd: string = process.cwd(),
): Promise<HandoffPackage> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const patchesDir = path.join(cwd, ".churn", "patches");
  await fs.ensureDir(patchesDir);

  const files: string[] = [];

  // Always include the markdown report (minimal and comprehensive)
  const mdPath = path.join(patchesDir, `report-${timestamp}.md`);
  const markdown = generateMarkdownReport(suggestions, report);
  await fs.writeFile(mdPath, markdown, "utf-8");
  files.push(mdPath);

  // Always include JSON suggestions
  const jsonPath = path.join(patchesDir, `suggestions-${timestamp}.json`);
  await fs.writeJSON(jsonPath, suggestions, { spaces: 2 });
  files.push(jsonPath);

  // Comprehensive mode includes additional context
  if (contextFormat === "comprehensive") {
    // Include patch file if there are code changes
    const hasCodeChanges = suggestions.some((s) => s.code);
    if (hasCodeChanges) {
      const patchPath = path.join(patchesDir, `changes-${timestamp}.patch`);
      await generatePatchFile(suggestions, patchPath, cwd);
      files.push(patchPath);
    }

    // Include analysis metadata
    const metadataPath = path.join(patchesDir, `metadata-${timestamp}.json`);
    const metadata = {
      repository: report.repository,
      summary: report.analysis.summary,
      metadata: report.analysis.metadata,
      generatedAt: report.generatedAt,
    };
    await fs.writeJSON(metadataPath, metadata, { spaces: 2 });
    files.push(metadataPath);
  }

  const summary = `Churn analysis completed with ${suggestions.length} suggestions across ${report.analysis.summary.filesAnalyzed} files.`;

  return {
    files,
    summary,
    timestamp,
    contextFormat,
  };
}

// Generate markdown report
function generateMarkdownReport(
  suggestions: FileSuggestion[],
  report: ChurnReport,
): string {
  let md = "# Churn Analysis Report\n\n";
  md += `**Repository**: ${report.repository.name}\n`;
  md += `**Branch**: ${report.repository.branch}\n`;
  md += `**Generated**: ${new Date().toISOString()}\n\n`;
  md += `## Summary\n\n`;
  md += `- **Files Analyzed**: ${report.analysis.summary.filesAnalyzed}\n`;
  md += `- **Total Suggestions**: ${suggestions.length}\n`;
  md += `- **Analysis Duration**: ${(report.analysis.summary.duration / 1000).toFixed(2)}s\n\n`;

  // Category breakdown
  md += `### Categories\n\n`;
  for (const [category, count] of Object.entries(
    report.analysis.summary.categories,
  )) {
    md += `- **${category}**: ${count}\n`;
  }
  md += "\n";

  // Group suggestions by file
  const byFile = new Map<string, FileSuggestion[]>();
  for (const suggestion of suggestions) {
    const existing = byFile.get(suggestion.file) || [];
    existing.push(suggestion);
    byFile.set(suggestion.file, existing);
  }

  md += `## Suggestions\n\n`;

  for (const [file, fileSuggestions] of byFile.entries()) {
    md += `### ${file}\n\n`;

    for (const suggestion of fileSuggestions) {
      md += `#### ${suggestion.title}\n\n`;
      md += `- **Category**: ${suggestion.category}\n`;
      md += `- **Severity**: ${suggestion.severity}\n\n`;
      md += `${suggestion.description}\n\n`;
      md += `**Suggestion**: ${suggestion.suggestion}\n\n`;

      if (suggestion.code) {
        md += "**Before**:\n";
        md += "```\n" + suggestion.code.before + "\n```\n\n";
        md += "**After**:\n";
        md += "```\n" + suggestion.code.after + "\n```\n\n";
      }

      md += "---\n\n";
    }
  }

  return md;
}

// Generate patch file
async function generatePatchFile(
  suggestions: FileSuggestion[],
  outputPath: string,
  cwd: string,
): Promise<void> {
  let patch = "";

  // Group by file
  const byFile = new Map<string, FileSuggestion[]>();
  for (const suggestion of suggestions) {
    if (suggestion.code) {
      const existing = byFile.get(suggestion.file) || [];
      existing.push(suggestion);
      byFile.set(suggestion.file, existing);
    }
  }

  for (const [file, fileSuggestions] of byFile.entries()) {
    const fullPath = path.join(cwd, file);

    try {
      const content = await fs.readFile(fullPath, "utf-8");
      const lines = content.split("\n");

      patch += `diff --git a/${file} b/${file}\n`;
      patch += `--- a/${file}\n`;
      patch += `+++ b/${file}\n`;

      for (const suggestion of fileSuggestions) {
        if (suggestion.code?.startLine && suggestion.code?.endLine) {
          const startLine = suggestion.code.startLine - 1;
          const endLine = suggestion.code.endLine;

          patch += `@@ -${startLine + 1},${endLine - startLine} +${startLine + 1},${endLine - startLine} @@\n`;

          // Show context
          for (let i = Math.max(0, startLine - 3); i < startLine; i++) {
            patch += ` ${lines[i]}\n`;
          }

          // Show removal
          for (let i = startLine; i < endLine; i++) {
            patch += `-${lines[i]}\n`;
          }

          // Show addition
          const afterLines = suggestion.code.after.split("\n");
          for (const line of afterLines) {
            patch += `+${line}\n`;
          }

          // Show context after
          for (let i = endLine; i < Math.min(lines.length, endLine + 3); i++) {
            patch += ` ${lines[i]}\n`;
          }
        }
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }

  await fs.writeFile(outputPath, patch, "utf-8");
}

// Execute handoff to agent
export async function executeHandoff(
  agentType: AgentType,
  handoffPackage: HandoffPackage,
  customCommand?: string,
  cwd: string = process.cwd(),
): Promise<void> {
  if (agentType === "none") {
    throw new Error("No agent configured for handoff");
  }

  const adapter = getAgentAdapter(agentType);
  if (!adapter) {
    throw new Error(`Unknown agent type: ${agentType}`);
  }

  // Build command
  const command =
    customCommand || adapter.buildCommand(handoffPackage.files, cwd);

  // Display handoff info
  console.log(`\nHanding off to ${agentType}...\n`);
  console.log(`Context: ${handoffPackage.contextFormat}`);
  console.log(`Files: ${handoffPackage.files.length}`);
  console.log(`Summary: ${handoffPackage.summary}\n`);

  // Execute the agent command
  try {
    // Use execSync with stdio: 'inherit' to transfer control to the agent
    execSync(command, {
      cwd,
      stdio: "inherit",
    });
  } catch (error) {
    // If the agent exits with an error, catch it gracefully
    if (error instanceof Error) {
      throw new Error(`Failed to launch ${agentType}: ${error.message}`);
    }
    throw error;
  }
}

// Check if agent is available in PATH
export async function isAgentAvailable(
  agentType: AgentType,
  customCommand?: string,
): Promise<boolean> {
  if (agentType === "none") {
    return false;
  }

  const command = customCommand || agentType;

  try {
    execSync(`which ${command}`, { stdio: "ignore" });
    return true;
  } catch {
    try {
      // On Windows, use 'where' instead of 'which'
      execSync(`where ${command}`, { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }
}

// Get handoff status message
export function getHandoffStatus(
  agentType: AgentType,
  isAvailable: boolean,
): string {
  if (agentType === "none") {
    return "No agent configured";
  }

  if (!isAvailable) {
    return `WARNING: ${agentType} not found in PATH`;
  }

  return `${agentType} available`;
}
