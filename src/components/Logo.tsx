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

// Pre-compute the gradient-processed logo at module load time
const GRADIENT_LOGO = redGradient(LOGO);

interface LogoProps {
  subtitle?: string;
  message?: string;
}

export const Logo = React.memo(function Logo({ subtitle, message }: LogoProps) {
  return (
    <Box flexDirection="column" marginBottom={2} alignItems="center">
      <Text>{GRADIENT_LOGO}</Text>
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
});
