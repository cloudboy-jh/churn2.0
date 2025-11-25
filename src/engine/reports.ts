import fs from "fs-extra";
import path from "path";
import { AnalysisResult, FileSuggestion } from "./analysis.js";
import { getRepoInfo } from "./git.js";
import { getInsightsConfig } from "./config.js";
import {
  analyzeDependencies,
  DependencyAnalysisResult,
} from "./dependencies.js";
import { analyzeCodeAge, CodeAgeResult } from "./codeage.js";

export interface ReportInsights {
  dependencies?: DependencyAnalysisResult;
  codeAge?: CodeAgeResult;
  generatedAt: string;
}

export interface ChurnReport {
  version: string;
  repository: {
    name: string;
    branch: string;
    path: string;
    remote?: string;
  };
  analysis: AnalysisResult;
  insights?: ReportInsights;
  generatedAt: string;
}

// Generate churn-reports.json
export async function generateReport(
  analysis: AnalysisResult,
  cwd: string = process.cwd(),
): Promise<ChurnReport> {
  const repoInfo = await getRepoInfo(cwd);
  const insightsConfig = await getInsightsConfig();

  // Build base report
  const report: ChurnReport = {
    version: "2.2.0",
    repository: {
      name: repoInfo?.name || path.basename(cwd),
      branch: repoInfo?.branch || "unknown",
      path: cwd,
      remote: repoInfo?.remote,
    },
    analysis,
    generatedAt: new Date().toISOString(),
  };

  // Run insights analyses in parallel if enabled
  const shouldRunDeps = insightsConfig.enableDependencyAnalysis;
  const shouldRunAge = insightsConfig.enableCodeAgeMetrics;

  if (shouldRunDeps || shouldRunAge) {
    const [depsResult, ageResult] = await Promise.all([
      shouldRunDeps ? analyzeDependencies(cwd) : Promise.resolve(null),
      shouldRunAge
        ? analyzeCodeAge(cwd, insightsConfig)
        : Promise.resolve(null),
    ]);

    // Only add insights if at least one analysis succeeded
    if (depsResult || ageResult) {
      report.insights = {
        dependencies: depsResult || undefined,
        codeAge: ageResult || undefined,
        generatedAt: new Date().toISOString(),
      };
    }
  }

  return report;
}

// Report retention settings
const REPORT_MAX_AGE_DAYS = 30;
const REPORT_MAX_COUNT = 20;

// Save report to .churn/reports/ with timestamp
export async function saveReport(
  report: ChurnReport,
  cwd: string = process.cwd(),
): Promise<string> {
  const reportsDir = path.join(cwd, ".churn", "reports");
  await fs.ensureDir(reportsDir);

  // Create timestamped filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(reportsDir, `report-${timestamp}.json`);
  await fs.writeJSON(reportPath, report, { spaces: 2 });

  // Also save as latest for quick access
  const latestPath = path.join(reportsDir, "latest.json");
  await fs.writeJSON(latestPath, report, { spaces: 2 });

  // Clean up old reports
  await cleanupOldReports(reportsDir);

  return reportPath;
}

// Clean up old reports based on age and count
async function cleanupOldReports(reportsDir: string): Promise<void> {
  try {
    const files = await fs.readdir(reportsDir);
    const reportFiles = files
      .filter((f) => f.startsWith("report-") && f.endsWith(".json"))
      .sort()
      .reverse(); // newest first

    const now = Date.now();
    const maxAge = REPORT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

    for (let i = 0; i < reportFiles.length; i++) {
      const filePath = path.join(reportsDir, reportFiles[i]);
      const stats = await fs.stat(filePath);
      const age = now - stats.mtimeMs;

      // Delete if over max count OR over max age
      if (i >= REPORT_MAX_COUNT || age > maxAge) {
        await fs.remove(filePath);
      }
    }
  } catch (error) {
    // Silently ignore cleanup errors
  }
}

// Load the last report
export async function loadLastReport(
  cwd: string = process.cwd(),
): Promise<ChurnReport | null> {
  const latestPath = path.join(cwd, ".churn", "reports", "latest.json");

  if (await fs.pathExists(latestPath)) {
    return await fs.readJSON(latestPath);
  }

  // Fallback to old path for backwards compatibility
  const oldPath = path.join(cwd, ".churn", "reports", "churn-reports.json");
  if (await fs.pathExists(oldPath)) {
    return await fs.readJSON(oldPath);
  }

  return null;
}

// Load all reports (for history view)
export async function loadAllReports(
  cwd: string = process.cwd(),
): Promise<{ path: string; report: ChurnReport; date: Date }[]> {
  const reportsDir = path.join(cwd, ".churn", "reports");

  if (!(await fs.pathExists(reportsDir))) {
    return [];
  }

  const files = await fs.readdir(reportsDir);
  const reportFiles = files
    .filter((f) => f.startsWith("report-") && f.endsWith(".json"))
    .sort()
    .reverse();

  const reports: { path: string; report: ChurnReport; date: Date }[] = [];

  for (const file of reportFiles) {
    try {
      const filePath = path.join(reportsDir, file);
      const report = await fs.readJSON(filePath);
      const stats = await fs.stat(filePath);
      reports.push({
        path: filePath,
        report,
        date: stats.mtime,
      });
    } catch {
      // Skip corrupted files
    }
  }

  return reports;
}

