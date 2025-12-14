import React, { useState, useEffect, useRef } from "react";
import { Text, Box, useInput } from "ink";
import Spinner from "ink-spinner";
import { useScreenSize } from "fullscreen-ink";
import {
  theme,
  createProgressBar,
  formatDuration,
  symbols,
  box,
  colors,
} from "../theme.js";
import { ModelConfig } from "../engine/models.js";
import {
  runAnalysis,
  AnalysisContext,
  AnalysisResult,
  AnalysisProgress,
} from "../engine/analysis.js";
import { generateReport, saveReport, ChurnReport } from "../engine/reports.js";

interface RunConsoleProps {
  modelConfig: ModelConfig;
  context: AnalysisContext;
  onComplete: (result: AnalysisResult) => void;
  concurrency?: number;
}

// Max files to show per folder group
const MAX_FILES_PER_GROUP = 5;

interface FolderGroup {
  folder: string;
  files: string[];
}

// Group files by their parent folder
function groupFilesByFolder(files: string[]): FolderGroup[] {
  const groups = new Map<string, string[]>();

  for (const file of files) {
    const lastSlash = file.lastIndexOf("/");
    const folder = lastSlash > 0 ? file.substring(0, lastSlash) : ".";
    const fileName = lastSlash > 0 ? file.substring(lastSlash + 1) : file;

    if (!groups.has(folder)) {
      groups.set(folder, []);
    }
    groups.get(folder)!.push(fileName);
  }

  return Array.from(groups.entries()).map(([folder, files]) => ({
    folder,
    files,
  }));
}

// Helper for dot-leader formatting (label ... value)
function formatStat(label: string, value: string, width: number): string {
  const dots = width - label.length - value.length - 2;
  return label + " " + ".".repeat(Math.max(1, dots)) + " " + value;
}

