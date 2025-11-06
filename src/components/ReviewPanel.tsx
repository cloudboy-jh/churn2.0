import React, { useState } from "react";
import { Text, Box, useInput } from "ink";
import { theme, symbols } from "../theme.js";
import { AnalysisResult, FileSuggestion } from "../engine/analysis.js";

interface ReviewPanelProps {
  result: AnalysisResult;
  onComplete: (accepted: FileSuggestion[]) => void;
}

export function ReviewPanel({ result, onComplete }: ReviewPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<number>>(
    new Set(),
  );
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");

  const suggestions = result.suggestions;
  const currentSuggestion = suggestions[currentIndex];

  useInput((input, key) => {
    // Handle zero suggestions case - any key exits
    if (suggestions.length === 0) {
      onComplete([]);
      return;
    }

    if (viewMode === "list") {
      if (key.upArrow) {
        setCurrentIndex(Math.max(0, currentIndex - 1));
      } else if (key.downArrow) {
        setCurrentIndex(Math.min(suggestions.length - 1, currentIndex + 1));
      } else if (key.return) {
        setViewMode("detail");
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
  });

  if (suggestions.length === 0) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color="#a6e3a1">
            {symbols.tick} No suggestions - code looks good!
          </Text>
        </Box>
        <Box>
          <Text color="#a6adc8">Press any key to continue...</Text>
        </Box>
      </Box>
    );
  }

  if (viewMode === "list") {
    // Calculate viewport window (show 10 items at a time)
    const windowSize = 10;
    const windowStart = Math.floor(currentIndex / windowSize) * windowSize;
    const windowEnd = Math.min(windowStart + windowSize, suggestions.length);
    const visibleSuggestions = suggestions.slice(windowStart, windowEnd);

    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color="#f2e9e4" bold>
            Review Suggestions ({acceptedSuggestions.size}/{suggestions.length}{" "}
            accepted)
          </Text>
        </Box>

        <Box
          flexDirection="column"
          marginBottom={1}
          paddingBottom={1}
          borderStyle="single"
          borderColor="#ff9b85"
        >
          {visibleSuggestions.map((suggestion, localIdx) => {
            const i = windowStart + localIdx;
            const isSelected = i === currentIndex;
            const isAccepted = acceptedSuggestions.has(i);

            return (
              <Box key={i} paddingX={1}>
                <Text color={isSelected ? "#ff6f54" : "#a6adc8"}>
                  {isSelected ? symbols.pointer : " "}
                </Text>
                <Text
                  color={
                    isAccepted ? "#a6e3a1" : isSelected ? "#ff6f54" : "#f2e9e4"
                  }
                >
                  {isAccepted ? symbols.tick : " "} {suggestion.file}
                </Text>
                <Text color="#a6adc8"> • </Text>
                <Text color={getSeverityColor(suggestion.severity)}>
                  {suggestion.severity}
                </Text>
                <Text color="#a6adc8"> • </Text>
                <Text color="#f2e9e4">{suggestion.title}</Text>
              </Box>
            );
          })}

          {/* Scroll indicator */}
          {suggestions.length > windowSize && (
            <Box paddingX={1} marginTop={1}>
              <Text color="#a6adc8">
                Showing {windowStart + 1}-{windowEnd} of {suggestions.length}
                {windowEnd < suggestions.length && " • Scroll down for more"}
              </Text>
            </Box>
          )}
        </Box>

        <Box flexDirection="column" marginTop={1}>
          <Box marginBottom={1}>
            <Text color="#a6adc8">Navigation:</Text>
          </Box>
          <Box paddingLeft={2}>
            <Text color="#f2e9e4">
              {symbols.arrowUp}
              {symbols.arrowDown} Navigate • Enter View • Space Toggle • A
              Accept All • N Clear • D Done
            </Text>
          </Box>
        </Box>
      </Box>
    );
  }

  // Detail view
  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text color="#f2e9e4" bold>
          {currentSuggestion.file} ({currentIndex + 1}/{suggestions.length})
        </Text>
      </Box>

      <Box
        flexDirection="column"
        marginBottom={1}
        paddingY={1}
        borderStyle="single"
        borderColor="#ff9b85"
      >
        <Box paddingX={1} marginBottom={1}>
          <Text color="#ff6f54" bold>
            {currentSuggestion.title}
          </Text>
        </Box>

        <Box paddingX={1} marginBottom={1}>
          <Text color="#a6adc8">Category: </Text>
          <Text color="#f2e9e4">{currentSuggestion.category}</Text>
          <Text color="#a6adc8"> • Severity: </Text>
          <Text color={getSeverityColor(currentSuggestion.severity)}>
            {currentSuggestion.severity}
          </Text>
        </Box>

        <Box paddingX={1} marginBottom={1}>
          <Text color="#f2e9e4">{currentSuggestion.description}</Text>
        </Box>

        <Box paddingX={1} marginBottom={1}>
          <Text color="#a6adc8">Suggestion:</Text>
        </Box>
        <Box paddingX={2} marginBottom={1}>
          <Text color="#f2e9e4">{currentSuggestion.suggestion}</Text>
        </Box>

        {currentSuggestion.code && (
          <Box flexDirection="column" paddingX={1}>
            <Box marginBottom={1}>
              <Text color="#f38ba8">Before:</Text>
            </Box>
            <Box paddingX={2} marginBottom={1}>
              <Text color="#a6adc8">{currentSuggestion.code.before}</Text>
            </Box>

            <Box marginBottom={1}>
              <Text color="#a6e3a1">After:</Text>
            </Box>
            <Box paddingX={2}>
              <Text color="#a6e3a1">{currentSuggestion.code.after}</Text>
            </Box>
          </Box>
        )}
      </Box>

      <Box marginTop={1}>
        <Text
          color={acceptedSuggestions.has(currentIndex) ? "#a6e3a1" : "#a6adc8"}
        >
          {acceptedSuggestions.has(currentIndex)
            ? `${symbols.tick} Accepted`
            : "Not accepted"}
        </Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Box marginBottom={1}>
          <Text color="#a6adc8">Actions:</Text>
        </Box>
        <Box paddingLeft={2}>
          <Text color="#f2e9e4">Space Toggle • Esc/Q Back to list</Text>
        </Box>
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
