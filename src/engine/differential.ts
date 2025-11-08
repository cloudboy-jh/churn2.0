/**
 * Differential Analysis for Churn
 *
 * Analyzes only the changed lines in staged files for dramatic token reduction
 * Perfect for pre-commit workflow where you just want to check "did I break something?"
 */

import { execSync } from 'child_process';
import * as path from 'path';

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'add' | 'remove' | 'context';
  lineNumber: number;  // Line number in new file
  content: string;
}

export interface FileDiff {
  filePath: string;
  relativePath: string;
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
}

/**
 * Get diff for staged files
 */
export async function getStagedDiff(cwd: string = process.cwd()): Promise<FileDiff[]> {
  try {
    // Get diff for staged files with unified context
    const diffOutput = execSync('git diff --staged --unified=3', {
      cwd,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB max
    });

    if (!diffOutput) {
      return [];
    }

    return parseDiff(diffOutput, cwd);
  } catch (error) {
    // Git command failed or no staged files
    return [];
  }
}

/**
 * Get diff for specific files
 */
export async function getFileDiff(
  filePath: string,
  cwd: string = process.cwd()
): Promise<FileDiff | null> {
  try {
    const diffOutput = execSync(`git diff --staged --unified=3 -- "${filePath}"`, {
      cwd,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });

    if (!diffOutput) {
      return null;
    }

    const diffs = parseDiff(diffOutput, cwd);
    return diffs[0] || null;
  } catch (error) {
    return null;
  }
}

/**
 * Parse git diff output into structured format
 */
function parseDiff(diffOutput: string, cwd: string): FileDiff[] {
  const diffs: FileDiff[] = [];
  const lines = diffOutput.split('\n');

  let currentFile: FileDiff | null = null;
  let currentHunk: DiffHunk | null = null;
  let newLineNumber = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // New file diff
    if (line.startsWith('diff --git')) {
      if (currentFile && currentHunk) {
        currentFile.hunks.push(currentHunk);
      }
      if (currentFile) {
        diffs.push(currentFile);
      }

      // Extract file path (from b/ part)
      const match = line.match(/b\/(.+)$/);
      if (match) {
        const filePath = path.join(cwd, match[1]);
        currentFile = {
          filePath,
          relativePath: match[1],
          hunks: [],
          additions: 0,
          deletions: 0,
        };
        currentHunk = null;
      }
      continue;
    }

    // Hunk header: @@ -oldStart,oldLines +newStart,newLines @@
    if (line.startsWith('@@')) {
      if (currentFile && currentHunk) {
        currentFile.hunks.push(currentHunk);
      }

      const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
      if (match && currentFile) {
        const oldStart = parseInt(match[1], 10);
        const oldLines = match[2] ? parseInt(match[2], 10) : 1;
        const newStart = parseInt(match[3], 10);
        const newLines = match[4] ? parseInt(match[4], 10) : 1;

        currentHunk = {
          oldStart,
          oldLines,
          newStart,
          newLines,
          lines: [],
        };

        newLineNumber = newStart;
      }
      continue;
    }

    // Diff content lines
    if (currentHunk && currentFile) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        // Added line
        currentHunk.lines.push({
          type: 'add',
          lineNumber: newLineNumber,
          content: line.slice(1), // Remove '+'
        });
        currentFile.additions++;
        newLineNumber++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        // Removed line
        currentHunk.lines.push({
          type: 'remove',
          lineNumber: -1, // Removed lines don't have new line numbers
          content: line.slice(1), // Remove '-'
        });
        currentFile.deletions++;
      } else if (line.startsWith(' ')) {
        // Context line
        currentHunk.lines.push({
          type: 'context',
          lineNumber: newLineNumber,
          content: line.slice(1), // Remove ' '
        });
        newLineNumber++;
      }
    }
  }

  // Push last hunk and file
  if (currentFile && currentHunk) {
    currentFile.hunks.push(currentHunk);
  }
  if (currentFile) {
    diffs.push(currentFile);
  }

  return diffs;
}

/**
 * Build a concise diff summary for prompts
 * Much smaller than full file content
 */
