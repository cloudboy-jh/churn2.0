import React, { useState, useEffect, useCallback } from "react";
import { Text, Box, useInput } from "ink";
import { theme, symbols, colors } from "../theme.js";
import { Panel } from "./Panel.js";
import {
  getHandoffConfig,
  saveHandoffConfig,
  type AgentType,
  type ContextFormat,
} from "../engine/config.js";

interface HandoffSettingsProps {
  onComplete: () => void;
  onCancel?: () => void;
}

const AGENTS: Array<{ value: AgentType; label: string; description: string }> =
  [
    {
      value: "none",
      label: "None",
      description: "No automatic handoff",
    },
    {
      value: "claude",
      label: "Claude Code",
      description: "Anthropic's Claude Code CLI",
    },
    {
      value: "droid",
      label: "Droid",
      description: "Factory AI's Droid CLI",
    },
    {
      value: "gemini",
      label: "Gemini CLI",
      description: "Google's Gemini CLI",
    },
    {
      value: "codex",
      label: "Codex",
      description: "OpenAI Codex CLI",
    },
    {
      value: "cursor",
      label: "Cursor",
      description: "Cursor AI editor",
    },
  ];

const CONTEXT_FORMATS: Array<{
  value: ContextFormat;
  label: string;
  description: string;
}> = [
  {
    value: "minimal",
    label: "Minimal",
    description: "Markdown report + JSON suggestions",
  },
  {
    value: "comprehensive",
    label: "Comprehensive",
    description: "MD + JSON + patch + metadata",
  },
];

