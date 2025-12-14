import React, { useMemo, useCallback } from "react";
import { Text, Box, useInput } from "ink";
import { useScreenSize } from "fullscreen-ink";
import {
  colors,
  symbols,
  progress,
  severityColors,
  getCategoryLabel,
  formatDuration,
} from "../theme.js";
import { AnalysisResult, FileSuggestion } from "../engine/analysis.js";
import { Panel } from "./Panel.js";

interface AnalysisSummaryProps {
  result: AnalysisResult;
  onPassFindings: (findings: FileSuggestion[], severity: "high" | "medium" | "all") => void;
  onReview: () => void;
  onExportOnly: (findings: FileSuggestion[]) => void;
  onBack: () => void;
}

interface SeverityBreakdown {
  severity: "high" | "medium" | "low";
  count: number;
  findings: FileSuggestion[];
  categories: { category: string; count: number }[];
}

// Group findings by severity and then by category
function buildSeverityBreakdown(suggestions: FileSuggestion[]): SeverityBreakdown[] {
  const severities: ("high" | "medium" | "low")[] = ["high", "medium", "low"];
  
  return severities.map((severity) => {
    const findings = suggestions.filter((s) => s.severity === severity);
    
    // Group by category
    const categoryMap = new Map<string, number>();
    for (const finding of findings) {
      const count = categoryMap.get(finding.category) || 0;
      categoryMap.set(finding.category, count + 1);
    }
    
    // Sort categories by count descending
    const categories = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
    
    return {
      severity,
      count: findings.length,
      findings,
      categories,
    };
  });
}

// Render a simple progress bar
function renderProgressBar(count: number, total: number, width: number): string {
  if (total === 0) return progress.empty.repeat(width);
  const filled = Math.round((count / total) * width);
  return progress.filled.repeat(filled) + progress.empty.repeat(width - filled);
}

// Get color for severity
function getSeverityColorValue(severity: "high" | "medium" | "low"): string {
  return severityColors[severity];
}

export function AnalysisSummary({
  result,
  onPassFindings,
  onReview,
  onExportOnly,
  onBack,
}: AnalysisSummaryProps) {
  const { width: terminalWidth } = useScreenSize();
  const { summary, suggestions } = result;

  // Build severity breakdown
  const breakdowns = useMemo(() => buildSeverityBreakdown(suggestions), [suggestions]);

  // Calculate counts for action labels
  const highCount = breakdowns[0].count;
  const highMedCount = breakdowns[0].count + breakdowns[1].count;
  const allCount = suggestions.length;

  // Progress bar width (account for label and padding)
  const barWidth = Math.min(30, Math.max(15, terminalWidth - 50));

  // Handle keyboard input
  const handleInput = useCallback(
    (input: string, key: { escape?: boolean }) => {
      const lowerInput = input.toLowerCase();

      if (lowerInput === "h") {
        // Pass HIGH only
        const highFindings = suggestions.filter((s) => s.severity === "high");
        onPassFindings(highFindings, "high");
      } else if (lowerInput === "m") {
        // Pass HIGH + MEDIUM
        const highMedFindings = suggestions.filter(
          (s) => s.severity === "high" || s.severity === "medium"
        );
        onPassFindings(highMedFindings, "medium");
      } else if (lowerInput === "a") {
        // Pass ALL
        onPassFindings(suggestions, "all");
      } else if (lowerInput === "r") {
        // Review first
        onReview();
      } else if (lowerInput === "e") {
        // Export only
        onExportOnly(suggestions);
      } else if (key.escape || lowerInput === "q") {
        // Back
        onBack();
      }
    },
    [suggestions, onPassFindings, onReview, onExportOnly, onBack]
  );

  useInput(handleInput);

  // Format cost
  const costDisplay = summary.estimatedCost > 0 
    ? `$${summary.estimatedCost.toFixed(2)}`
    : "Free";

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text color={colors.success}>{symbols.checkmark} </Text>
        <Text color={colors.text} bold>
          Analysis Complete
        </Text>
      </Box>

      {/* Summary stats line */}
      <Box marginBottom={1}>
        <Text color={colors.gray}>
          {summary.filesAnalyzed} files analyzed {symbols.bullet}{" "}
          {summary.suggestions} findings {symbols.bullet}{" "}
          {formatDuration(summary.duration)} {symbols.bullet}{" "}
          {costDisplay}
        </Text>
      </Box>

      {/* Severity breakdown panel */}
      <Panel borderColor={colors.secondary}>
        <Box flexDirection="column">
          {breakdowns.map((breakdown, idx) => (
            <Box key={breakdown.severity} flexDirection="column" marginBottom={idx < 2 ? 1 : 0}>
              {/* Severity header with progress bar */}
              <Box>
                <Text color={getSeverityColorValue(breakdown.severity)} bold>
                  {breakdown.severity.toUpperCase()} ({breakdown.count})
                </Text>
                <Text color={colors.gray}> </Text>
                <Text color={getSeverityColorValue(breakdown.severity)}>
                  {renderProgressBar(breakdown.count, allCount, barWidth)}
                </Text>
              </Box>

              {/* Category breakdown (top 4) */}
              {breakdown.categories.slice(0, 4).map((cat) => (
                <Box key={cat.category} paddingLeft={2}>
                  <Text color={colors.gray}>
                    {symbols.bullet} {cat.count} {getCategoryLabel(cat.category, cat.count)}
                  </Text>
                </Box>
              ))}

              {/* Show "+N more" if there are more categories */}
              {breakdown.categories.length > 4 && (
                <Box paddingLeft={2}>
                  <Text color={colors.gray} dimColor>
                    {symbols.bullet} +{breakdown.categories.length - 4} more categories
                  </Text>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </Panel>

      {/* Action keys */}
      <Box flexDirection="column" marginTop={1}>
        <Box>
          <Box width={28}>
            <Text color={colors.primary}>[H]</Text>
            <Text color={colors.text}> Pass HIGH ({highCount})</Text>
          </Box>
          <Box>
            <Text color={colors.primary}>[R]</Text>
            <Text color={colors.text}> Review first</Text>
          </Box>
        </Box>
        <Box>
          <Box width={28}>
            <Text color={colors.primary}>[M]</Text>
            <Text color={colors.text}> Pass HIGH+MED ({highMedCount})</Text>
          </Box>
          <Box>
            <Text color={colors.primary}>[E]</Text>
            <Text color={colors.text}> Export only</Text>
          </Box>
        </Box>
        <Box>
          <Box width={28}>
            <Text color={colors.primary}>[A]</Text>
            <Text color={colors.text}> Pass ALL ({allCount})</Text>
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box marginTop={1}>
        <Text color={colors.gray} dimColor>
          Report saved to .churn/reports/
        </Text>
      </Box>

      {/* Navigation help */}
      <Box marginTop={1}>
        <Text color={colors.gray}>
          Esc/Q Back to menu
        </Text>
      </Box>
    </Box>
  );
}
