import React from "react";
import { Text, Box, useInput } from "ink";
import { useScreenSize } from "fullscreen-ink";
import { colors, symbols, getSeverityColor } from "../theme.js";
import { FileSuggestion } from "../engine/analysis.js";

interface FindingDetailProps {
  finding: FileSuggestion;
  isIncluded: boolean;
  currentIndex: number;
  totalCount: number;
  onToggleInclude: () => void;
  onClose: () => void;
}

// Helper to truncate text to fit width
function truncateText(text: string, maxWidth: number): string {
  if (text.length <= maxWidth) return text;
  return text.substring(0, maxWidth - 3) + "...";
}

// Helper to wrap text into lines
function wrapText(text: string, maxWidth: number): string[] {
  if (maxWidth <= 0) return [text];
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (currentLine.length === 0) {
      currentLine = word;
    } else if (currentLine.length + 1 + word.length <= maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines.length > 0 ? lines : [""];
}

// Helper to truncate code blocks (show first N lines)
function truncateCode(
  code: string,
  maxLines: number,
  maxWidth: number,
): string {
  const lines = code.split("\n").slice(0, maxLines);
  const truncated = lines.map((line) =>
    line.length > maxWidth ? line.substring(0, maxWidth - 3) + "..." : line,
  );
  if (code.split("\n").length > maxLines) {
    truncated.push("...");
  }
  return truncated.join("\n");
}

export function FindingDetail({
  finding,
  isIncluded,
  currentIndex,
  totalCount,
  onToggleInclude,
  onClose,
}: FindingDetailProps) {
  const { width: terminalWidth, height: terminalHeight } = useScreenSize();

  // Calculate content width (account for borders and padding)
  const contentWidth = Math.max(40, terminalWidth - 8);
  const codeMaxLines = Math.max(5, Math.floor((terminalHeight - 25) / 2));

  // Handle keyboard input
  useInput(
    (input, key) => {
      if (key.escape || input === "q" || input === "Q") {
        onClose();
      } else if (input === " ") {
        onToggleInclude();
      }
    },
    { isActive: true },
  );

  // Wrap description and suggestion text
  const wrappedDescription = wrapText(finding.description, contentWidth - 6);
  const wrappedSuggestion = wrapText(finding.suggestion, contentWidth - 8);

  const severityColor = getSeverityColor(finding.severity);

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Header with file info */}
      <Box marginBottom={1}>
        <Text color={colors.text} bold>
          {truncateText(finding.file, contentWidth - 20)}
        </Text>
        <Text color={colors.gray}>
          {" "}
          ({currentIndex + 1}/{totalCount})
        </Text>
      </Box>

      {/* Main card container */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={colors.secondary}
        paddingX={1}
        paddingY={1}
      >
        {/* Title */}
        <Box marginBottom={1}>
          <Text color={colors.primary} bold>
            {truncateText(finding.title, contentWidth - 6)}
          </Text>
        </Box>

        {/* Category & Severity & Include Status */}
        <Box marginBottom={1}>
          <Text color={colors.gray}>Category: </Text>
          <Text color={colors.text}>{finding.category}</Text>
          <Text color={colors.gray}> • Severity: </Text>
          <Text color={severityColor}>{finding.severity.toUpperCase()}</Text>
          <Text color={colors.gray}> • </Text>
          <Text color={isIncluded ? colors.success : colors.gray}>
            {isIncluded ? `${symbols.checkmark} Included` : "Excluded"}
          </Text>
        </Box>

        {/* Description */}
        <Box flexDirection="column" marginBottom={1}>
          <Text color={colors.gray} dimColor>
            Description:
          </Text>
          {wrappedDescription.map((line, i) => (
            <Text key={i} color={colors.text}>
              {line}
            </Text>
          ))}
        </Box>

        {/* Suggestion */}
        <Box flexDirection="column" marginBottom={1}>
          <Text color={colors.gray} dimColor>
            Suggestion:
          </Text>
          {wrappedSuggestion.map((line, i) => (
            <Text key={i} color={colors.text}>
              {line}
            </Text>
          ))}
        </Box>

        {/* Code blocks */}
        {finding.code && (
          <Box flexDirection="column">
            {/* Before block */}
            <Box flexDirection="column" marginBottom={1}>
              <Text color={colors.error} bold>
                Before:
              </Text>
              <Box
                borderStyle="single"
                borderColor={colors.error}
                paddingX={1}
                marginTop={1}
              >
                <Text color={colors.gray}>
                  {truncateCode(
                    finding.code.before,
                    codeMaxLines,
                    contentWidth - 10,
                  )}
                </Text>
              </Box>
            </Box>

            {/* After block */}
            <Box flexDirection="column">
              <Text color={colors.success} bold>
                After:
              </Text>
              <Box
                borderStyle="single"
                borderColor={colors.success}
                paddingX={1}
                marginTop={1}
              >
                <Text color={colors.success}>
                  {truncateCode(
                    finding.code.after,
                    codeMaxLines,
                    contentWidth - 10,
                  )}
                </Text>
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      {/* Navigation help */}
      <Box marginTop={1}>
        <Text color={colors.gray}>Space Toggle Include • Esc/Q Back</Text>
      </Box>
    </Box>
  );
}