export function RunConsole({
  modelConfig,
  context,
  onComplete,
  concurrency,
}: RunConsoleProps) {
  const { width: terminalWidth, height: terminalHeight } = useScreenSize();
  const [progress, setProgress] = useState<AnalysisProgress>({
    phase: "scanning",
    current: 0,
    total: 0,
  });
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [report, setReport] = useState<ChurnReport | null>(null);
  const [waitingForConfirmation, setWaitingForConfirmation] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Folder groups for display
  const [folderGroups, setFolderGroups] = useState<FolderGroup[]>([]);
  const lastBatchRef = useRef<string[]>([]);

  // Calculate content width
  const contentWidth = Math.min(55, terminalWidth - 10);
  const innerWidth = contentWidth - 4; // Account for border + padding

  // Wait for user to press any key before transitioning to review
  useInput((input, key) => {
    if (waitingForConfirmation) {
      onComplete(result!);
    }
  });

  // Timer - updates every second
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  // Run analysis only once
  useEffect(() => {
    if (hasStarted) return;
    setHasStarted(true);

    async function runAnalysisProcess() {
      try {
        const analysisResult = await runAnalysis(
          context,
          modelConfig,
          (prog) => setProgress(prog),
          process.cwd(),
          concurrency,
        );

        setResult(analysisResult);

        // Generate and save report (includes insights)
        setGeneratingInsights(true);
        try {
          const generatedReport = await generateReport(analysisResult);
          setReport(generatedReport);
          await saveReport(generatedReport);
        } catch (reportError) {
          console.error("Failed to generate/save report:", reportError);
          // Continue even if report generation fails
        }
        setGeneratingInsights(false);

        // Wait for user confirmation instead of auto-transitioning
        setWaitingForConfirmation(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Analysis failed:", err);
        setError(message);
        // Show error state with a basic result
        setProgress({ phase: "complete", current: 0, total: 0 });
        setWaitingForConfirmation(true);
      }
    }

    runAnalysisProcess();
  }, [hasStarted, context, modelConfig, concurrency, onComplete]);

  // Group files by folder when batch changes
  useEffect(() => {
    const currentBatch = progress.currentBatch || [];

    // Update when batch changes
    if (JSON.stringify(currentBatch) !== JSON.stringify(lastBatchRef.current)) {
      lastBatchRef.current = currentBatch;
      const groups = groupFilesByFolder(currentBatch);
      setFolderGroups(groups);
    }
  }, [progress.currentBatch]);

  // Calculate how many batch items to show based on terminal height
  const maxBatchItems = Math.max(2, Math.min(5, terminalHeight - 22));

  // Create horizontal divider
  const divider =
    box.verticalRight +
    box.horizontal.repeat(contentWidth - 2) +
    box.verticalLeft;

  // Error view
  if (error) {
    return (
      <Box flexDirection="column" alignItems="center" paddingY={1}>
        <Box
          flexDirection="column"
          width={contentWidth}
          borderStyle="round"
          borderColor={colors.error}
          paddingX={1}
        >
          <Box justifyContent="center" marginBottom={1}>
            <Text color={colors.error} bold>
              {symbols.cross} Analysis Failed
            </Text>
          </Box>
          <Box justifyContent="center" marginBottom={1}>
            <Text color={colors.text}>{error}</Text>
          </Box>
          <Box justifyContent="center">
            <Text color={colors.gray}>Press any key to go back...</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  // In-progress view
  if (!result || progress.phase !== "complete") {
    return (
      <Box flexDirection="column" alignItems="center" paddingY={1}>
        <Box
          flexDirection="column"
          width={contentWidth}
          borderStyle="round"
          borderColor={colors.secondary}
          paddingX={1}
        >
          {/* Header */}
          <Box justifyContent="center" marginBottom={1}>
            <Text color={colors.text}>Running Analysis</Text>
            <Text color={colors.gray}> {symbols.bullet} </Text>
            <Text color={colors.primary}>
              {modelConfig.provider}/{modelConfig.model}
            </Text>
          </Box>

          {/* Divider */}
          <Box marginX={-1}>
            <Text color={colors.secondary}>{divider}</Text>
          </Box>

          {/* Phase indicator */}
          <Box marginTop={1} marginBottom={1}>
            <Text color={colors.primary}>
              <Spinner type="dots" />
            </Text>
            <Text color={colors.text}>
              {" "}
              {generatingInsights
                ? "Generating insights..."
                : getPhaseLabel(progress.phase)}
            </Text>
          </Box>

          {/* Progress bar */}
          {progress.total > 0 && (
            <Box marginBottom={1} justifyContent="center">
              <Text>
                {createProgressBar(
                  progress.current / progress.total,
                  innerWidth - 8,
                )}
              </Text>
              <Text color={colors.gray}>
                {" "}
                {Math.round((progress.current / progress.total) * 100)}%
              </Text>
            </Box>
          )}

          {/* Progress count */}
          {progress.total > 0 && (
            <Box justifyContent="center" marginBottom={1}>
              <Text color={colors.gray}>
                {progress.current}/{progress.total} files
              </Text>
              {progress.inProgress !== undefined && progress.inProgress > 0 && (
                <Text color={colors.primary}>
                  {" "}
                  {symbols.bullet} {progress.inProgress} in progress
                </Text>
              )}
            </Box>
          )}

          {/* Currently analyzing - all folder groups stacked */}
          {folderGroups.length > 0 && progress.phase !== "complete" && (
            <Box flexDirection="column" marginBottom={1}>
              {/* Divider */}
              <Box marginX={-1} marginBottom={1}>
                <Text color={colors.gray}>{divider}</Text>
              </Box>

              {/* All folder groups */}
              {folderGroups.slice(0, 3).map((group, groupIndex) => (
                <Box
                  key={group.folder}
                  flexDirection="column"
                  marginBottom={groupIndex < folderGroups.length - 1 ? 1 : 0}
                >
                  {/* Folder header */}
                  <Box marginBottom={0}>
                    <Text color={colors.primary} bold>
                      {truncatePath(group.folder, innerWidth - 8)}
                    </Text>
                    <Text color={colors.gray}> ({group.files.length})</Text>
                  </Box>

                  {/* Files in folder */}
                  <Box flexDirection="column" paddingLeft={1}>
                    {group.files
                      .slice(0, MAX_FILES_PER_GROUP)
                      .map((file, i) => (
                        <Box key={i}>
                          <Text color={colors.gray}>{symbols.bullet} </Text>
                          <Text color={colors.text}>
                            {truncatePath(file, innerWidth - 6)}
                          </Text>
                        </Box>
                      ))}
                    {group.files.length > MAX_FILES_PER_GROUP && (
                      <Box>
                        <Text color={colors.gray} dimColor>
                          {symbols.bullet} +
                          {group.files.length - MAX_FILES_PER_GROUP} more
                        </Text>
                      </Box>
                    )}
                  </Box>
                </Box>
              ))}

              {/* Show if more folder groups exist */}
              {folderGroups.length > 3 && (
                <Box marginTop={1}>
                  <Text color={colors.gray} dimColor>
                    +{folderGroups.length - 3} more folders...
                  </Text>
                </Box>
              )}
            </Box>
          )}

          {/* Timing stats */}
          <Box justifyContent="center">
            <Text color={colors.gray}>
              Elapsed: {formatDuration(elapsed)}
              {progress.avgTimePerFile !== undefined &&
                progress.avgTimePerFile > 0 && (
                  <Text>
                    {" "}
                    {symbols.bullet} Avg:{" "}
                    {formatDuration(progress.avgTimePerFile)}/file
                  </Text>
                )}
              {progress.eta !== undefined && progress.eta > 0 && (
                <Text color={colors.primary}>
                  {" "}
                  {symbols.bullet} ETA: {formatDuration(progress.eta)}
                </Text>
              )}
            </Text>
          </Box>
        </Box>
      </Box>
    );
  }

  // Completion view
  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      <Box
        flexDirection="column"
        width={contentWidth}
        borderStyle="round"
        borderColor={colors.success}
        paddingX={1}
      >
        {/* Header */}
        <Box justifyContent="center" marginBottom={1}>
          <Text color={colors.success} bold>
            {symbols.tick} Analysis Complete
          </Text>
        </Box>

        {/* Divider */}
        <Box marginX={-1}>
          <Text color={colors.success}>{divider}</Text>
        </Box>

        {/* Main stats */}
        <Box flexDirection="column" marginTop={1}>
          <Text color={colors.text}>
            {formatStat(
              "Files Analyzed",
              result.summary.filesAnalyzed.toString(),
              innerWidth,
            )}
          </Text>
          <Text color={colors.text}>
            {formatStat(
              "Suggestions",
              result.summary.suggestions.toString(),
              innerWidth,
            )}
          </Text>
          <Text color={colors.text}>
            {formatStat(
              "Duration",
              formatDuration(result.summary.duration),
              innerWidth,
            )}
          </Text>
          {result.summary.cacheHits > 0 && (
            <Text color={colors.text}>
              {formatStat(
                "Cache Hits",
                result.summary.cacheHits.toString(),
                innerWidth,
              )}
            </Text>
          )}
        </Box>

        {/* Token stats */}
        {result.summary.tokensUsed > 0 && (
          <>
            <Box marginX={-1} marginTop={1}>
              <Text color={colors.gray}>{divider}</Text>
            </Box>
            <Box flexDirection="column" marginTop={1}>
              <Text color={colors.text}>
                {formatStat(
                  "Tokens",
                  result.summary.tokensUsed.toLocaleString(),
                  innerWidth,
                )}
              </Text>
              {result.summary.estimatedCost > 0 && (
                <Text color={colors.text}>
                  {formatStat(
                    "Cost",
                    "$" + result.summary.estimatedCost.toFixed(4),
                    innerWidth,
                  )}
                </Text>
              )}
            </Box>
          </>
        )}

        {/* Categories */}
        {Object.keys(result.summary.categories).length > 0 && (
          <>
            <Box marginX={-1} marginTop={1}>
              <Text color={colors.gray}>{divider}</Text>
            </Box>
            <Box flexDirection="column" marginTop={1}>
              <Text color={colors.gray} bold>
                Categories
              </Text>
              {Object.entries(result.summary.categories).map(
                ([category, count]) => (
                  <Box key={category} paddingLeft={1}>
                    <Text color={colors.text}>
                      {formatStat(
                        symbols.bullet + " " + category,
                        count.toString(),
                        innerWidth - 2,
                      )}
                    </Text>
                  </Box>
                ),
              )}
            </Box>
          </>
        )}

        {/* Insights */}
        {report?.insights && (
          <>
            <Box marginX={-1} marginTop={1}>
              <Text color={colors.gray}>{divider}</Text>
            </Box>
            <Box flexDirection="column" marginTop={1}>
              <Text color={colors.gray} bold>
                Insights
              </Text>
              {report.insights.dependencies && (
                <Box paddingLeft={1}>
                  <Text color={colors.text}>
                    {symbols.bullet} Dependencies:{" "}
                    {report.insights.dependencies.summary.totalUsed} used,{" "}
                    {report.insights.dependencies.summary.totalUnused} unused
                  </Text>
                </Box>
              )}
              {report.insights.codeAge && (
                <Box paddingLeft={1}>
                  <Text color={colors.text}>
                    {symbols.bullet} Code Age:{" "}
                    {report.insights.codeAge.hotZones.length} hot,{" "}
                    {report.insights.codeAge.coldZones.length} cold
                  </Text>
                </Box>
              )}
              {report.insights.codeAge &&
                report.insights.codeAge.orphanedFiles.length > 0 && (
                  <Box paddingLeft={1}>
                    <Text color={colors.warning}>
                      {symbols.bullet} Orphaned:{" "}
                      {report.insights.codeAge.orphanedFiles.length} files
                    </Text>
                  </Box>
                )}
            </Box>
          </>
        )}

        {/* Report saved note */}
        <Box marginTop={1} justifyContent="center">
          <Text color={colors.gray} dimColor>
            Report saved to .churn/reports/
          </Text>
        </Box>
      </Box>

      {/* Press any key prompt - outside the box */}
      {waitingForConfirmation && (
        <Box marginTop={1}>
          <Text color={colors.primary}>Press any key to review...</Text>
        </Box>
      )}
    </Box>
  );
}

function getPhaseLabel(phase: AnalysisProgress["phase"]): string {
  switch (phase) {
    case "scanning":
      return "Scanning repository...";
    case "analyzing":
      return "Analyzing files...";
    case "generating":
      return "Generating report...";
    case "complete":
      return "Complete";
    default:
      return "Processing...";
  }
}

function truncatePath(path: string, maxLength: number): string {
  if (path.length <= maxLength) return path;
  return "..." + path.slice(-(maxLength - 3));
}
