import simpleGit, { SimpleGit, StatusResult } from 'simple-git';
import path from 'path';
import fs from 'fs-extra';

export interface RepoInfo {
  path: string;
  name: string;
  branch: string;
  isClean: boolean;
  hasStaged: boolean;
  fileCount: number;
  remote?: string;
  lastCommit?: {
    hash: string;
    message: string;
    author: string;
    date: Date;
  };
}

export interface GitFile {
  path: string;
  status: string;
  staged: boolean;
}

// Detect if current directory is a git repository
export async function isGitRepo(cwd: string = process.cwd()): Promise<boolean> {
  try {
    const git = simpleGit(cwd);
    await git.status();
    return true;
  } catch {
    return false;
  }
}

// Get repository information
export async function getRepoInfo(cwd: string = process.cwd()): Promise<RepoInfo | null> {
  if (!(await isGitRepo(cwd))) {
    return null;
  }

  const git = simpleGit(cwd);
  const status = await git.status();
  const branch = status.current || 'unknown';

  // Get remote URL
  let remote: string | undefined;
  try {
    const remotes = await git.getRemotes(true);
    remote = remotes.find(r => r.name === 'origin')?.refs.fetch;
  } catch {
    // No remote configured
  }

  // Get last commit
  let lastCommit;
  try {
    const log = await git.log({ maxCount: 1 });
    if (log.latest) {
      lastCommit = {
        hash: log.latest.hash,
        message: log.latest.message,
        author: log.latest.author_name,
        date: new Date(log.latest.date),
      };
    }
  } catch {
    // No commits yet
  }

  // Count files in repo
  const fileCount = await countRepoFiles(cwd);

  return {
    path: cwd,
    name: path.basename(cwd),
    branch,
    isClean: status.isClean(),
    hasStaged: status.staged.length > 0,
    fileCount,
    remote,
    lastCommit,
  };
}

// Count files in repository (excluding .git and node_modules)
async function countRepoFiles(cwd: string): Promise<number> {
  let count = 0;

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules') {
        continue;
      }

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        count++;
      }
    }
  }

  await walk(cwd);
  return count;
}

// Get git status
export async function getStatus(cwd: string = process.cwd()): Promise<StatusResult | null> {
  if (!(await isGitRepo(cwd))) {
    return null;
  }

  const git = simpleGit(cwd);
  return await git.status();
}

// Get staged files
export async function getStagedFiles(cwd: string = process.cwd()): Promise<GitFile[]> {
  const status = await getStatus(cwd);
  if (!status) return [];

  return status.staged.map(file => ({
    path: file,
    status: 'staged',
    staged: true,
  }));
}

// Get modified files
export async function getModifiedFiles(cwd: string = process.cwd()): Promise<GitFile[]> {
  const status = await getStatus(cwd);
  if (!status) return [];

  return status.modified.map(file => ({
    path: file,
    status: 'modified',
    staged: false,
  }));
}

// Get all changed files (staged + modified)
export async function getChangedFiles(cwd: string = process.cwd()): Promise<GitFile[]> {
  const staged = await getStagedFiles(cwd);
  const modified = await getModifiedFiles(cwd);

  // Deduplicate by path
  const fileMap = new Map<string, GitFile>();

  for (const file of [...staged, ...modified]) {
    fileMap.set(file.path, file);
  }

  return Array.from(fileMap.values());
}

// Get diff for a file
export async function getFileDiff(
  filePath: string,
  cwd: string = process.cwd()
): Promise<string> {
  const git = simpleGit(cwd);

  try {
    // Try staged diff first
    const stagedDiff = await git.diff(['--cached', '--', filePath]);
    if (stagedDiff) return stagedDiff;

    // Fall back to working tree diff
    const workingDiff = await git.diff(['--', filePath]);
    return workingDiff;
  } catch {
    return '';
  }
}

// Get diff for all changed files
export async function getAllDiffs(cwd: string = process.cwd()): Promise<string> {
  const git = simpleGit(cwd);

  try {
    const stagedDiff = await git.diff(['--cached']);
    const workingDiff = await git.diff();

    return [stagedDiff, workingDiff].filter(Boolean).join('\n\n');
  } catch {
    return '';
  }
}

// Create a patch file
export async function createPatch(
  outputPath: string,
  cwd: string = process.cwd()
): Promise<void> {
  const diff = await getAllDiffs(cwd);
  await fs.writeFile(outputPath, diff, 'utf-8');
}

// Detect project type based on files
export async function detectProjectType(cwd: string = process.cwd()): Promise<string> {
  const indicators = [
    { file: 'package.json', type: 'JavaScript/TypeScript' },
    { file: 'Cargo.toml', type: 'Rust' },
    { file: 'go.mod', type: 'Go' },
    { file: 'requirements.txt', type: 'Python' },
    { file: 'Gemfile', type: 'Ruby' },
    { file: 'pom.xml', type: 'Java (Maven)' },
    { file: 'build.gradle', type: 'Java (Gradle)' },
    { file: 'composer.json', type: 'PHP' },
  ];

  for (const { file, type } of indicators) {
    if (await fs.pathExists(path.join(cwd, file))) {
      return type;
    }
  }

  return 'Unknown';
}
