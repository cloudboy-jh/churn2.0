/**
 * Smart File Grouping for Churn
 *
 * Groups related files (component + test + styles) for cross-file analysis
 * to catch issues like unused exports, missing tests, or inconsistencies.
 */

import * as path from 'path';

export interface FileGroup {
  primary: string;      // Main file (e.g., Component.tsx)
  related: string[];    // Related files (tests, styles, types)
  type: 'component' | 'api' | 'module' | 'standalone';
}

/**
 * Group related files together for cross-file analysis
 */
export function groupRelatedFiles(files: string[]): FileGroup[] {
  const groups: FileGroup[] = [];
  const grouped = new Set<string>();

  // Sort files to ensure consistent grouping
  const sortedFiles = [...files].sort();

  for (const file of sortedFiles) {
    // Skip if already grouped
    if (grouped.has(file)) continue;

    const relatedFiles = findRelatedFiles(file, sortedFiles);

    if (relatedFiles.length > 0) {
      // This file has related files - create a group
      const group: FileGroup = {
        primary: file,
        related: relatedFiles,
        type: determineGroupType(file, relatedFiles),
      };

      groups.push(group);

      // Mark all files in this group as grouped
      grouped.add(file);
      relatedFiles.forEach(f => grouped.add(f));
    }
  }

  // Return standalone files that weren't grouped
  const standaloneFiles = sortedFiles.filter(f => !grouped.has(f));

  return [
    ...groups,
    ...standaloneFiles.map(f => ({
      primary: f,
      related: [],
      type: 'standalone' as const,
    }))
  ];
}

/**
 * Find files related to the given file
 */
function findRelatedFiles(file: string, allFiles: string[]): string[] {
  const related: string[] = [];
  const baseName = getBaseName(file);
  const dir = path.dirname(file);
  const ext = path.extname(file);

  if (!baseName) return related;

  for (const otherFile of allFiles) {
    if (otherFile === file) continue;

    const otherBaseName = getBaseName(otherFile);
    const otherDir = path.dirname(otherFile);

    // Must be in same directory (or close by)
    if (otherDir !== dir && !isCloseDirectory(dir, otherDir)) {
      continue;
    }

    // Check if base names match
    if (otherBaseName === baseName) {
      related.push(otherFile);
      continue;
    }

    // Check for test file patterns
    if (isTestFileFor(otherFile, file)) {
      related.push(otherFile);
      continue;
    }

    // Check for style file patterns
    if (isStyleFileFor(otherFile, file)) {
      related.push(otherFile);
      continue;
    }

    // Check for type definition files
    if (isTypeFileFor(otherFile, file)) {
      related.push(otherFile);
      continue;
    }
  }

  return related;
}

/**
 * Get base name without test/spec/style suffixes and extension
 * Example: "Button.test.tsx" -> "Button"
 */
function getBaseName(file: string): string {
  let name = path.basename(file);

  // Remove extension
  name = name.replace(path.extname(name), '');

  // Remove common suffixes
  name = name.replace(/\.(test|spec|stories|types|d)$/, '');
  name = name.replace(/\.(module|styles)$/, '');
  name = name.replace(/_(test|spec)$/, '');

  return name;
}

/**
 * Check if two directories are close (same or one level apart)
 */
function isCloseDirectory(dir1: string, dir2: string): boolean {
  // Same directory
  if (dir1 === dir2) return true;

  // One is parent of the other
  const parent1 = path.dirname(dir1);
  const parent2 = path.dirname(dir2);

  return parent1 === dir2 || parent2 === dir1;
}

/**
 * Check if otherFile is a test file for mainFile
 */
function isTestFileFor(testFile: string, mainFile: string): boolean {
  const testName = path.basename(testFile).toLowerCase();
  const mainName = path.basename(mainFile);
  const mainBase = getBaseName(mainFile);

  // Check for .test. or .spec. pattern
  if (testName.includes('.test.') || testName.includes('.spec.')) {
    return testName.includes(mainBase.toLowerCase());
  }

  // Check for _test pattern (Go, Python)
  if (testName.includes('_test.')) {
    return testName.includes(mainBase.toLowerCase());
  }

  return false;
}

