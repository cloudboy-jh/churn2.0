import chalk from "chalk";
import gradient from "gradient-string";
import stripAnsi from "strip-ansi";

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
  checkmark: "✓",
} as const;

// Tree drawing characters for ReviewBrowser
export const tree = {
  expanded: "▼",
  collapsed: "▶",
  branch: "├─",
  lastBranch: "└─",
  vertical: "│ ",
  indent: "  ",
} as const;

// Checkbox characters for tree items
export const checkbox = {
  checked: "[✓]",
  unchecked: "[ ]",
  partial: "[○]",
} as const;

// Severity colors (per spec)
export const severityColors = {
  high: "#f38ba8",   // matches colors.error
  medium: "#f9e2af", // matches colors.warning
  low: "#a6adc8",    // matches colors.gray (spec)
} as const;

// Category label mappings for human-readable display
const categoryLabelsSingular: Record<string, string> = {
  bug: "potential bug",
  security: "security vulnerability",
  refactor: "refactor opportunity",
  optimization: "optimization suggestion",
  documentation: "documentation gap",
  style: "style inconsistency",
};

const categoryLabelsPlural: Record<string, string> = {
  bug: "potential bugs",
  security: "security vulnerabilities",
  refactor: "refactor opportunities",
  optimization: "optimization suggestions",
  documentation: "documentation gaps",
  style: "style inconsistencies",
};

// Get human-readable category label
export function getCategoryLabel(category: string, count: number): string {
  const label = count === 1 
    ? categoryLabelsSingular[category] 
    : categoryLabelsPlural[category];
  return label || category;
}

// Get severity color
export function getSeverityColor(severity: "high" | "medium" | "low"): string {
  return severityColors[severity];
}

// Get severity theme (chalk instance)
export function getSeverityTheme(severity: "high" | "medium" | "low") {
  switch (severity) {
    case "high":
      return theme.error;
    case "medium":
      return theme.warning;
    case "low":
      return theme.gray;
  }
}

// Create a bordered box
export function createBox(content: string, title?: string): string {
  const lines = content.split("\n");
  // Use stripAnsi to calculate visible width, accounting for ANSI color codes
  const maxWidth = Math.max(...lines.map((l) => stripAnsi(l).length));
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

  // Content lines - use visible length for proper padding
  for (const line of lines) {
    const visibleLength = stripAnsi(line).length;
    result +=
      theme.secondary(box.vertical) +
      " " +
      line +
      " ".repeat(maxWidth - visibleLength) +
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

// Bouncing gradient animation characters (fade: white → light → medium → solid → medium → light → white)
const bounceGradient = [" ", "░", "▒", "▓", "█", "█", "▓", "▒", "░", " "];

// Create a bouncing gradient progress indicator
// Returns a string with a bouncing gradient block that moves left-to-right and back
export function createBouncingProgress(
  frame: number,
  width: number = 40,
  speed: number = 2,
): string {
  const gradientWidth = bounceGradient.length;
  const travelWidth = width - gradientWidth;

  // Calculate position using sine wave for smooth bounce (0 to travelWidth)
  const cycle = (frame * speed) % (travelWidth * 2);
  const position = cycle < travelWidth ? cycle : travelWidth * 2 - cycle;

  // Build the bar
  let bar = "";

  // Leading space
  bar += " ".repeat(Math.floor(position));

  // Gradient block with colors
  for (let i = 0; i < bounceGradient.length; i++) {
    const char = bounceGradient[i];
    if (char === "█" || char === "▓") {
      bar += theme.primary(char);
    } else if (char === "▒" || char === "░") {
      bar += theme.secondary(char);
    } else {
      bar += char;
    }
  }

  // Trailing space
  const remaining = width - Math.floor(position) - gradientWidth;
  if (remaining > 0) {
    bar += " ".repeat(remaining);
  }

  return bar;
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