// Export suggestions to a specific file
export async function exportSuggestions(
  suggestions: FileSuggestion[],
  format: "json" | "markdown",
  outputPath: string,
  insights?: ReportInsights,
): Promise<void> {
  if (format === "json") {
    await fs.writeJSON(outputPath, suggestions, { spaces: 2 });
  } else {
    const markdown = generateMarkdownReport(suggestions, insights);
    await fs.writeFile(outputPath, markdown, "utf-8");
  }
}

// Generate markdown report
function generateMarkdownReport(
  suggestions: FileSuggestion[],
  insights?: ReportInsights,
): string {
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

  // Add insights sections
  if (insights) {
    if (insights.dependencies) {
      md += generateDependencySection(insights.dependencies);
    }
    if (insights.codeAge) {
      md += generateCodeAgeSection(insights.codeAge);
    }
  }

  return md;
}

// Generate dependency analysis markdown section
function generateDependencySection(deps: DependencyAnalysisResult): string {
  let md = "\n---\n\n## Dependency Analysis\n\n";

  md += "### Summary\n\n";
  md += `- **Total Declared**: ${deps.summary.totalDeclared}\n`;
  md += `- **Used**: ${deps.summary.totalUsed}\n`;
  md += `- **Unused**: ${deps.summary.totalUnused}\n`;
  md += `- **Dev Dependencies**: ${deps.summary.totalDevDependencies}\n\n`;

  if (deps.declaredUnused.length > 0) {
    md += "### Potentially Unused Dependencies\n\n";
    md +=
      "These dependencies are declared in package.json but no imports were found:\n\n";
    for (const dep of deps.declaredUnused.slice(0, 20)) {
      md += `- \`${dep}\`\n`;
    }
    if (deps.declaredUnused.length > 20) {
      md += `- ... and ${deps.declaredUnused.length - 20} more\n`;
    }
    md += "\n";
  }

  const missingDeps = deps.importedNotDeclared.filter(
    (i) => i.likely === "missing",
  );
  if (missingDeps.length > 0) {
    md += "### Missing Dependencies\n\n";
    md += "These imports were found but not declared in package.json:\n\n";
    for (const item of missingDeps.slice(0, 10)) {
      md += `- \`${item.import}\` (used in ${item.files.length} file${item.files.length > 1 ? "s" : ""})\n`;
    }
    if (missingDeps.length > 10) {
      md += `- ... and ${missingDeps.length - 10} more\n`;
    }
    md += "\n";
  }

  if (deps.used.length > 0) {
    md += "### Most Used Dependencies\n\n";
    for (const dep of deps.used.slice(0, 10)) {
      md += `- \`${dep.name}\` - ${dep.importCount} import${dep.importCount > 1 ? "s" : ""}\n`;
    }
    md += "\n";
  }

  return md;
}

// Generate code age metrics markdown section
function generateCodeAgeSection(age: CodeAgeResult): string {
  let md = "\n---\n\n## Code Age Metrics\n\n";

  md += "### Summary\n\n";
  md += `- **Average Code Age**: ${age.summary.avgCodeAgeDays} days\n`;
  md += `- **Oldest File**: ${age.summary.oldestFileDays} days\n`;
  md += `- **Newest File**: ${age.summary.newestFileDays} days\n`;
  md += `- **Orphaned Files**: ${age.summary.orphanedFileCount}\n\n`;

  if (age.hotZones.length > 0) {
    md += "### Hot Zones (Active Development)\n\n";
    md += "Directories with recent activity:\n\n";
    for (const zone of age.hotZones) {
      md += `- \`${zone.path}\` - ${zone.fileCount} file${zone.fileCount > 1 ? "s" : ""}, ${zone.recentCommitCount} recent commit${zone.recentCommitCount > 1 ? "s" : ""}, avg ${zone.avgAgeDays} days\n`;
    }
    md += "\n";
  }

  if (age.coldZones.length > 0) {
    md += "### Cold Zones (Potentially Stale)\n\n";
    md += "Directories with no recent activity:\n\n";
    for (const zone of age.coldZones) {
      md += `- \`${zone.path}\` - ${zone.fileCount} file${zone.fileCount > 1 ? "s" : ""}, avg ${zone.avgAgeDays} days old\n`;
    }
    md += "\n";
  }

  if (age.orphanedFiles.length > 0) {
    md += "### Potentially Orphaned Files\n\n";
    md += "Files that are old and not imported anywhere:\n\n";
    for (const file of age.orphanedFiles.slice(0, 10)) {
      md += `- \`${file.path}\` - ${file.ageDays} days old\n`;
    }
    if (age.orphanedFiles.length > 10) {
      md += `- ... and ${age.orphanedFiles.length - 10} more\n`;
    }
    md += "\n";
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
