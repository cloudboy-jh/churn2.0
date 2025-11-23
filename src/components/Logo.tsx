import React from "react";
import { Text, Box } from "ink";
import { redGradient, theme } from "../theme.js";

const LOGO = ` ▄████████    ▄█    █▄    ███    █▄     ▄████████ ███▄▄▄▄
███    ███   ███    ███   ███    ███   ███    ███ ███▀▀▀██▄
███    █▀    ███    ███   ███    ███   ███    ███ ███   ███
███         ▄███▄▄▄▄███▄▄ ███    ███  ▄███▄▄▄▄██▀ ███   ███
███        ▀▀███▀▀▀▀███▀  ███    ███ ▀▀███▀▀▀▀▀   ███   ███
███    █▄    ███    ███   ███    ███ ▀███████████ ███   ███
███    ███   ███    ███   ███    ███   ███    ███ ███   ███
████████▀    ███    █▀    ████████▀    ███    ███  ▀█   █▀
                                       ███    ███          `;

interface LogoProps {
  subtitle?: string;
  message?: string;
}

export function Logo({ subtitle, message }: LogoProps) {
  return (
    <Box flexDirection="column" marginBottom={2} alignItems="center">
      <Text>{redGradient(LOGO)}</Text>
      {subtitle && (
        <Box marginTop={1} justifyContent="center">
          <Text color="#a6adc8">{subtitle}</Text>
        </Box>
      )}
      {message && (
        <Box marginTop={1} justifyContent="center">
          <Text color="#f2e9e4">{message}</Text>
        </Box>
      )}
    </Box>
  );
}
