import React, { useState, useMemo, useCallback } from "react";
import { Text, Box, useInput } from "ink";
import { useScreenSize } from "fullscreen-ink";
import {
  colors,
  symbols,
  tree as treeChars,
  checkbox,
  severityColors,
  getCategoryLabel,
} from "../theme.js";
import { AnalysisResult, FileSuggestion } from "../engine/analysis.js";
import { VirtualizedList, VirtualizedListItem } from "./VirtualizedList.js";
import { FindingDetail } from "./FindingDetail.js";
import { Panel } from "./Panel.js";

interface ReviewBrowserProps {
  result: AnalysisResult;
  onPassFindings: (findings: FileSuggestion[]) => void;
  onBack: () => void;
}

// Tree node types
interface TreeNode {
  id: string;
  type: "severity" | "category" | "finding";
  label: string;
  expanded: boolean;
  included: boolean;
  depth: number;
  severity: "high" | "medium" | "low";
  category?: string;
  finding?: FileSuggestion;
  childCount?: number;
  includedCount?: number;
}

// Extend for VirtualizedList compatibility
interface TreeListItem extends VirtualizedListItem {
  node: TreeNode;
}

// Build the tree structure from findings
function buildTree(suggestions: FileSuggestion[]): TreeNode[] {
  const nodes: TreeNode[] = [];
  const severities: ("high" | "medium" | "low")[] = ["high", "medium", "low"];

  for (const severity of severities) {
    const severityFindings = suggestions.filter((s) => s.severity === severity);
    if (severityFindings.length === 0) continue;

    // Severity node
    const severityNode: TreeNode = {
      id: `severity-${severity}`,
      type: "severity",
      label: severity.toUpperCase(),
      expanded: false,
      included: true,
      depth: 0,
      severity,
      childCount: severityFindings.length,
      includedCount: severityFindings.length,
    };
    nodes.push(severityNode);

    // Group by category
    const categoryMap = new Map<string, FileSuggestion[]>();
    for (const finding of severityFindings) {
      const existing = categoryMap.get(finding.category) || [];
      existing.push(finding);
      categoryMap.set(finding.category, existing);
    }

    // Sort categories by count descending
    const sortedCategories = Array.from(categoryMap.entries()).sort(
      (a, b) => b[1].length - a[1].length
    );

    for (const [category, findings] of sortedCategories) {
      // Category node
      const categoryNode: TreeNode = {
        id: `category-${severity}-${category}`,
        type: "category",
        label: getCategoryLabel(category, findings.length),
        expanded: false,
        included: true,
        depth: 1,
        severity,
        category,
        childCount: findings.length,
        includedCount: findings.length,
      };
      nodes.push(categoryNode);

      // Finding nodes
      for (let i = 0; i < findings.length; i++) {
        const finding = findings[i];
        const findingNode: TreeNode = {
          id: `finding-${severity}-${category}-${i}`,
          type: "finding",
          label: finding.title,
          expanded: false,
          included: true,
          depth: 2,
          severity,
          category,
          finding,
        };
        nodes.push(findingNode);
      }
    }
  }

  return nodes;
}

// Flatten tree to visible nodes based on expanded state
function flattenVisibleNodes(nodes: TreeNode[]): TreeNode[] {
  const visible: TreeNode[] = [];
  let currentSeverityExpanded = false;
  let currentCategoryExpanded = false;
  let currentSeverity: string | null = null;
  let currentCategory: string | null = null;

  for (const node of nodes) {
    if (node.type === "severity") {
      visible.push(node);
      currentSeverityExpanded = node.expanded;
      currentSeverity = node.severity;
      currentCategory = null;
      currentCategoryExpanded = false;
    } else if (node.type === "category") {
      if (currentSeverityExpanded && node.severity === currentSeverity) {
        visible.push(node);
        currentCategoryExpanded = node.expanded;
        currentCategory = node.category || null;
      }
    } else if (node.type === "finding") {
      if (
        currentSeverityExpanded &&
        currentCategoryExpanded &&
        node.severity === currentSeverity &&
        node.category === currentCategory
      ) {
        visible.push(node);
      }
    }
  }

  return visible;
}

