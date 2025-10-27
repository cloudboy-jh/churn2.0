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
    <Box flexDirection="column" marginBottom={1}>
      <Text>{redGradient(LOGO)}</Text>
      {subtitle && (
        <Box marginTop={1}>
          <Text color="#a6adc8">{subtitle}</Text>
        </Box>
      )}
      {message && (
        <Box marginTop={1}>
          <Text color="#f2e9e4">{message}</Text>
        </Box>
      )}
    </Box>
  );
}