export function HandoffSettings({
  onComplete,
  onCancel,
}: HandoffSettingsProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentType>("none");
  const [selectedFormat, setSelectedFormat] =
    useState<ContextFormat>("minimal");
  const [autoLaunch, setAutoLaunch] = useState(true);
  const [currentFocus, setCurrentFocus] = useState<"agent" | "format" | "save">(
    "agent",
  );
  const [agentIndex, setAgentIndex] = useState(0);
  const [formatIndex, setFormatIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentSettings();
  }, []);

  async function loadCurrentSettings() {
    try {
      const config = await getHandoffConfig();
      setSelectedAgent(config.targetAgent);
      setSelectedFormat(config.contextFormat);
      setAutoLaunch(config.autoLaunch);

      // Set initial indexes with bounds checking
      const agentIdx = AGENTS.findIndex((a) => a.value === config.targetAgent);
      const formatIdx = CONTEXT_FORMATS.findIndex((f) => f.value === config.contextFormat);

      setAgentIndex(agentIdx >= 0 ? agentIdx : 0);
      setFormatIndex(formatIdx >= 0 ? formatIdx : 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  useInput((input, key) => {
    if (loading) return;

    // Navigation only - no auto-selection
    if (key.upArrow) {
      if (currentFocus === "agent") {
        setAgentIndex((prev) => Math.max(0, prev - 1));
      } else if (currentFocus === "format") {
        setFormatIndex((prev) => Math.max(0, prev - 1));
      } else if (currentFocus === "save") {
        setCurrentFocus("format");
      }
    } else if (key.downArrow) {
      if (currentFocus === "agent") {
        setAgentIndex((prev) => Math.min(AGENTS.length - 1, prev + 1));
      } else if (currentFocus === "format") {
        setFormatIndex((prev) =>
          Math.min(CONTEXT_FORMATS.length - 1, prev + 1),
        );
      } else if (currentFocus === "save") {
        setCurrentFocus("agent");
      }
    } else if (key.tab || key.rightArrow) {
      // Move to next section
      if (currentFocus === "agent") setCurrentFocus("format");
      else if (currentFocus === "format") setCurrentFocus("save");
      else setCurrentFocus("agent");
    } else if (key.leftArrow) {
      // Move to previous section
      if (currentFocus === "save") setCurrentFocus("format");
      else if (currentFocus === "format") setCurrentFocus("agent");
      else setCurrentFocus("save");
    } else if (input === " ") {
      // Space to toggle selection
      if (currentFocus === "agent") {
        setSelectedAgent(AGENTS[agentIndex].value);
      } else if (currentFocus === "format") {
        setSelectedFormat(CONTEXT_FORMATS[formatIndex].value);
      }
    } else if (input === "a") {
      // Toggle auto-launch with 'a' key
      setAutoLaunch(!autoLaunch);
    } else if (key.return) {
      if (currentFocus === "save") {
        handleSave();
      }
    } else if (key.escape) {
      if (onCancel) {
        onCancel();
      } else {
        onComplete();
      }
    }
  });

  const handleSave = useCallback(async () => {
    try {
      await saveHandoffConfig({
        targetAgent: selectedAgent,
        contextFormat: selectedFormat,
        autoLaunch,
      });
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    }
  }, [selectedAgent, selectedFormat, autoLaunch, onComplete]);

  if (loading) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color={colors.primary}>Loading settings...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color={colors.error}>{symbols.cross} Error: {error}</Text>
        <Box marginTop={1}>
          <Text color={colors.gray}>Press ESC to go back</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Panel title="Handoff Settings" borderColor={colors.primary}>
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color={colors.gray}>
            Configure automatic agent handoff after analysis
          </Text>
        </Box>

        {/* Agent Selection */}
        <Box flexDirection="column" marginTop={1} marginBottom={1}>
          <Box marginBottom={1}>
            <Text
              color={currentFocus === "agent" ? colors.primary : colors.text}
              bold={currentFocus === "agent"}
            >
              {currentFocus === "agent" ? "› " : "  "}Target Agent
            </Text>
          </Box>

          {AGENTS.map((agent, index) => {
            const isNavigated = index === agentIndex;
            const isSelected = agent.value === selectedAgent;
            return (
              <Box key={agent.value} paddingLeft={2} marginY={0}>
                <Text
                  color={isNavigated ? colors.primary : colors.gray}
                  bold={isSelected}
                >
                  {isNavigated ? symbols.pointer : " "}{" "}
                  {isSelected ? "[●]" : "[ ]"} {agent.label}
                </Text>
                <Text color={colors.gray}> - {agent.description}</Text>
              </Box>
            );
          })}
        </Box>

        {/* Context Format Selection */}
        <Box flexDirection="column" marginBottom={1}>
          <Box marginBottom={1}>
            <Text
              color={currentFocus === "format" ? colors.primary : colors.text}
              bold={currentFocus === "format"}
            >
              {currentFocus === "format" ? "› " : "  "}Context Format
            </Text>
          </Box>

          {CONTEXT_FORMATS.map((format, index) => {
            const isNavigated = index === formatIndex;
            const isSelected = format.value === selectedFormat;
            return (
              <Box key={format.value} paddingLeft={2} marginY={0}>
                <Text
                  color={isNavigated ? colors.primary : colors.gray}
                  bold={isSelected}
                >
                  {isNavigated ? symbols.pointer : " "}{" "}
                  {isSelected ? "[●]" : "[ ]"} {format.label}
                </Text>
                <Text color={colors.gray}> - {format.description}</Text>
              </Box>
            );
          })}
        </Box>

        {/* Auto-launch Toggle */}
        <Box flexDirection="column" marginBottom={1}>
          <Box>
            <Text color={colors.text}>Auto-launch after export</Text>
          </Box>
          <Box paddingLeft={2}>
            <Text color={autoLaunch ? colors.success : colors.gray}>
              {autoLaunch ? "[x]" : "[ ]"} Prompt to launch agent automatically
              (Press 'a' to toggle)
            </Text>
          </Box>
        </Box>

        {/* Save Button */}
        <Box marginTop={1} marginBottom={1}>
          <Box
            borderStyle={currentFocus === "save" ? "round" : "single"}
            borderColor={currentFocus === "save" ? colors.primary : colors.gray}
            paddingX={2}
          >
            <Text
              color={currentFocus === "save" ? colors.success : colors.text}
              bold={currentFocus === "save"}
            >
              {currentFocus === "save" ? "▶ " : "  "}Save Settings
            </Text>
          </Box>
        </Box>

        {/* Help Text */}
        <Box
          marginTop={1}
          paddingTop={1}
          borderStyle="single"
          borderTop
          borderColor={colors.gray}
        >
          <Text color={colors.gray}>
            ↑↓: Navigate | Space: Select | Tab/←→: Switch sections | a: Toggle
            auto-launch | Enter: Save | ESC: Cancel
          </Text>
        </Box>
      </Box>
    </Panel>
  );
}
