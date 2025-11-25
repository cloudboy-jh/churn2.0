import path from "path";
import fg from "fast-glob";
import simpleGit from "simple-git";
import fs from "fs-extra";
import { isGitRepo } from "./git.js";
import { InsightsConfig } from "./config.js";

// Types
export interface FileAgeInfo {
  path: string;
  firstCommitDate: Date | null;
  lastCommitDate: Date | null;
  ageInDays: number;
  commitCount: number;
  lastAuthor: string;
}

export interface DirectoryAgeInfo {
  path: string;
  avgAgeDays: number;
  fileCount: number;
  oldestFile: string;
  newestFile: string;
  recentCommitCount: number;
}

export interface OrphanedFile {
  path: string;
  ageDays: number;
  lastModified: Date;
  reason: "no-imports" | "no-exports" | "dead-code";
}

export interface CodeAgeResult {
  hotZones: DirectoryAgeInfo[];
  coldZones: DirectoryAgeInfo[];
  orphanedFiles: OrphanedFile[];
  fileAges: FileAgeInfo[];
  summary: {
    avgCodeAgeDays: number;
    oldestFileDays: number;
    newestFileDays: number;
    orphanedFileCount: number;
  };
}

/**
 * Get file age information using git log
 */
async function getFileAgeInfo(
  filePath: string,
  cwd: string,
): Promise<FileAgeInfo | null> {
  const git = simpleGit(cwd);
  const relativePath = path.relative(cwd, filePath);

  try {
    // Get all commits for this file
    const log = await git.log({ file: relativePath, maxCount: 100 });

    if (!log.all || log.all.length === 0) {
      // File might be new/untracked
      return {
        path: relativePath,
        firstCommitDate: null,
        lastCommitDate: null,
        ageInDays: 0,
        commitCount: 0,
        lastAuthor: "unknown",
      };
    }

    const commits = log.all;
    const firstCommit = commits[commits.length - 1];
    const lastCommit = commits[0];

    const firstDate = new Date(firstCommit.date);
    const lastDate = new Date(lastCommit.date);
    const now = new Date();
    const ageInDays = Math.floor(
      (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      path: relativePath,
      firstCommitDate: firstDate,
      lastCommitDate: lastDate,
      ageInDays,
      commitCount: commits.length,
      lastAuthor: lastCommit.author_name,
    };
  } catch {
    return null;
  }
}

/**
 * Batch get file ages for multiple files (more efficient)
 */
async function batchGetFileAges(
  files: string[],
  cwd: string,
): Promise<Map<string, FileAgeInfo>> {
  const results = new Map<string, FileAgeInfo>();

  // Process files in parallel with concurrency limit
  const concurrency = 10;
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    const promises = batch.map((file) => getFileAgeInfo(file, cwd));
    const batchResults = await Promise.all(promises);

    for (let j = 0; j < batch.length; j++) {
      const info = batchResults[j];
      if (info) {
        results.set(info.path, info);
      }
    }
  }

  return results;
}

/**
 * Calculate directory-level age metrics
 */
function calculateDirectoryAges(
  fileAges: Map<string, FileAgeInfo>,
  cwd: string,
): DirectoryAgeInfo[] {
  // Group files by directory
  const dirMap = new Map<
    string,
    {
      files: FileAgeInfo[];
      totalAge: number;
      recentCommits: number;
    }
  >();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  for (const [filePath, info] of fileAges.entries()) {
    const dir = path.dirname(filePath);

    if (!dirMap.has(dir)) {
      dirMap.set(dir, { files: [], totalAge: 0, recentCommits: 0 });
    }

    const dirData = dirMap.get(dir)!;
    dirData.files.push(info);
    dirData.totalAge += info.ageInDays;

    // Count recent commits
    if (info.lastCommitDate && info.lastCommitDate > thirtyDaysAgo) {
      dirData.recentCommits += info.commitCount;
    }
  }

  // Build directory age info
  const dirAges: DirectoryAgeInfo[] = [];

  for (const [dir, data] of dirMap.entries()) {
    if (data.files.length === 0) continue;

    // Sort files by age
    const sortedByAge = [...data.files].sort(
      (a, b) => b.ageInDays - a.ageInDays,
    );
    const oldest = sortedByAge[0];
    const newest = sortedByAge[sortedByAge.length - 1];

    dirAges.push({
      path: dir,
      avgAgeDays: Math.round(data.totalAge / data.files.length),
      fileCount: data.files.length,
      oldestFile: oldest.path,
      newestFile: newest.path,
      recentCommitCount: data.recentCommits,
    });
  }

  return dirAges;
}

/**
 * Classify directories into hot and cold zones
 */
function classifyZones(
  dirAges: DirectoryAgeInfo[],
  config: InsightsConfig,
): { hotZones: DirectoryAgeInfo[]; coldZones: DirectoryAgeInfo[] } {
  const { hotZoneMaxDays, coldZoneMinDays } = config.codeAgeThresholds;

  const hotZones = dirAges
    .filter(
      (dir) => dir.avgAgeDays <= hotZoneMaxDays && dir.recentCommitCount > 0,
    )
    .sort((a, b) => b.recentCommitCount - a.recentCommitCount)
    .slice(0, 10);

  const coldZones = dirAges
    .filter(
      (dir) => dir.avgAgeDays >= coldZoneMinDays && dir.recentCommitCount === 0,
    )
    .sort((a, b) => b.avgAgeDays - a.avgAgeDays)
    .slice(0, 10);

  return { hotZones, coldZones };
}

