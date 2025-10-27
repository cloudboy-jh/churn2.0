import React, { useState, useEffect } from "react";
import { Text, Box } from "ink";
import Spinner from "ink-spinner";
import { theme, createProgressBar, formatDuration, symbols } from "../theme.js";
import { ModelConfig } from "../engine/models.js";
import {
  runAnalysis,
  AnalysisContext,
  AnalysisResult,
  AnalysisProgress,
} from "../engine/analysis.js";
import { generateReport, saveReport } from "../engine/reports.js";

interface RunConsoleProps {
  modelConfig: ModelConfig;
  context: AnalysisContext;
  onComplete: (result: AnalysisResult) => void;
  concurrency?: number;
}

export function RunConsole({
  modelConfig,
  context,
  onComplete,
  concurrency,
}: RunConsoleProps) {
  const [progress, setProgress] = useState<AnalysisProgress>({
    phase: "scanning",
    current: 0,
    total: 0,
  });
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    runAnalysisProcess();
  }, []);

  // Live timer - updates every second
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

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

      // Generate and save report
      const report = await generateReport(analysisResult);
      await saveReport(report);

      setTimeout(() => onComplete(analysisResult), 1000);
    } catch (error) {
      console.error("Analysis failed:", error);
    }
  }

  const percent = progress.total > 0 ? progress.current / progress.total : 0;

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text color="#f2e9e4">
          Running Analysis
          <Text color="#a6adc8"> • </Text>
          <Text color="#8ab4f8">
            {modelConfig.provider}/{modelConfig.model}
          </Text>
        </Text>
      </Box>

      {/* Phase indicator */}
      <Box marginBottom={1}>
        <Text color="#ff6f54">
          {progress.phase === "complete" ? (
            symbols.tick
          ) : (
            <Spinner type="dots" />
          )}
        </Text>
        <Text color="#f2e9e4"> {getPhaseLabel(progress.phase)}</Text>
      </Box>

      {/* Progress bar */}
      {progress.total > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Box marginBottom={1}>
            <Text>{createProgressBar(percent, 50)}</Text>
          </Box>
          <Box>
            <Text color="#a6adc8">
              {progress.current}/{progress.total} files
              {progress.inProgress !== undefined && progress.inProgress > 0 && (
                <Text color="#ff6f54">
                  {" "}
                  • {progress.inProgress} in progress
                </Text>
              )}
            </Text>
          </Box>
        </Box>
      )}

      {/* Currently analyzing (parallel batch) */}
      {progress.currentBatch && progress.currentBatch.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Box marginBottom={1}>
            <Text color="#a6adc8">
              Currently analyzing ({progress.inProgress} in progress):
            </Text>
          </Box>
          {progress.currentBatch.map((file, i) => (
            <Box key={i} paddingLeft={2}>
              <Text color="#f2e9e4">• {file}</Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Status message */}
      {progress.message && (
        <Box marginBottom={1}>
          <Text color="#a6adc8">{progress.message}</Text>
        </Box>
      )}

      {/* Elapsed time and ETA */}
      <Box marginBottom={1}>
        <Text color="#a6adc8">
          Elapsed: {formatDuration(elapsed)}
          {progress.avgTimePerFile !== undefined &&
            progress.avgTimePerFile > 0 && (
              <Text>
                {" "}
                • Avg: {formatDuration(progress.avgTimePerFile)}/file
              </Text>
            )}
          {progress.eta !== undefined && progress.eta > 0 && (
            <Text color="#8ab4f8"> • ETA: {formatDuration(progress.eta)}</Text>
          )}
        </Text>
      </Box>

      {/* Results summary */}
      {result && progress.phase === "complete" && (
        <Box
          flexDirection="column"
          marginTop={1}
          paddingTop={1}
          borderStyle="single"
          borderColor="#ff9b85"
        >
          <Box marginBottom={1}>
            <Text color="#ff6f54" bold>
              Analysis Complete
            </Text>
          </Box>

          <Box marginBottom={1}>
            <Text color="#f2e9e4">
              Files Analyzed:{" "}
              {theme.primary(result.summary.filesAnalyzed.toString())}
            </Text>
          </Box>

          <Box marginBottom={1}>
            <Text color="#f2e9e4">
              Suggestions:{" "}
              {theme.primary(result.summary.suggestions.toString())}
            </Text>
          </Box>

          <Box marginBottom={1}>
            <Text color="#f2e9e4">
              Duration: {theme.primary(formatDuration(result.summary.duration))}
            </Text>
          </Box>

          {/* Categories breakdown */}
          {Object.keys(result.summary.categories).length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Box marginBottom={1}>
                <Text color="#a6adc8">Categories:</Text>
              </Box>
              {Object.entries(result.summary.categories).map(
                ([category, count]) => (
                  <Box key={category} paddingLeft={2}>
                    <Text color="#f2e9e4">
                      {getCategoryIcon(category)} {category}:{" "}
                      {theme.primary(count.toString())}
                    </Text>
                  </Box>
                ),
              )}
            </Box>
          )}

          <Box marginTop={1}>
            <Text color="#a6adc8">
              Report saved to .churn/reports/churn-reports.json
            </Text>
          </Box>
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

function getCategoryIcon(category: string): string {
  return "•";
}
