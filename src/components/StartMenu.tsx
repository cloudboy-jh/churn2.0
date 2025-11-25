import React, { useMemo, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import { colors, symbols } from "../theme.js";
import { Panel } from "./Panel.js";

interface StartMenuProps {
  onRunScan: () => void;
  onChooseModel: () => void;
  onSettings: () => void;
  onExit: () => void;
}

interface MenuOption {
  label: string;
  value: string;
  icon: string;
}

export function StartMenu({
  onRunScan,
  onChooseModel,
  onSettings,
  onExit,
}: StartMenuProps) {
  // Memoize options array
  const options = useMemo<MenuOption[]>(
    () => [
      { label: "> Run scan", value: "scan", icon: ">" },
      { label: "* Choose model", value: "model", icon: "*" },
      { label: "+ Settings", value: "settings", icon: "+" },
      { label: "x Exit", value: "exit", icon: "x" },
    ],
    [],
  );

  // Global exit shortcut
  useInput((input, key) => {
    if (input === "z") {
      process.exit(0);
    } else if (input === "q" || key.escape) {
      onExit();
    }
  });

  // Handle selection
  const handleSelect = useCallback(
    (item: { value: string }) => {
      switch (item.value) {
        case "scan":
          onRunScan();
          break;
        case "model":
          onChooseModel();
          break;
        case "settings":
          onSettings();
          break;
        case "exit":
          onExit();
          break;
      }
    },
    [onRunScan, onChooseModel, onSettings, onExit],
  );

  return (
    <Panel title="What would you like to do?" borderColor={colors.primary}>
      <Box flexDirection="column">
        <SelectInput
          items={options}
          onSelect={handleSelect}
          indicatorComponent={({ isSelected }) => (
            <Text color={isSelected ? colors.primary : colors.gray}>
              {isSelected ? symbols.pointer : " "}{" "}
            </Text>
          )}
          itemComponent={({ isSelected, label }) => (
            <Text color={isSelected ? colors.primary : "#f2e9e4"}>{label}</Text>
          )}
        />

        <Box
          marginTop={1}
          paddingTop={1}
          borderStyle="single"
          borderTop
          borderColor={colors.gray}
        >
          <Text color={colors.gray}>
            {symbols.arrowUp}
            {symbols.arrowDown}: Navigate | Enter: Select | q: Quit
          </Text>
        </Box>
      </Box>
    </Panel>
  );
}
