import React, { useState } from "react";
import { Box, Text } from "ink";
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

  // Handle keyboard input
  React.useEffect(() => {
    const handleInput = (data: Buffer) => {
      const key = data.toString();

      // Arrow up
      if (key === "\u001B[A") {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
      }
      // Arrow down
      else if (key === "\u001B[B") {
        setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
      }
      // Enter
      else if (key === "\r" || key === "\n") {
        options[selectedIndex].action();
      }
      // q or ESC
      else if (key === "q" || key === "\u001B") {
        onExit();
      }
    };

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", handleInput);

    return () => {
      process.stdin.removeListener("data", handleInput);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    };
  }, [selectedIndex, onRunScan, onChooseModel, onExit]);

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
