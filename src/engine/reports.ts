import fs from "fs-extra";
import path from "path";
import { AnalysisResult, FileSuggestion } from "./analysis.js";
import { getRepoInfo } from "./git.js";

export interface ChurnReport {
  version: string;
  repository: {
    name: string;
    branch: string;
    path: string;
    remote?: string;
  };
  analysis: AnalysisResult;
  generatedAt: string;
}

// Generate churn-reports.json
export async function generateReport(
  analysis: AnalysisResult,
  cwd: string = process.cwd(),
): Promise<ChurnReport> {
  const repoInfo = await getRepoInfo(cwd);

  const report: ChurnReport = {
    version: "2.0.0",
    repository: {
      name: repoInfo?.name || path.basename(cwd),
      branch: repoInfo?.branch || "unknown",
      path: cwd,
      remote: repoInfo?.remote,
    },
    analysis,
    generatedAt: new Date().toISOString(),
  };

  return report;
}

// Save report to .churn/reports/churn-reports.json
export async function saveReport(
  report: ChurnReport,
  cwd: string = process.cwd(),
): Promise<string> {
  const reportsDir = path.join(cwd, ".churn", "reports");
  await fs.ensureDir(reportsDir);

  const reportPath = path.join(reportsDir, "churn-reports.json");
  await fs.writeJSON(reportPath, report, { spaces: 2 });

  return reportPath;
}

// Load the last report
export async function loadLastReport(
  cwd: string = process.cwd(),
): Promise<ChurnReport | null> {
  const reportPath = path.join(cwd, ".churn", "reports", "churn-reports.json");

  if (await fs.pathExists(reportPath)) {
    return await fs.readJSON(reportPath);
  }

  return null;
}

// Export suggestions to a specific file
export async function exportSuggestions(
  suggestions: FileSuggestion[],
  format: "json" | "markdown",
  outputPath: string,
): Promise<void> {
  if (format === "json") {
    await fs.writeJSON(outputPath, suggestions, { spaces: 2 });
  } else {
    const markdown = generateMarkdownReport(suggestions);
    await fs.writeFile(outputPath, markdown, "utf-8");
  }
}

// Generate markdown report
function generateMarkdownReport(suggestions: FileSuggestion[]): string {
  let md = "# Churn Analysis Report\n\n";
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += `Total Suggestions: ${suggestions.length}\n\n`;

  // Group by file
  const byFile = new Map<string, FileSuggestion[]>();
  for (const suggestion of suggestions) {
    const existing = byFile.get(suggestion.file) || [];
    existing.push(suggestion);
    byFile.set(suggestion.file, existing);
  }

  for (const [file, fileSuggestions] of byFile.entries()) {
    md += `## ${file}\n\n`;

    for (const suggestion of fileSuggestions) {
      md += `### ${suggestion.title}\n\n`;
      md += `**Category**: ${suggestion.category}  \n`;
      md += `**Severity**: ${suggestion.severity}\n\n`;
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

// Generate patch file from suggestions
export async function generatePatch(
  suggestions: FileSuggestion[],
  outputPath: string,
  cwd: string = process.cwd(),
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

// Format report summary for display
export function formatSummary(analysis: AnalysisResult): string {
  const { summary } = analysis;

  let output = "";
  output += `Files Analyzed: ${summary.filesAnalyzed}\n`;
  output += `Suggestions: ${summary.suggestions}\n`;
  output += `Duration: ${(summary.duration / 1000).toFixed(2)}s\n`;
  output += "\nCategories:\n";

  for (const [category, count] of Object.entries(summary.categories)) {
    output += `  ${category}: ${count}\n`;
  }

  return output;
}

// Get report statistics
export function getReportStats(report: ChurnReport) {
  const { analysis } = report;

  const severityCounts = {
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const suggestion of analysis.suggestions) {
    severityCounts[suggestion.severity]++;
  }

  return {
    totalSuggestions: analysis.suggestions.length,
    filesAnalyzed: analysis.summary.filesAnalyzed,
    categories: analysis.summary.categories,
    severities: severityCounts,
    duration: analysis.summary.duration,
  };
}

// Get most recent exported files from patches directory
export async function getMostRecentExport(
  cwd: string = process.cwd(),
): Promise<{ md: string; json: string; patch?: string } | null> {
  const patchesDir = path.join(cwd, ".churn", "patches");

  if (!(await fs.pathExists(patchesDir))) {
    return null;
  }

  const files = await fs.readdir(patchesDir);

  // Find most recent files by timestamp
  const mdFiles = files.filter(
    (f) => f.startsWith("report-") && f.endsWith(".md"),
  );
  const jsonFiles = files.filter(
    (f) => f.startsWith("suggestions-") && f.endsWith(".json"),
  );
  const patchFiles = files.filter(
    (f) => f.startsWith("changes-") && f.endsWith(".patch"),
  );

  if (mdFiles.length === 0 || jsonFiles.length === 0) {
    return null;
  }

  // Get most recent of each type
  const latestMd = mdFiles.sort().reverse()[0];
  const latestJson = jsonFiles.sort().reverse()[0];
  const latestPatch =
    patchFiles.length > 0 ? patchFiles.sort().reverse()[0] : undefined;

  return {
    md: path.join(patchesDir, latestMd),
    json: path.join(patchesDir, latestJson),
    patch: latestPatch ? path.join(patchesDir, latestPatch) : undefined,
  };
}
