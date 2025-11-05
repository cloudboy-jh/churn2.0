import chalk from "chalk";
import gradient from "gradient-string";

// Churn 2.0 Theme - Centered on #ff5656 (vibrant red)
export const colors = {
  background: "#1b1b1b",
  primary: "#ff5656", // Main vibrant red accent
  secondary: "#ff8585", // Lighter red
  text: "#f2e9e4",
  gray: "#a6adc8",
  info: "#8ab4f8",
  success: "#a6e3a1",
  warning: "#f9e2af",
  error: "#f38ba8",
} as const;

// Chalk instances for consistent styling
export const theme = {
  primary: chalk.hex(colors.primary),
  secondary: chalk.hex(colors.secondary),
  text: chalk.hex(colors.text),
  gray: chalk.hex(colors.gray),
  info: chalk.hex(colors.info),
  success: chalk.hex(colors.success),
  warning: chalk.hex(colors.warning),
  error: chalk.hex(colors.error),
  dim: chalk.dim,
  bold: chalk.bold,
} as const;

// Gradient for logo and progress elements
export const redGradient = gradient([colors.primary, colors.secondary]);

// Box drawing characters for borders
export const box = {
  topLeft: "╭",
  topRight: "╮",
  bottomLeft: "╰",
  bottomRight: "╯",
  horizontal: "─",
  vertical: "│",
  verticalRight: "├",
  verticalLeft: "┤",
  horizontalDown: "┬",
  horizontalUp: "┴",
  cross: "┼",
} as const;

// Progress bar characters
export const progress = {
  filled: "█",
  empty: "░",
  partial: ["▏", "▎", "▍", "▌", "▋", "▊", "▉"],
} as const;

// Symbols
export const symbols = {
  tick: "+",
  cross: "x",
  pointer: ">",
  bullet: "*",
  ellipsis: "...",
  line: "-",
  arrowUp: "^",
  arrowDown: "v",
  arrowLeft: "<",
  arrowRight: ">",
} as const;

// Create a bordered box
export function createBox(content: string, title?: string): string {
  const lines = content.split("\n");
  const maxWidth = Math.max(...lines.map((l) => l.length));
  const width = maxWidth + 2;

  let result = "";

  // Top border
  if (title) {
    const titlePadding = Math.floor((width - title.length - 2) / 2);
    result +=
      theme.secondary(
        box.topLeft +
          box.horizontal.repeat(titlePadding) +
          " " +
          title +
          " " +
          box.horizontal.repeat(width - titlePadding - title.length - 2) +
          box.topRight,
      ) + "\n";
  } else {
    result +=
      theme.secondary(
        box.topLeft + box.horizontal.repeat(width) + box.topRight,
      ) + "\n";
  }

  // Content lines
  for (const line of lines) {
    result +=
      theme.secondary(box.vertical) +
      " " +
      line.padEnd(maxWidth) +
      " " +
      theme.secondary(box.vertical) +
      "\n";
  }

  // Bottom border
  result += theme.secondary(
    box.bottomLeft + box.horizontal.repeat(width) + box.bottomRight,
  );

  return result;
}

// Create a progress bar
export function createProgressBar(percent: number, width: number = 40): string {
  const filled = Math.floor(width * percent);
  const empty = width - filled;

  return (
    theme.primary(progress.filled.repeat(filled)) +
    theme.gray(progress.empty.repeat(empty))
  );
}

// Format file size
export function formatSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Format duration
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
