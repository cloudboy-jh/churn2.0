import React, { useCallback, useMemo } from "react";
import { Text, Box, useInput, Key } from "ink";
import { theme, symbols, colors } from "../theme.js";
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

interface InfoRowProps {
  label: string;
  value: string;
}

// Extracted component for info rows
const InfoRow = React.memo(({ label, value }: InfoRowProps) => (
  <Box marginBottom={1}>
    <Text color={colors.text}>
      {label}: <Text color={colors.primary}>{value}</Text>
    </Text>
  </Box>
));

export function ConfirmRun({
  modelConfig,
  context,
  repoSummary,
  fileCount,
  onConfirm,
  onCancel,
}: ConfirmRunProps) {
  // Memoize input handler
  const handleInput = useCallback(
    (input: string, key: Key) => {
      if (input === "z") {
        process.exit(0);
      } else if (key.return) {
        onConfirm();
      } else if (key.escape) {
        onCancel();
      }
    },
    [onConfirm, onCancel],
  );

  useInput(handleInput);

  // Memoize mode label calculation
  const modeLabel = useMemo(() => {
    switch (context.mode) {
      case "staged":
        return "Staged files only";
      case "files":
        return `Specific files: ${context.files?.join(", ") || ""}`;
      case "full":
      default:
        return "Full repository scan";
    }
  }, [context.mode, context.files]);

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text color={colors.primary} bold>
          Ready to Analyze
        </Text>
      </Box>

      <Box
        flexDirection="column"
        marginBottom={2}
        paddingX={2}
        paddingY={1}
        borderStyle="single"
        borderColor={colors.secondary}
      >
        <InfoRow label="Repository" value={repoSummary} />
        <InfoRow label="Files to analyze" value={String(fileCount)} />
        <InfoRow label="Mode" value={modeLabel} />
        <Box>
          <Text color={colors.text}>
            Model:{" "}
            <Text color={colors.primary}>
              {modelConfig.provider}/{modelConfig.model}
            </Text>
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={1}>
          <Text>
            <Text color={colors.primary}>{symbols.pointer} </Text>
            <Text color={colors.text}>Press Enter to start analysis</Text>
          </Text>
        </Box>

        <Box>
          <Text>
            <Text color={colors.gray}>{symbols.pointer} </Text>
            <Text color={colors.gray}>Press Esc to cancel</Text>
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
