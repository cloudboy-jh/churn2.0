import React, { useState, useMemo, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import { colors, symbols } from "../theme.js";
import { Panel } from "./Panel.js";
import { AgentType, saveHandoffConfig, setOnboardingComplete } from "../engine/config.js";

interface AgentOnboardingProps {
  onComplete: (agent: AgentType) => void;
}

interface AgentOption {
  label: string;
  value: AgentType;
  description: string;
}

const AGENT_OPTIONS: AgentOption[] = [
  {
    label: "Claude Code",
    value: "claude",
    description: "AI coding assistant from Anthropic",
  },
  {
    label: "Cursor",
    value: "cursor",
    description: "AI-powered code editor",
  },
  {
    label: "Gemini CLI",
    value: "gemini",
    description: "Google's AI assistant",
  },
  {
    label: "Codex CLI",
    value: "codex",
    description: "OpenAI's coding assistant",
  },
  {
    label: "Droid",
    value: "droid",
    description: "Factory AI's agent",
  },
  {
    label: "Skip for now",
    value: "none",
    description: "Configure later in Settings",
  },
];

export function AgentOnboarding({ onComplete }: AgentOnboardingProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build select items
  const items = useMemo(
    () =>
      AGENT_OPTIONS.map((opt) => ({
        label: opt.label,
        value: opt.value,
      })),
    [],
  );

  // Handle selection
  const handleSelect = useCallback(
    async (item: { value: string }) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      setError(null);

      try {
        const agent = item.value as AgentType;

        // Save the configuration
        if (agent !== "none") {
          await saveHandoffConfig({ targetAgent: agent });
        }

        // Mark onboarding as complete (even if skipped)
        await setOnboardingComplete();

        // Notify parent
        onComplete(agent);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save configuration");
        setIsSubmitting(false);
      }
    },
    [onComplete, isSubmitting],
  );

  // Track selection for description display
  const handleHighlight = useCallback((item: { value: string }) => {
    const index = AGENT_OPTIONS.findIndex((opt) => opt.value === item.value);
    if (index !== -1) {
      setSelectedIndex(index);
    }
  }, []);

  // Global exit shortcut
  useInput((input) => {
    if (input === "z") {
      process.exit(0);
    }
  });

  const selectedOption = AGENT_OPTIONS[selectedIndex];

  return (
    <Box flexDirection="column" padding={1}>
      {/* Welcome header */}
      <Box marginBottom={1}>
        <Text color={colors.primary} bold>
          Welcome to Churn!
        </Text>
      </Box>

      {/* Description */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color={colors.text}>
          Churn analyzes your codebase and generates findings that can be passed
        </Text>
        <Text color={colors.text}>
          directly to AI coding agents like Claude Code, Cursor, and others.
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color={colors.gray}>
          Would you like to configure an agent for automatic handoff?
        </Text>
      </Box>

      {/* Agent selection */}
      <Panel title="Select Agent" borderColor={colors.primary}>
        <Box flexDirection="column">
          <SelectInput
            items={items}
            onSelect={handleSelect}
            onHighlight={handleHighlight}
            indicatorComponent={({ isSelected }) => (
              <Text color={isSelected ? colors.primary : colors.gray}>
                {isSelected ? symbols.pointer : " "}{" "}
              </Text>
            )}
            itemComponent={({ isSelected, label }) => (
              <Text color={isSelected ? colors.primary : colors.text}>
                {label}
              </Text>
            )}
          />

          {/* Show description of selected item */}
          <Box marginTop={1} paddingTop={1} borderStyle="single" borderTop borderColor={colors.gray}>
            <Text color={colors.gray}>{selectedOption.description}</Text>
          </Box>
        </Box>
      </Panel>

      {/* Navigation help */}
      <Box marginTop={1}>
        <Text color={colors.gray}>
          {symbols.arrowUp}
          {symbols.arrowDown} Navigate {symbols.bullet} Enter Select
        </Text>
      </Box>

      {isSubmitting && (
        <Box marginTop={1}>
          <Text color={colors.info}>Saving configuration...</Text>
        </Box>
      )}

      {error && (
        <Box marginTop={1}>
          <Text color={colors.error}>{symbols.cross} Error: {error}</Text>
        </Box>
      )}
    </Box>
  );
}
