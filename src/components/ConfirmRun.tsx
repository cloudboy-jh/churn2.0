import React from "react";
import { Text, Box, useInput } from "ink";
import { theme, symbols } from "../theme.js";
import { ModelConfig } from "../engine/models.js";
import { AnalysisContext } from "../engine/analysis.js";

interface ConfirmRunProps {
  modelConfig: ModelConfig;
  context: AnalysisContext;
  repoSummary: string;
  fileCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmRun({
  modelConfig,
  context,
  repoSummary,
  fileCount,
  onConfirm,
  onCancel,
}: ConfirmRunProps) {
  useInput((input, key) => {
    if (input === "z") {
      process.exit(0);
    } else if (key.return) {
      onConfirm();
    } else if (key.escape) {
      onCancel();
    }
  });

  const getModeLabel = (ctx: AnalysisContext): string => {
    switch (ctx.mode) {
      case "staged":
        return "Staged files only";
      case "files":
        return `Specific files: ${ctx.files?.join(", ") || ""}`;
      case "full":
      default:
        return "Full repository scan";
    }
  };

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text color="#ff6f54" bold>
          Ready to Analyze
        </Text>
      </Box>

      <Box
        flexDirection="column"
        marginBottom={2}
        paddingX={2}
        paddingY={1}
        borderStyle="single"
        borderColor="#ff9b85"
      >
        <Box marginBottom={1}>
          <Text color="#f2e9e4">
            Repository: <Text color="#ff6f54">{repoSummary}</Text>
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text color="#f2e9e4">
            Files to analyze: <Text color="#ff6f54">{fileCount}</Text>
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text color="#f2e9e4">
            Mode: <Text color="#ff6f54">{getModeLabel(context)}</Text>
          </Text>
        </Box>

        <Box>
          <Text color="#f2e9e4">
            Model:{" "}
            <Text color="#ff6f54">
              {modelConfig.provider}/{modelConfig.model}
            </Text>
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={1}>
          <Text>
            <Text color="#ff6f54">{symbols.pointer} </Text>
            <Text color="#f2e9e4">Press Enter to start analysis</Text>
          </Text>
        </Box>

        <Box>
          <Text>
            <Text color="#a6adc8">{symbols.pointer} </Text>
            <Text color="#a6adc8">Press Esc to cancel</Text>
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
