import React from "react";
import { Box, Text } from "ink";
import { colors } from "../theme.js";

interface PanelProps {
  title?: string;
  children: React.ReactNode;
  borderColor?: string;
  borderStyle?: "single" | "double" | "round" | "bold" | "singleDouble" | "doubleSingle" | "classic";
}

export function Panel({
  title,
  children,
  borderColor = colors.gray,
  borderStyle = "round",
}: PanelProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle={borderStyle}
      borderColor={borderColor}
      paddingX={1}
      paddingY={0}
    >
      {title && (
        <Box marginBottom={1}>
          <Text color={colors.primary} bold>
            {title}
          </Text>
        </Box>
      )}
      {children}
    </Box>
  );
}