/**
 * Check if otherFile is a style file for mainFile
 */
function isStyleFileFor(styleFile: string, mainFile: string): boolean {
  const styleName = path.basename(styleFile).toLowerCase();
  const mainBase = getBaseName(mainFile);
  const styleExt = path.extname(styleFile).toLowerCase();

  // Must be a style file extension
  const styleExtensions = ['.css', '.scss', '.sass', '.less', '.styl'];
  if (!styleExtensions.includes(styleExt)) {
    return false;
  }

  // Check for .module.css or .styles.ts pattern
  if (styleName.includes('.module.') || styleName.includes('.styles.')) {
    return styleName.includes(mainBase.toLowerCase());
  }

  // Check if base names match
  return getBaseName(styleFile).toLowerCase() === mainBase.toLowerCase();
}

/**
 * Check if otherFile is a type definition for mainFile
 */
function isTypeFileFor(typeFile: string, mainFile: string): boolean {
  const typeName = path.basename(typeFile).toLowerCase();
  const mainBase = getBaseName(mainFile);
  const typeExt = path.extname(typeFile).toLowerCase();

  // Must be .d.ts or .types.ts
  if (typeExt !== '.ts' || (!typeName.endsWith('.d.ts') && !typeName.includes('.types.'))) {
    return false;
  }

  return typeName.includes(mainBase.toLowerCase());
}

/**
 * Determine the type of a file group
 */
function determineGroupType(primary: string, related: string[]): FileGroup['type'] {
  const ext = path.extname(primary).toLowerCase();
  const name = path.basename(primary).toLowerCase();

  // Component files (React, Vue, Svelte)
  if (['.tsx', '.jsx', '.vue', '.svelte'].includes(ext)) {
    return 'component';
  }

  // API route files
  if (name.includes('route') || name.includes('api') || name.includes('handler')) {
    return 'api';
  }

  // Module with multiple related files
  if (related.length > 1) {
    return 'module';
  }

  return 'standalone';
}

/**
 * Check if a file group should be analyzed together
 * Small groups are good candidates, very large groups should be split
 */
export function shouldAnalyzeTogether(group: FileGroup, maxGroupSize: number = 3): boolean {
  // Standalone files are always analyzed alone
  if (group.type === 'standalone') {
    return false;
  }

  // Don't group if too many files (would overwhelm context)
  const totalFiles = 1 + group.related.length;
  if (totalFiles > maxGroupSize) {
    return false;
  }

  // Component groups are great for cross-file analysis
  if (group.type === 'component' && totalFiles <= 3) {
    return true;
  }

  // API groups benefit from seeing tests and types together
  if (group.type === 'api' && totalFiles <= 3) {
    return true;
  }

  // Module groups can be analyzed together if small
  if (group.type === 'module' && totalFiles === 2) {
    return true;
  }

  return false;
}

/**
 * Split a large file group into smaller chunks
 */
export function splitFileGroup(group: FileGroup, maxSize: number = 3): FileGroup[] {
  const totalFiles = 1 + group.related.length;

  if (totalFiles <= maxSize) {
    return [group];
  }

  // Split related files into chunks
  const chunks: FileGroup[] = [];

  // First chunk: primary + first few related
  chunks.push({
    primary: group.primary,
    related: group.related.slice(0, maxSize - 1),
    type: group.type,
  });

  // Remaining files as standalone
  for (const file of group.related.slice(maxSize - 1)) {
    chunks.push({
      primary: file,
      related: [],
      type: 'standalone',
    });
  }

  return chunks;
}

/**
 * Get all files from a group (primary + related)
 */
export function getAllFilesInGroup(group: FileGroup): string[] {
  return [group.primary, ...group.related];
}

/**
 * Build a description of the file group for prompts
 */
export function describeFileGroup(group: FileGroup): string {
  if (group.type === 'standalone') {
    return `Single file: ${path.basename(group.primary)}`;
  }

  const files = getAllFilesInGroup(group);
  const fileNames = files.map(f => path.basename(f)).join(', ');

  return `Related files (${group.type}): ${fileNames}`;
}
