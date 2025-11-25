import React, { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";
import Spinner from "ink-spinner";
import path from "path";
import { theme, symbols, colors } from "../theme.js";
import { Panel } from "./Panel.js";
import { FileSuggestion } from "../engine/analysis.js";
import {
  exportSuggestions,
  generatePatch,
  loadLastReport,
  ReportInsights,
} from "../engine/reports.js";
import { getHandoffConfig, type AgentType } from "../engine/config.js";

interface ExportPanelProps {
  suggestions: FileSuggestion[];
  onComplete: () => void;
  onHandoff?: (agentType: AgentType, files: string[]) => void;
  onConfigureHandoff?: () => void;
}

export function ExportPanel({
  suggestions,
  onComplete,
  onHandoff,
  onConfigureHandoff,
}: ExportPanelProps) {
  const [status, setStatus] = useState<
    "exporting" | "complete" | "handoff-prompt"
  >("exporting");
  const [exportedFiles, setExportedFiles] = useState<string[]>([]);
  const [handoffAgent, setHandoffAgent] = useState<AgentType>("none");
  const [handoffEnabled, setHandoffEnabled] = useState(false);

  useEffect(() => {
    performExport();
  }, []);

  // Handle keyboard input for handoff prompt
  useInput((input, key) => {
    if (status !== "handoff-prompt") return;

    if (input === "y" || input === "Y") {
      // User wants to launch agent
      if (onHandoff && handoffAgent !== "none") {
        onHandoff(handoffAgent, exportedFiles);
      }
    } else if (input === "n" || input === "N") {
      // User declined handoff
      onComplete();
    } else if (input === "c" || input === "C") {
      // User wants to configure
      if (onConfigureHandoff) {
        onConfigureHandoff();
      }
    }
  });

  async function performExport() {
    const cwd = process.cwd();
    const patchesDir = path.join(cwd, ".churn", "patches");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    const files: string[] = [];

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
    setStatus("complete");

    // Check handoff configuration
    const handoffConfig = await getHandoffConfig();
    setHandoffAgent(handoffConfig.targetAgent);
    setHandoffEnabled(handoffConfig.enabled);

    // If handoff is enabled and agent is configured, show prompt
    if (
      handoffConfig.enabled &&
      handoffConfig.autoLaunch &&
      handoffConfig.targetAgent !== "none"
    ) {
      setTimeout(() => setStatus("handoff-prompt"), 1000);
    } else {
      setTimeout(() => onComplete(), 2000);
    }
  }

  if (status === "exporting") {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box>
          <Text color="#ff6f54">
            <Spinner type="dots" /> Exporting results...
          </Text>
        </Box>
      </Box>
    );
  }

  if (status === "handoff-prompt") {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color="#a6e3a1" bold>
            {symbols.tick} Export Complete
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Box marginBottom={1}>
            <Text color="#f2e9e4">Exported files:</Text>
          </Box>

          {exportedFiles.map((file, i) => (
            <Box key={i} paddingLeft={2}>
              <Text color="#ff6f54">{symbols.bullet} </Text>
              <Text color="#a6adc8">{path.relative(process.cwd(), file)}</Text>
            </Box>
          ))}
        </Box>

        <Box marginTop={1} marginBottom={1}>
          <Text color="#a6adc8">All files saved to .churn/patches/</Text>
        </Box>

        <Panel
          title={`Launch ${handoffAgent} now?`}
          borderColor={colors.primary}
        >
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text color="#a6adc8">
                Analysis results will be passed to {handoffAgent} for
                implementation.
              </Text>
            </Box>

            <Box
              paddingTop={1}
              borderStyle="single"
              borderTop
              borderColor={colors.gray}
            >
              <Text color="#f2e9e4">
                <Text color="#a6e3a1" bold>
                  [Y]
                </Text>{" "}
                Yes{" "}
                <Text color="#f38ba8" bold>
                  [N]
                </Text>{" "}
                No{" "}
                <Text color="#f9e2af" bold>
                  [C]
                </Text>{" "}
                Configure
              </Text>
            </Box>
          </Box>
        </Panel>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text color="#a6e3a1" bold>
          {symbols.tick} Export Complete
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={1}>
          <Text color="#f2e9e4">Exported files:</Text>
        </Box>

        {exportedFiles.map((file, i) => (
          <Box key={i} paddingLeft={2}>
            <Text color="#ff6f54">{symbols.bullet} </Text>
            <Text color="#a6adc8">{path.relative(process.cwd(), file)}</Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text color="#a6adc8">All files saved to .churn/patches/</Text>
      </Box>
    </Box>
  );
}
