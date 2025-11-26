import React, { useState, useCallback } from "react";
import { Text, Box, useInput } from "ink";
import { useScreenSize } from "fullscreen-ink";
import { theme, symbols } from "../theme.js";
import { AnalysisResult, FileSuggestion } from "../engine/analysis.js";
import { VirtualizedList, VirtualizedListItem } from "./VirtualizedList.js";

interface ReviewPanelProps {
  result: AnalysisResult;
  onComplete: (accepted: FileSuggestion[]) => void;
}

interface SuggestionItem extends VirtualizedListItem {
  suggestion: FileSuggestion;
  index: number;
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

export function ReviewPanel({ result, onComplete }: ReviewPanelProps) {
  const { width: terminalWidth, height: terminalHeight } = useScreenSize();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<number>>(
    new Set(),
  );
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  const suggestions = result.suggestions;
  const currentSuggestion = suggestions[currentIndex];
  const summary = result.summary;

  // Calculate content width (account for borders and padding)
  const contentWidth = Math.max(40, terminalWidth - 8);
  const codeMaxLines = Math.max(5, Math.floor((terminalHeight - 25) / 2));

  // Convert suggestions to list items
  const listItems: SuggestionItem[] = suggestions.map((suggestion, index) => ({
    key: `${suggestion.file}-${index}`,
    suggestion,
    index,
  }));

  // Handle view-specific inputs (global shortcuts like z, o, esc are handled by parent)
  useInput(
    (input, key) => {
      // Handle zero suggestions case - any key exits
      if (suggestions.length === 0) {
        onComplete([]);
        return;
      }

      if (viewMode === "list") {
        if (input === "s" || input === "S") {
          // Toggle summary
          setSummaryExpanded(!summaryExpanded);
        } else if (input === "a") {
          // Accept all
          const allIndices = new Set(suggestions.map((_, i) => i));
          setAcceptedSuggestions(allIndices);
        } else if (input === "n") {
          // Accept none
          setAcceptedSuggestions(new Set());
        } else if (input === "d") {
          // Done
          const accepted = suggestions.filter((_, i) =>
            acceptedSuggestions.has(i),
          );
          onComplete(accepted);
        } else if (input === " ") {
          // Toggle current item
          const newSet = new Set(acceptedSuggestions);
          if (newSet.has(currentIndex)) {
            newSet.delete(currentIndex);
          } else {
            newSet.add(currentIndex);
          }
          setAcceptedSuggestions(newSet);
        }
      } else if (viewMode === "detail") {
        if (key.escape || input === "q") {
          setViewMode("list");
        } else if (input === " ") {
          // Toggle acceptance
          const newSet = new Set(acceptedSuggestions);
          if (newSet.has(currentIndex)) {
            newSet.delete(currentIndex);
          } else {
            newSet.add(currentIndex);
          }
          setAcceptedSuggestions(newSet);
        }
      }
    },
    { isActive: true },
  );

  // Render a single suggestion item in the list
  const renderSuggestionItem = useCallback(
    (item: SuggestionItem, index: number, isSelected: boolean) => {
      const { suggestion } = item;
      const isAccepted = acceptedSuggestions.has(index);

      // Truncate title to fit terminal width
      const maxTitleLength = Math.max(30, terminalWidth - 10);
      const truncatedTitle = truncateText(suggestion.title, maxTitleLength);

      return (
        <Box flexDirection="column" marginBottom={0}>
          <Box>
            <Text color={isSelected ? "#ff6f54" : "#a6adc8"}>
              {isSelected ? symbols.pointer : " "}{" "}
            </Text>
            <Text color={isAccepted ? "#a6e3a1" : "#f2e9e4"}>
              {truncateText(suggestion.file, 40)}
            </Text>
            <Text color="#a6adc8"> • </Text>
            <Text color={getSeverityColor(suggestion.severity)}>
              {suggestion.severity}
            </Text>
            <Text color="#a6adc8"> • </Text>
            <Text color={isAccepted ? "#a6e3a1" : "#f2e9e4"}>
              {isAccepted ? symbols.tick : " "}
            </Text>
          </Box>
          <Box paddingLeft={3}>
            <Text color={isSelected ? "#f2e9e4" : "#a6adc8"}>
              {truncatedTitle}
            </Text>
          </Box>
        </Box>
      );
    },
    [acceptedSuggestions, terminalWidth],
  );

  if (suggestions.length === 0) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color="#a6e3a1">
            {symbols.tick} No findings - analysis complete!
          </Text>
        </Box>
        <Box>
          <Text color="#a6adc8">Press any key to continue...</Text>
        </Box>
      </Box>
    );
  }

  if (viewMode === "list") {
    // Calculate reserved lines based on summary expanded state
    const summaryLines = summaryExpanded ? 12 : 3;
    const reservedLines = summaryLines + 8;

    return (
      <Box flexDirection="column" paddingY={1}>
        {/* Collapsible Summary Section */}
        <Box
          flexDirection="column"
          marginBottom={1}
          borderStyle="single"
          borderColor={summaryExpanded ? "#ff9b85" : "#a6adc8"}
          paddingX={1}
        >
          {/* Summary Header - always visible */}
          <Box>
            <Text color="#ff6f54">{summaryExpanded ? "v" : ">"} </Text>
            <Text color="#f2e9e4" bold>
              Summary
            </Text>
            <Text color="#a6adc8">
              {" "}
              • {summary.filesAnalyzed} files • {summary.suggestions} findings •
              Press S to {summaryExpanded ? "collapse" : "expand"}
            </Text>
          </Box>

          {/* Expanded Summary Content */}
          {summaryExpanded && (
            <Box flexDirection="column" marginTop={1}>
              <Box>
                <Text color="#a6adc8">Duration: </Text>
                <Text color="#f2e9e4">{formatDuration(summary.duration)}</Text>
                {summary.cacheHits > 0 && (
                  <>
                    <Text color="#a6adc8"> • Cache hits: </Text>
                    <Text color="#a6e3a1">{summary.cacheHits}</Text>
                  </>
                )}
              </Box>

              {summary.tokensUsed > 0 && (
                <Box>
                  <Text color="#a6adc8">Tokens: </Text>
                  <Text color="#f2e9e4">
                    {summary.tokensUsed.toLocaleString()}
                  </Text>
                  {summary.estimatedCost > 0 && (
                    <>
                      <Text color="#a6adc8"> • Cost: </Text>
                      <Text color="#f9e2af">
                        ${summary.estimatedCost.toFixed(4)}
                      </Text>
                    </>
                  )}
                </Box>
              )}

              {/* Categories breakdown */}
              {Object.keys(summary.categories).length > 0 && (
                <Box flexDirection="column" marginTop={1}>
                  <Text color="#a6adc8">By category:</Text>
                  <Box flexWrap="wrap" marginTop={1}>
                    {Object.entries(summary.categories).map(
                      ([cat, count], i) => (
                        <Box key={cat} marginRight={2}>
                          <Text color="#f2e9e4">{cat}: </Text>
                          <Text color="#ff6f54">{count}</Text>
                        </Box>
                      ),
                    )}
                  </Box>
                </Box>
              )}

              {/* Severity breakdown */}
              <Box marginTop={1}>
                <Text color="#a6adc8">By severity: </Text>
                <Text color="#f38ba8">
                  High: {countBySeverity(suggestions, "high")}
                </Text>
                <Text color="#a6adc8"> • </Text>
                <Text color="#f9e2af">
                  Medium: {countBySeverity(suggestions, "medium")}
                </Text>
                <Text color="#a6adc8"> • </Text>
                <Text color="#a6adc8">
                  Low: {countBySeverity(suggestions, "low")}
                </Text>
              </Box>
            </Box>
          )}
        </Box>

        {/* Suggestions List */}
        <VirtualizedList
          items={listItems}
          renderItem={renderSuggestionItem}
          itemHeight={2}
          initialIndex={currentIndex}
          onSelectionChange={(index) => setCurrentIndex(index)}
          onSelect={() => setViewMode("detail")}
          isActive={viewMode === "list"}
          borderColor="#ff9b85"
          reservedLines={reservedLines}
          title={`Findings (${acceptedSuggestions.size}/${suggestions.length} accepted)`}
        />

        {/* Navigation help */}
        <Box marginTop={1}>
          <Text color="#a6adc8">
            {symbols.arrowUp}
            {symbols.arrowDown} Nav • Enter View • Space Toggle • S Summary • A
            All • N Clear • D Done
          </Text>
        </Box>
      </Box>
    );
  }

  // Detail view - with proper width constraints
  const wrappedDescription = wrapText(
    currentSuggestion.description,
    contentWidth - 6,
  );
  const wrappedSuggestion = wrapText(
    currentSuggestion.suggestion,
    contentWidth - 8,
  );

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Header with file info */}
      <Box marginBottom={1}>
        <Text color="#f2e9e4" bold>
          {truncateText(currentSuggestion.file, contentWidth - 20)}
        </Text>
        <Text color="#a6adc8">
          {" "}
          ({currentIndex + 1}/{suggestions.length})
        </Text>
      </Box>

      {/* Main card container */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="#ff9b85"
        paddingX={1}
        paddingY={1}
      >
        {/* Title */}
        <Box marginBottom={1}>
          <Text color="#ff6f54" bold>
            {truncateText(currentSuggestion.title, contentWidth - 6)}
          </Text>
        </Box>

        {/* Category & Severity */}
        <Box marginBottom={1}>
          <Text color="#a6adc8">Category: </Text>
          <Text color="#f2e9e4">{currentSuggestion.category}</Text>
          <Text color="#a6adc8"> • Severity: </Text>
          <Text color={getSeverityColor(currentSuggestion.severity)}>
            {currentSuggestion.severity}
          </Text>
          <Text color="#a6adc8"> • </Text>
          <Text
            color={
              acceptedSuggestions.has(currentIndex) ? "#a6e3a1" : "#a6adc8"
            }
          >
            {acceptedSuggestions.has(currentIndex)
              ? `${symbols.tick} Accepted`
              : "Not accepted"}
          </Text>
        </Box>

        {/* Description */}
        <Box flexDirection="column" marginBottom={1}>
          <Text color="#a6adc8" dimColor>
            Description:
          </Text>
          {wrappedDescription.map((line, i) => (
            <Text key={i} color="#f2e9e4">
              {line}
            </Text>
          ))}
        </Box>

        {/* Suggestion */}
        <Box flexDirection="column" marginBottom={1}>
          <Text color="#a6adc8" dimColor>
            Suggestion:
          </Text>
          {wrappedSuggestion.map((line, i) => (
            <Text key={i} color="#f2e9e4">
              {line}
            </Text>
          ))}
        </Box>

        {/* Code blocks */}
        {currentSuggestion.code && (
          <Box flexDirection="column">
            {/* Before block */}
            <Box flexDirection="column" marginBottom={1}>
              <Text color="#f38ba8" bold>
                Before:
              </Text>
              <Box
                borderStyle="single"
                borderColor="#f38ba8"
                paddingX={1}
                marginTop={1}
              >
                <Text color="#a6adc8">
                  {truncateCode(
                    currentSuggestion.code.before,
                    codeMaxLines,
                    contentWidth - 10,
                  )}
                </Text>
              </Box>
            </Box>

            {/* After block */}
            <Box flexDirection="column">
              <Text color="#a6e3a1" bold>
                After:
              </Text>
              <Box
                borderStyle="single"
                borderColor="#a6e3a1"
                paddingX={1}
                marginTop={1}
              >
                <Text color="#a6e3a1">
                  {truncateCode(
                    currentSuggestion.code.after,
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
        <Text color="#a6adc8">Space Toggle • Esc/Q Back to list</Text>
      </Box>
    </Box>
  );
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "high":
      return "#f38ba8";
    case "medium":
      return "#f9e2af";
    case "low":
      return "#a6adc8";
    default:
      return "#f2e9e4";
  }
}

function countBySeverity(
  suggestions: FileSuggestion[],
  severity: string,
): number {
  return suggestions.filter((s) => s.severity === severity).length;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}