// Calculate included counts for parent nodes
function updateIncludedCounts(nodes: TreeNode[]): TreeNode[] {
  const updated = [...nodes];
  
  // Update category counts
  for (let i = 0; i < updated.length; i++) {
    const node = updated[i];
    if (node.type === "category") {
      const categoryFindings = updated.filter(
        (n) =>
          n.type === "finding" &&
          n.severity === node.severity &&
          n.category === node.category
      );
      node.includedCount = categoryFindings.filter((n) => n.included).length;
      node.included = node.includedCount > 0;
    }
  }

  // Update severity counts
  for (let i = 0; i < updated.length; i++) {
    const node = updated[i];
    if (node.type === "severity") {
      const severityFindings = updated.filter(
        (n) => n.type === "finding" && n.severity === node.severity
      );
      node.includedCount = severityFindings.filter((n) => n.included).length;
      node.included = node.includedCount > 0;
    }
  }

  return updated;
}

// Get included findings from tree
function getIncludedFindings(nodes: TreeNode[]): FileSuggestion[] {
  return nodes
    .filter((n) => n.type === "finding" && n.included && n.finding)
    .map((n) => n.finding!);
}

// Count total included
function countIncluded(nodes: TreeNode[]): number {
  return nodes.filter((n) => n.type === "finding" && n.included).length;
}

// Count total findings
function countTotal(nodes: TreeNode[]): number {
  return nodes.filter((n) => n.type === "finding").length;
}

