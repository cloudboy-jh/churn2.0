import React from "react";
import { Text, Box } from "ink";
import { theme, symbols } from "../theme.js";

interface Command {
  name: string;
  description: string;
}

const commands: Command[] = [
  { name: "model", description: "Select AI model provider and model" },
  { name: "run", description: "Run code analysis on your repository" },
  { name: "ask", description: "Ask a one-off question about your code" },
  { name: "review", description: "Review previous analysis results" },
  { name: "export", description: "Export analysis results to files" },
  { name: "pass", description: "Pass report to another LLM" },
];

export function CommandsList() {
  return (
    <Box flexDirection="column" marginBottom={2}>
      <Box marginBottom={1}>
        <Text color="#f2e9e4" bold>
          Available Commands
        </Text>
      </Box>

      <Box
        flexDirection="column"
        paddingX={2}
        paddingY={1}
        borderStyle="single"
        borderColor="#ff9b85"
      >
        {commands.map((cmd, i) => (
          <Box key={i} marginBottom={i < commands.length - 1 ? 1 : 0}>
            <Text color="#ff6f54" bold>
              churn {cmd.name}
            </Text>
            <Text color="#a6adc8"> {symbols.line} </Text>
            <Text color="#f2e9e4">{cmd.description}</Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text color="#a6adc8" dimColor>
          Run any command with churn {"<command>"} or use churn run as default
        </Text>
      </Box>
    </Box>
  );
}