/**
 * Find potentially orphaned files (old files with no imports)
 */
async function findOrphanedFiles(
  fileAges: Map<string, FileAgeInfo>,
  allFiles: string[],
  cwd: string,
  minAgeDays: number,
): Promise<OrphanedFile[]> {
  const orphaned: OrphanedFile[] = [];

  // Build a set of all imported files by scanning for imports
  const importedFiles = new Set<string>();

  // Simple heuristic: scan all files for import statements
  for (const file of allFiles) {
    try {
      const content = await fs.readFile(file, "utf-8");

      // Extract imported file paths (local imports only)
      const importMatches = content.matchAll(
        /(?:import|from|require)\s*\(?['"]([^'"]+)['"]/g,
      );

      for (const match of importMatches) {
        const importPath = match[1];
        if (importPath.startsWith(".")) {
          // Resolve relative import
          const dir = path.dirname(file);
          const resolved = path.resolve(dir, importPath);

          // Try common extensions
          const extensions = ["", ".ts", ".tsx", ".js", ".jsx", ".json"];
          for (const ext of extensions) {
            const fullPath = resolved + ext;
            const relativePath = path.relative(cwd, fullPath);
            importedFiles.add(relativePath);

            // Also handle index files
            const indexPath = path.join(resolved, `index${ext}`);
            importedFiles.add(path.relative(cwd, indexPath));
          }
        }
      }
    } catch {
      // Skip files that can't be read
    }
  }

  // Find old files that are not imported
  for (const [filePath, info] of fileAges.entries()) {
    if (info.ageInDays < minAgeDays) continue;

    // Skip index files (entry points)
    const basename = path.basename(filePath);
    if (basename.startsWith("index.")) continue;

    // Skip config/setup files
    if (
      basename.includes("config") ||
      basename.includes("setup") ||
      basename.includes("main")
    ) {
      continue;
    }

    // Check if file is imported anywhere
    const isImported = importedFiles.has(filePath);

    if (!isImported) {
      orphaned.push({
        path: filePath,
        ageDays: info.ageInDays,
        lastModified: info.lastCommitDate || new Date(),
        reason: "no-imports",
      });
    }
  }

  // Sort by age (oldest first) and limit
  return orphaned.sort((a, b) => b.ageDays - a.ageDays).slice(0, 20);
}

/**
 * Scan all source files in the project
 */
async function scanProjectFiles(
  cwd: string,
  excludePatterns: string[],
): Promise<string[]> {
  const patterns = [
    "**/*.js",
    "**/*.jsx",
    "**/*.ts",
    "**/*.tsx",
    "**/*.py",
    "**/*.go",
    "**/*.rs",
  ];

  const exclude = [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.churn/**",
    "**/*.d.ts",
    "**/*.min.js",
    "**/*.test.*",
    "**/*.spec.*",
    "**/__tests__/**",
    ...excludePatterns.map((p) => `**/${p}/**`),
  ];

  const files = await fg(patterns, {
    cwd,
    absolute: true,
    ignore: exclude,
    onlyFiles: true,
  });

  return files;
}

/**
 * Main entry point for code age analysis
 */
export async function analyzeCodeAge(
  cwd: string = process.cwd(),
  config: InsightsConfig,
): Promise<CodeAgeResult | null> {
  // Check if we're in a git repo
  if (!(await isGitRepo(cwd))) {
    return null;
  }

  // Scan all source files
  const files = await scanProjectFiles(cwd, config.excludeFromAgeAnalysis);

  if (files.length === 0) {
    return null;
  }

  // Get file age information
  const fileAges = await batchGetFileAges(files, cwd);

  if (fileAges.size === 0) {
    return null;
  }

  // Calculate directory ages
  const dirAges = calculateDirectoryAges(fileAges, cwd);

  // Classify zones
  const { hotZones, coldZones } = classifyZones(dirAges, config);

  // Find orphaned files
  const orphanedFiles = await findOrphanedFiles(
    fileAges,
    files,
    cwd,
    config.codeAgeThresholds.orphanedFileMinDays,
  );

  // Calculate summary statistics
  const ages = Array.from(fileAges.values())
    .map((f) => f.ageInDays)
    .filter((a) => a > 0);

  const avgCodeAgeDays =
    ages.length > 0
      ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length)
      : 0;

  const oldestFileDays = ages.length > 0 ? Math.max(...ages) : 0;
  const newestFileDays = ages.length > 0 ? Math.min(...ages) : 0;

  return {
    hotZones,
    coldZones,
    orphanedFiles,
    fileAges: Array.from(fileAges.values()),
    summary: {
      avgCodeAgeDays,
      oldestFileDays,
      newestFileDays,
      orphanedFileCount: orphanedFiles.length,
    },
  };
}