export function ReviewBrowser({
  result,
  onPassFindings,
  onBack,
}: ReviewBrowserProps) {
  const { width: terminalWidth } = useScreenSize();
  const [tree, setTree] = useState<TreeNode[]>(() =>
    updateIncludedCounts(buildTree(result.suggestions))
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [detailFinding, setDetailFinding] = useState<FileSuggestion | null>(null);
  const [detailIncluded, setDetailIncluded] = useState(true);

  // Flatten visible nodes
  const visibleNodes = useMemo(() => flattenVisibleNodes(tree), [tree]);

  // Convert to list items
  const listItems: TreeListItem[] = useMemo(
    () =>
      visibleNodes.map((node) => ({
        key: node.id,
        node,
      })),
    [visibleNodes]
  );

  // Get current node
  const currentNode = visibleNodes[selectedIndex];

  // Counts
  const includedCount = useMemo(() => countIncluded(tree), [tree]);
  const totalCount = useMemo(() => countTotal(tree), [tree]);

  // Toggle expand/collapse
  const toggleExpand = useCallback(
    (nodeId: string) => {
      setTree((prev) =>
        prev.map((node) =>
          node.id === nodeId ? { ...node, expanded: !node.expanded } : node
        )
      );
    },
    []
  );

  // Toggle include/exclude for a node (and its children if applicable)
  const toggleInclude = useCallback(
    (nodeId: string) => {
      setTree((prev) => {
        const targetNode = prev.find((n) => n.id === nodeId);
        if (!targetNode) return prev;

        const newIncluded = !targetNode.included;
        let updated = [...prev];

        if (targetNode.type === "finding") {
          // Toggle just this finding
          updated = updated.map((n) =>
            n.id === nodeId ? { ...n, included: newIncluded } : n
          );
        } else if (targetNode.type === "category") {
          // Toggle all findings in this category
          updated = updated.map((n) => {
            if (
              n.type === "finding" &&
              n.severity === targetNode.severity &&
              n.category === targetNode.category
            ) {
              return { ...n, included: newIncluded };
            }
            return n;
          });
        } else if (targetNode.type === "severity") {
          // Toggle all findings in this severity
          updated = updated.map((n) => {
            if (n.type === "finding" && n.severity === targetNode.severity) {
              return { ...n, included: newIncluded };
            }
            return n;
          });
        }

        return updateIncludedCounts(updated);
      });
    },
    []
  );

  // Include entire group
  const includeGroup = useCallback(
    (nodeId: string) => {
      setTree((prev) => {
        const targetNode = prev.find((n) => n.id === nodeId);
        if (!targetNode) return prev;

        let updated = [...prev];

        if (targetNode.type === "category") {
          updated = updated.map((n) => {
            if (
              n.type === "finding" &&
              n.severity === targetNode.severity &&
              n.category === targetNode.category
            ) {
              return { ...n, included: true };
            }
            return n;
          });
        } else if (targetNode.type === "severity") {
          updated = updated.map((n) => {
            if (n.type === "finding" && n.severity === targetNode.severity) {
              return { ...n, included: true };
            }
            return n;
          });
        } else if (targetNode.type === "finding") {
          updated = updated.map((n) =>
            n.id === nodeId ? { ...n, included: true } : n
          );
        }

        return updateIncludedCounts(updated);
      });
    },
    []
  );

  // Exclude entire group
  const excludeGroup = useCallback(
    (nodeId: string) => {
      setTree((prev) => {
        const targetNode = prev.find((n) => n.id === nodeId);
        if (!targetNode) return prev;

        let updated = [...prev];

        if (targetNode.type === "category") {
          updated = updated.map((n) => {
            if (
              n.type === "finding" &&
              n.severity === targetNode.severity &&
              n.category === targetNode.category
            ) {
              return { ...n, included: false };
            }
            return n;
          });
        } else if (targetNode.type === "severity") {
          updated = updated.map((n) => {
            if (n.type === "finding" && n.severity === targetNode.severity) {
              return { ...n, included: false };
            }
            return n;
          });
        } else if (targetNode.type === "finding") {
          updated = updated.map((n) =>
            n.id === nodeId ? { ...n, included: false } : n
          );
        }

        return updateIncludedCounts(updated);
      });
    },
    []
  );

  // Handle keyboard input (when not in detail view)
  useInput(
    (input, key) => {
      if (detailFinding) return; // Detail view handles its own input

      const lowerInput = input.toLowerCase();

      if (key.return) {
        // Expand/collapse for severity/category, view detail for finding
        if (currentNode) {
          if (currentNode.type === "finding" && currentNode.finding) {
            setDetailFinding(currentNode.finding);
            setDetailIncluded(currentNode.included);
          } else {
            toggleExpand(currentNode.id);
          }
        }
      } else if (input === " ") {
        // Toggle include/exclude
        if (currentNode) {
          toggleInclude(currentNode.id);
        }
      } else if (lowerInput === "v") {
        // View detail (for findings)
        if (currentNode?.type === "finding" && currentNode.finding) {
          setDetailFinding(currentNode.finding);
          setDetailIncluded(currentNode.included);
        }
      } else if (lowerInput === "x") {
        // Exclude entire group
        if (currentNode) {
          excludeGroup(currentNode.id);
        }
      } else if (lowerInput === "i") {
        // Include entire group
        if (currentNode) {
          includeGroup(currentNode.id);
        }
      } else if (lowerInput === "p") {
        // Pass included findings
        const included = getIncludedFindings(tree);
        onPassFindings(included);
      } else if (key.escape || lowerInput === "q") {
        // Back
        onBack();
      }
    },
    { isActive: !detailFinding }
  );

  // Handle detail view close
  const handleDetailClose = useCallback(() => {
    setDetailFinding(null);
  }, []);

  // Handle detail view toggle
  const handleDetailToggle = useCallback(() => {
    if (!detailFinding) return;

    // Find the node for this finding and toggle it
    const findingNode = tree.find(
      (n) => n.type === "finding" && n.finding === detailFinding
    );
    if (findingNode) {
      toggleInclude(findingNode.id);
      setDetailIncluded(!detailIncluded);
    }
  }, [detailFinding, tree, toggleInclude, detailIncluded]);

  // Render tree item
  const renderTreeItem = useCallback(
    (item: TreeListItem, index: number, isSelected: boolean) => {
      const { node } = item;
      const indent = treeChars.indent.repeat(node.depth);
      const severityColor = severityColors[node.severity];

      // Determine prefix (expand/collapse indicator or checkbox)
      let prefix = "";
      let label = node.label;

      if (node.type === "severity") {
        prefix = node.expanded ? treeChars.expanded : treeChars.collapsed;
        label = `${node.label} (${node.childCount})`;
      } else if (node.type === "category") {
        prefix = node.expanded ? treeChars.expanded : treeChars.collapsed;
        label = `${node.label} (${node.childCount})`;
      } else if (node.type === "finding") {
        prefix = node.included ? checkbox.checked : checkbox.unchecked;
      }

      // Include status for groups
      let includedStatus = "";
      if (node.type !== "finding" && node.includedCount !== undefined) {
        includedStatus = `[${node.includedCount} included]`;
      }

      // Truncate label for terminal width
      const maxLabelWidth = Math.max(
        20,
        terminalWidth - indent.length - prefix.length - includedStatus.length - 10
      );
      const truncatedLabel =
        label.length > maxLabelWidth
          ? label.substring(0, maxLabelWidth - 3) + "..."
          : label;

      if (node.type === "finding") {
        // Finding: show file path on first line, title on second
        const filePath = node.finding?.file || "";
        const maxPathWidth = Math.max(20, terminalWidth - 15);
        const truncatedPath =
          filePath.length > maxPathWidth
            ? "..." + filePath.substring(filePath.length - maxPathWidth + 3)
            : filePath;

        return (
          <Box flexDirection="column">
            <Box>
              <Text color={isSelected ? colors.primary : colors.gray}>
                {isSelected ? symbols.pointer : " "}{" "}
              </Text>
              <Text color={colors.gray}>{indent}</Text>
              <Text color={node.included ? colors.success : colors.gray}>
                {prefix}
              </Text>
              <Text color={colors.text}> {truncatedPath}</Text>
            </Box>
            <Box>
              <Text color={colors.gray}>
                {"  "}
                {indent}
                {"     "}
              </Text>
              <Text color={isSelected ? colors.text : colors.gray}>
                {truncatedLabel}
              </Text>
            </Box>
          </Box>
        );
      }

      // Severity or Category node
      return (
        <Box>
          <Text color={isSelected ? colors.primary : colors.gray}>
            {isSelected ? symbols.pointer : " "}{" "}
          </Text>
          <Text color={colors.gray}>{indent}</Text>
          <Text color={severityColor}>{prefix}</Text>
          <Text color={severityColor} bold={node.type === "severity"}>
            {" "}
            {truncatedLabel}
          </Text>
          {includedStatus && (
            <Text color={colors.gray}> {includedStatus}</Text>
          )}
        </Box>
      );
    },
    [terminalWidth]
  );

  // Show detail view if a finding is selected
  if (detailFinding) {
    const findingIndex = result.suggestions.findIndex(
      (s) => s === detailFinding
    );
    return (
      <FindingDetail
        finding={detailFinding}
        isIncluded={detailIncluded}
        currentIndex={findingIndex >= 0 ? findingIndex : 0}
        totalCount={result.suggestions.length}
        onToggleInclude={handleDetailToggle}
        onClose={handleDetailClose}
      />
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1} justifyContent="space-between">
        <Text color={colors.text} bold>
          Review Findings
        </Text>
        <Text color={colors.gray}>
          {includedCount}/{totalCount} included
        </Text>
      </Box>

      {/* Tree list */}
      <VirtualizedList
        items={listItems}
        renderItem={renderTreeItem}
        itemHeight={2}
        initialIndex={selectedIndex}
        onSelectionChange={(index) => setSelectedIndex(index)}
        isActive={!detailFinding}
        borderColor={colors.secondary}
        reservedLines={10}
        emptyMessage="No findings to review"
      />

      {/* Navigation help */}
      <Box marginTop={1} flexDirection="column">
        <Text color={colors.gray}>
          {symbols.arrowUp}
          {symbols.arrowDown} Navigate {symbols.bullet} Enter Expand/Collapse{" "}
          {symbols.bullet} Space Toggle
        </Text>
        <Text color={colors.gray}>
          X Exclude group {symbols.bullet} I Include group {symbols.bullet} V
          View detail {symbols.bullet} P Pass {symbols.pointer} Agent
        </Text>
      </Box>
    </Box>
  );
}
