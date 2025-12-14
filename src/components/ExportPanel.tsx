import React, { useState, useEffect, useCallback } from "react";
import { Text, Box, useInput } from "ink";
import Spinner from "ink-spinner";
import path from "path";
import { symbols, colors } from "../theme.js";
import { Panel } from "./Panel.js";
import { FileSuggestion } from "../engine/analysis.js";
import {
  exportSuggestions,
  generatePatch,
  loadLastReport,
  ReportInsights,
} from "../engine/reports.js";
import { getHandoffConfig, type AgentType } from "../engine/config.js";
import { isAgentAvailable } from "../engine/handoff.js";

export type ExportMode = "handoff" | "export-only";

interface ExportPanelProps {
  suggestions: FileSuggestion[];
  mode: ExportMode;
  onComplete: () => void;
  onHandoff?: (agentType: AgentType, files: string[]) => void;
  onConfigureHandoff?: () => void;
  onBackToSummary?: () => void;
  onReview?: () => void;
}

type ExportStatus =
  | "exporting"
  | "complete"
  | "handoff-prompt"
  | "no-agent"
  | "agent-unavailable"
  | "launching";

export function ExportPanel({
  suggestions,
  mode,
  onComplete,
  onHandoff,
  onConfigureHandoff,
  onBackToSummary,
  onReview,
}: ExportPanelProps) {
  const [status, setStatus] = useState<ExportStatus>("exporting");
  const [exportedFiles, setExportedFiles] = useState<string[]>([]);
  const [handoffAgent, setHandoffAgent] = useState<AgentType>("none");
  const [agentAvailable, setAgentAvailable] = useState(false);
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performExport = useCallback(async () => {
    const cwd = process.cwd();
    const patchesDir = path.join(cwd, ".churn", "patches");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    const files: string[] = [];

    try {
      // Load insights from the last report
      const lastReport = await loadLastReport(cwd);
      const insights: ReportInsights | undefined = lastReport?.insights;

      // Export as JSON
      const jsonPath = path.join(patchesDir, `suggestions-${timestamp}.json`);
      await exportSuggestions(suggestions, "json", jsonPath, insights);
      files.push(jsonPath);

      // Export as Markdown (includes insights sections)
      const mdPath = path.join(patchesDir, `report-${timestamp}.md`);
      await exportSuggestions(suggestions, "markdown", mdPath, insights);
      files.push(mdPath);

      // Generate patch file (if there are code changes)
      const hasCodeChanges = suggestions.some((s) => s.code);
      if (hasCodeChanges) {
        const patchPath = path.join(patchesDir, `changes-${timestamp}.patch`);
        await generatePatch(suggestions, patchPath, cwd);
        files.push(patchPath);
      }

      setExportedFiles(files);

      // Check handoff configuration
      const handoffConfig = await getHandoffConfig();
      setHandoffAgent(handoffConfig.targetAgent);
      setAutoLaunch(handoffConfig.autoLaunch);

      // Different flows based on mode
      if (mode === "export-only") {
        // Export-only: show files, wait for key press to return
        setStatus("complete");
      } else {
        // Handoff mode: check agent configuration
        if (handoffConfig.targetAgent === "none") {
          // No agent configured
          setStatus("no-agent");
        } else {
          // Check if agent is available
          const available = await isAgentAvailable(handoffConfig.targetAgent);
          setAgentAvailable(available);

          if (!available) {
            // Agent not available
            setStatus("agent-unavailable");
          } else if (handoffConfig.autoLaunch) {
            // Auto-launch enabled - go directly
            setStatus("launching");
            if (onHandoff) {
              onHandoff(handoffConfig.targetAgent, files);
            }
          } else {
            // Show confirmation prompt
            setStatus("handoff-prompt");
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
      setStatus("complete");
    }
  }, [suggestions, mode, onHandoff]);

  useEffect(() => {
    performExport();
  }, [performExport]);

  // Handle keyboard input based on status
  useInput((input, key) => {
    const lowerInput = input.toLowerCase();

    if (status === "complete" && mode === "export-only") {
      // Export-only mode: any key returns to summary
      if (onBackToSummary) {
        onBackToSummary();
      } else {
        onComplete();
      }
      return;
    }

    if (status === "handoff-prompt") {
      if (lowerInput === "y") {
        // User confirmed - launch agent
        if (onHandoff && handoffAgent !== "none") {
          setStatus("launching");
          onHandoff(handoffAgent, exportedFiles);
        }
      } else if (lowerInput === "n") {
        // User declined - back to summary
        if (onBackToSummary) {
          onBackToSummary();
        } else {
          onComplete();
        }
      } else if (lowerInput === "r") {
        // User wants to review first
        if (onReview) {
          onReview();
        }
      }
    }

    if (status === "no-agent") {
      if (lowerInput === "c") {
        // Configure agent
        if (onConfigureHandoff) {
          onConfigureHandoff();
        }
      } else if (lowerInput === "s") {
        // Skip - return to summary
        if (onBackToSummary) {
          onBackToSummary();
        } else {
          onComplete();
        }
      }
    }

    if (status === "agent-unavailable") {
      // Any key returns to summary
      if (onBackToSummary) {
        onBackToSummary();
      } else {
        onComplete();
      }
    }
  });

  // Exporting spinner
  if (status === "exporting") {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box>
          <Text color={colors.primary}>
            <Spinner type="dots" /> Exporting results...
          </Text>
        </Box>
      </Box>
    );
  }

  // Launching agent
  if (status === "launching") {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box>
          <Text color={colors.primary}>
            <Spinner type="dots" /> Launching {handoffAgent}...
          </Text>
        </Box>
      </Box>
    );
  }

  // No agent configured
  if (status === "no-agent") {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color={colors.success} bold>
            {symbols.checkmark} Export Complete
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Box marginBottom={1}>
            <Text color={colors.text}>Exported files:</Text>
          </Box>
          {exportedFiles.map((file, i) => (
            <Box key={i} paddingLeft={2}>
              <Text color={colors.primary}>{symbols.bullet} </Text>
              <Text color={colors.gray}>{path.relative(process.cwd(), file)}</Text>
            </Box>
          ))}
        </Box>

        <Box marginTop={1} marginBottom={1}>
          <Text color={colors.gray}>All files saved to .churn/patches/</Text>
        </Box>

        <Panel title="No agent configured" borderColor={colors.warning}>
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text color={colors.gray}>
                Would you like to configure an agent for automatic handoff?
              </Text>
            </Box>
            <Box paddingTop={1} borderStyle="single" borderTop borderColor={colors.gray}>
              <Text color={colors.text}>
                <Text color={colors.success} bold>[C]</Text> Configure agent{" "}
                <Text color={colors.gray} bold>[S]</Text> Skip
              </Text>
            </Box>
          </Box>
        </Panel>
      </Box>
    );
  }

  // Agent not available
  if (status === "agent-unavailable") {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color={colors.success} bold>
            {symbols.checkmark} Export Complete
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Box marginBottom={1}>
            <Text color={colors.text}>Exported files:</Text>
          </Box>
          {exportedFiles.map((file, i) => (
            <Box key={i} paddingLeft={2}>
              <Text color={colors.primary}>{symbols.bullet} </Text>
              <Text color={colors.gray}>{path.relative(process.cwd(), file)}</Text>
            </Box>
          ))}
        </Box>

        <Box marginTop={1} marginBottom={1}>
          <Text color={colors.gray}>All files saved to .churn/patches/</Text>
        </Box>

        <Panel title="Agent not available" borderColor={colors.error}>
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text color={colors.gray}>
                {handoffAgent} was not found in your PATH.
              </Text>
            </Box>
            <Box marginBottom={1}>
              <Text color={colors.gray}>
                You can manually run: {handoffAgent} --context .churn/patches/
              </Text>
            </Box>
            <Box paddingTop={1} borderStyle="single" borderTop borderColor={colors.gray}>
              <Text color={colors.gray}>Press any key to continue...</Text>
            </Box>
          </Box>
        </Panel>
      </Box>
    );
  }

  // Handoff confirmation prompt
  if (status === "handoff-prompt") {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color={colors.success} bold>
            {symbols.checkmark} Export Complete
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Box marginBottom={1}>
            <Text color={colors.text}>Exported files:</Text>
          </Box>
          {exportedFiles.map((file, i) => (
            <Box key={i} paddingLeft={2}>
              <Text color={colors.primary}>{symbols.bullet} </Text>
              <Text color={colors.gray}>{path.relative(process.cwd(), file)}</Text>
            </Box>
          ))}
        </Box>

        <Box marginTop={1} marginBottom={1}>
          <Text color={colors.gray}>All files saved to .churn/patches/</Text>
        </Box>

        <Panel
          title={`Pass ${suggestions.length} findings to ${handoffAgent}?`}
          borderColor={colors.primary}
        >
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text color={colors.gray}>
                Analysis results will be passed to {handoffAgent} for implementation.
              </Text>
            </Box>
            <Box paddingTop={1} borderStyle="single" borderTop borderColor={colors.gray}>
              <Text color={colors.text}>
                <Text color={colors.success} bold>[Y]</Text> Yes{" "}
                <Text color={colors.error} bold>[N]</Text> No{" "}
                <Text color={colors.info} bold>[R]</Text> Review first
              </Text>
            </Box>
          </Box>
        </Panel>
      </Box>
    );
  }

  // Export complete (export-only mode or fallback)
  return (
    <Box flexDirection="column" paddingY={1}>
      {error && (
        <Box marginBottom={1}>
          <Text color={colors.error}>{symbols.cross} Error: {error}</Text>
        </Box>
      )}

      <Box marginBottom={1}>
        <Text color={colors.success} bold>
          {symbols.checkmark} Export Complete
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={1}>
          <Text color={colors.text}>Exported files:</Text>
        </Box>
        {exportedFiles.map((file, i) => (
          <Box key={i} paddingLeft={2}>
            <Text color={colors.primary}>{symbols.bullet} </Text>
            <Text color={colors.gray}>{path.relative(process.cwd(), file)}</Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={1} marginBottom={1}>
        <Text color={colors.gray}>All files saved to .churn/patches/</Text>
      </Box>

      <Box marginTop={1}>
        <Text color={colors.gray}>Press any key to continue...</Text>
      </Box>
    </Box>
  );
}
