import React, { useState, useMemo, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { colors, symbols } from "../theme.js";

interface StartMenuProps {
  onRunScan: () => void;
  onChooseModel: () => void;
  onExit: () => void;
}

interface MenuOption {
  label: string;
  action: () => void;
  icon: string;
}

export function StartMenu({
  onRunScan,
  onChooseModel,
  onExit,
}: StartMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Memoize options array to prevent recreation on every render
  const options = useMemo<MenuOption[]>(
    () => [
      { label: "Run scan", action: onRunScan, icon: ">" },
      { label: "Choose model", action: onChooseModel, icon: "*" },
      { label: "Exit", action: onExit, icon: "x" },
    ],
    [onRunScan, onChooseModel, onExit],
  );

  // Memoize input handler
  const handleInput = useCallback(
    (input: string, key: any) => {
      if (input === "z") {
        process.exit(0);
      } else if (key.upArrow) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
      } else if (key.downArrow) {
        setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
      } else if (key.return) {
        // Boundary check
        if (selectedIndex >= 0 && selectedIndex < options.length) {
          options[selectedIndex].action();
        }
      } else if (input === "q" || key.escape) {
        onExit();
      }
    },
    [options, selectedIndex, onExit],
  );

  useInput(handleInput);

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text color={colors.text}>What would you like to do?</Text>
      </Box>

      {options.map((option) => (
        <Box key={option.label} marginBottom={1}>
          <Text
            color={
              selectedIndex === options.indexOf(option)
                ? colors.primary
                : colors.gray
            }
          >
            {selectedIndex === options.indexOf(option) ? symbols.pointer : " "}{" "}
            {option.icon} {option.label}
          </Text>
        </Box>
      ))}

      <Box marginTop={1}>
        <Text color={colors.gray}>
          Use arrow keys to navigate, Enter to select, q to quit
        </Text>
      </Box>
    </Box>
  );
}