export function buildDiffContext(diff: FileDiff): string {
  const lines: string[] = [];

  lines.push(`File: ${diff.relativePath}`);
  lines.push(`Changes: +${diff.additions} -${diff.deletions}`);
  lines.push('');

  for (const hunk of diff.hunks) {
    lines.push(`@@ Lines ${hunk.newStart}-${hunk.newStart + hunk.newLines - 1} @@`);

    for (const line of hunk.lines) {
      if (line.type === 'add') {
        lines.push(`+ ${line.content}`);
      } else if (line.type === 'remove') {
        lines.push(`- ${line.content}`);
      } else {
        lines.push(`  ${line.content}`);
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Check if diff is too large for efficient analysis
 * If a file has massive changes, better to analyze the full file
 */
export function isDiffTooLarge(diff: FileDiff, maxChanges: number = 100): boolean {
  const totalChanges = diff.additions + diff.deletions;
  return totalChanges > maxChanges;
}

/**
 * Get only the added/modified lines from a diff
 * Useful for focused analysis on what changed
 */
export function getChangedLines(diff: FileDiff): { lineNumber: number; content: string }[] {
  const changedLines: { lineNumber: number; content: string }[] = [];

  for (const hunk of diff.hunks) {
    for (const line of hunk.lines) {
      if (line.type === 'add' && line.lineNumber > 0) {
        changedLines.push({
          lineNumber: line.lineNumber,
          content: line.content,
        });
      }
    }
  }

  return changedLines;
}

/**
 * Calculate approximate token savings from using diff instead of full file
 */
export function estimateDiffTokenSavings(
  diff: FileDiff,
  fullFileSize: number
): { diffTokens: number; fullTokens: number; savings: number } {
  // Rough estimate: 4 characters per token
  const diffContext = buildDiffContext(diff);
  const diffTokens = Math.ceil(diffContext.length / 4);
  const fullTokens = Math.ceil(fullFileSize / 4);
  const savings = fullTokens - diffTokens;

  return {
    diffTokens,
    fullTokens,
    savings,
  };
}

/**
 * Build a specialized prompt for diff analysis
 * Focus: "Did this change introduce any issues?"
 */
export function buildDiffPrompt(diff: FileDiff, language: string): string {
  const diffContext = buildDiffContext(diff);

  return `Review this code change and identify any issues introduced by the modifications.

${diffContext}

Language: ${language}

Focus ONLY on the changed lines (marked with +). Check for:
- **Bugs**: Syntax errors, logic errors, type errors introduced by the change
- **Breaking Changes**: API changes that could break existing code
- **Security**: New vulnerabilities introduced (SQL injection, XSS, exposed secrets)
- **Performance**: Obvious performance regressions in the new code
- **Best Practices**: Violations of language idioms in the changed lines

**Important**: Only report issues if you're confident they were introduced by THIS change.
Don't suggest improvements to unchanged code.

Respond in JSON format:
{
  "suggestions": [
    {
      "category": "bug|optimization|style",
      "severity": "medium|high",
      "title": "Brief issue title",
      "description": "What the change broke or introduced",
      "suggestion": "How to fix it",
      "code": {
        "before": "the problematic changed line",
        "after": "corrected version",
        "startLine": ${diff.hunks[0]?.newStart || 1},
        "endLine": ${diff.hunks[0]?.newStart || 1}
      }
    }
  ]
}

If the changes look good, return an empty suggestions array. Be concise - only report real issues.`;
}

/**
 * Check if a file should use diff analysis vs full analysis
 */
export function shouldUseDiffAnalysis(
  diff: FileDiff,
  fileSize: number,
  mode: 'staged' | 'full'
): boolean {
  // Only use diff for staged mode
  if (mode !== 'staged') {
    return false;
  }

  // Don't use diff if too many changes (better to see full context)
  if (isDiffTooLarge(diff, 100)) {
    return false;
  }

  // Use diff if it provides significant token savings
  const { savings } = estimateDiffTokenSavings(diff, fileSize);
  return savings > 500; // Must save at least ~500 tokens to be worth it
}
