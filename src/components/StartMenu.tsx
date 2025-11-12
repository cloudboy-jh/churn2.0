import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { colors, symbols } from "../theme.js";

interface StartMenuProps {
  onRunScan: () => void;
  onChooseModel: () => void;
  onExit: () => void;
}

export function StartMenu({
  onRunScan,
  onChooseModel,
  onExit,
}: StartMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const options = [
    { label: "Run scan", action: onRunScan, icon: ">" },
    { label: "Choose model", action: onChooseModel, icon: "*" },
    { label: "Exit", action: onExit, icon: "x" },
  ];

  // Handle keyboard input using Ink's useInput hook
  useInput((input, key) => {
    if (input === "z") {
      process.exit(0);
    } else if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
    } else if (key.return) {
      options[selectedIndex].action();
    } else if (input === "q" || key.escape) {
      onExit();
    }
  });

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text color={colors.text}>What would you like to do?</Text>
      </Box>

      {options.map((option, index) => (
        <Box key={index} marginBottom={1}>
          <Text color={selectedIndex === index ? colors.primary : colors.gray}>
            {selectedIndex === index ? symbols.pointer : " "} {option.icon}{" "}
            {option.label}
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
