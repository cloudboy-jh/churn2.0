import React, { useState, useCallback, useEffect } from "react";
import { Text, Box, useInput } from "ink";
import { useScreenSize } from "fullscreen-ink";
import { theme, symbols } from "../theme.js";

export interface VirtualizedListItem {
  key: string;
  [key: string]: any;
}

export interface VirtualizedListProps<T extends VirtualizedListItem> {
  items: T[];
  /** Render function for each item */
  renderItem: (item: T, index: number, isSelected: boolean) => React.ReactNode;
  /** Height per item in lines (default: 1) */
  itemHeight?: number;
  /** Called when selection changes */
  onSelectionChange?: (index: number, item: T) => void;
  /** Called when user presses Enter on an item */
  onSelect?: (index: number, item: T) => void;
  /** Initial selected index */
  initialIndex?: number;
  /** Reserve lines for header/footer (default: 8) */
  reservedLines?: number;
  /** Whether keyboard input is active */
  isActive?: boolean;
  /** Border color */
  borderColor?: string;
  /** Show scroll indicator */
  showScrollIndicator?: boolean;
  /** Custom empty state */
  emptyMessage?: string;
  /** Title for the list */
  title?: string;
  /** Subtitle showing counts etc */
  subtitle?: string;
}

export function VirtualizedList<T extends VirtualizedListItem>({
  items,
  renderItem,
  itemHeight = 1,
  onSelectionChange,
  onSelect,
  initialIndex = 0,
  reservedLines = 8,
  isActive = true,
  borderColor = "#ff9b85",
  showScrollIndicator = true,
  emptyMessage = "No items",
  title,
  subtitle,
}: VirtualizedListProps<T>) {
  const { height: terminalHeight, width: terminalWidth } = useScreenSize();
  const [selectedIndex, setSelectedIndex] = useState(
    Math.min(initialIndex, Math.max(0, items.length - 1)),
  );

  // Calculate visible window
  const availableHeight = Math.max(6, terminalHeight - reservedLines);
  const itemsPerPage = Math.max(1, Math.floor(availableHeight / itemHeight));

  // Calculate window boundaries
  const windowStart =
    Math.floor(selectedIndex / itemsPerPage) * itemsPerPage;
  const windowEnd = Math.min(windowStart + itemsPerPage, items.length);
  const visibleItems = items.slice(windowStart, windowEnd);

  // Update parent when selection changes
  useEffect(() => {
    if (items.length > 0 && onSelectionChange) {
      onSelectionChange(selectedIndex, items[selectedIndex]);
    }
  }, [selectedIndex, items, onSelectionChange]);

  // Reset selection if items change
  useEffect(() => {
    if (selectedIndex >= items.length && items.length > 0) {
      setSelectedIndex(items.length - 1);
    }
  }, [items.length, selectedIndex]);

  // Handle keyboard navigation
  useInput(
    (input, key) => {
      if (!isActive || items.length === 0) return;

      if (key.upArrow) {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        setSelectedIndex((prev) => Math.min(items.length - 1, prev + 1));
      } else if (key.pageUp) {
        setSelectedIndex((prev) => Math.max(0, prev - itemsPerPage));
      } else if (key.pageDown) {
        setSelectedIndex((prev) =>
          Math.min(items.length - 1, prev + itemsPerPage),
        );
      } else if (input === "g") {
        // Go to top
        setSelectedIndex(0);
      } else if (input === "G") {
        // Go to bottom
        setSelectedIndex(items.length - 1);
      } else if (key.return && onSelect) {
        onSelect(selectedIndex, items[selectedIndex]);
      }
    },
    { isActive },
  );

  if (items.length === 0) {
    return (
      <Box flexDirection="column" paddingY={1}>
        {title && (
          <Box marginBottom={1}>
            <Text color="#f2e9e4" bold>
              {title}
            </Text>
          </Box>
        )}
        <Box
          borderStyle="single"
          borderColor={borderColor}
          paddingX={1}
          paddingY={1}
        >
          <Text color="#a6adc8">{emptyMessage}</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Header */}
      {(title || subtitle) && (
        <Box marginBottom={1} justifyContent="space-between">
          {title && (
            <Text color="#f2e9e4" bold>
              {title}
            </Text>
          )}
          {subtitle && <Text color="#a6adc8">{subtitle}</Text>}
        </Box>
      )}

      {/* List container */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={borderColor}
        paddingBottom={1}
      >
        {visibleItems.map((item, localIdx) => {
          const globalIdx = windowStart + localIdx;
          const isSelected = globalIdx === selectedIndex;

          return (
            <Box key={item.key} flexDirection="column" paddingX={1}>
              {renderItem(item, globalIdx, isSelected)}
            </Box>
          );
        })}

        {/* Scroll indicator */}
        {showScrollIndicator && items.length > itemsPerPage && (
          <Box paddingX={1} marginTop={1}>
            <Text color="#a6adc8">
              {windowStart + 1}-{windowEnd} of {items.length}
              {windowEnd < items.length && " • ↓ more"}
              {windowStart > 0 && " • ↑ more"}
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}

/** Hook to get current selection from VirtualizedList */
export function useListSelection<T>(items: T[], initialIndex = 0) {
  const [selectedIndex, setSelectedIndex] = useState(
    Math.min(initialIndex, Math.max(0, items.length - 1)),
  );
  const [selectedItem, setSelectedItem] = useState<T | null>(
    items[selectedIndex] || null,
  );

  const handleSelectionChange = useCallback(
    (index: number, item: T) => {
      setSelectedIndex(index);
      setSelectedItem(item);
    },
    [],
  );

  return {
    selectedIndex,
    selectedItem,
    onSelectionChange: handleSelectionChange,
  };
}
