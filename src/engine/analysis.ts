import fg from "fast-glob";
import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import { getRepoInfo, getChangedFiles, getAllDiffs } from "./git.js";
import { ModelConfig, sendPrompt, Message } from "./models.js";
import { getConcurrency } from "./config.js";

export interface AnalysisContext {
  mode: "full" | "staged" | "files";
  files?: string[];
  includePatterns?: string[];
  excludePatterns?: string[];
}

export interface AnalysisProgress {
  phase: "scanning" | "analyzing" | "generating" | "complete";
  current: number;
  total: number;
  currentFile?: string;
  currentBatch?: string[]; // Files currently being analyzed in parallel
  inProgress?: number; // Number of files currently being processed
  message?: string;
  avgTimePerFile?: number; // Average time per file in ms
  eta?: number; // Estimated time remaining in ms
}

export interface FileSuggestion {
  file: string;
  category: "refactor" | "bug" | "optimization" | "style" | "documentation";
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  suggestion: string;
  code?: {
    before: string;
    after: string;
    startLine?: number;
    endLine?: number;
  };
}

export interface AnalysisResult {
  summary: {
    filesAnalyzed: number;
    suggestions: number;
    categories: Record<string, number>;
    duration: number;
  };
  suggestions: FileSuggestion[];
  metadata: {
    timestamp: string;
    model: string;
    provider: string;
    mode: string;
  };
}

interface CacheEntry {
  fileHash: string;
  suggestions: FileSuggestion[];
  lastModified: number;
  model: string;
  provider: string;
}

interface AnalysisCache {
  version: string;
  entries: Record<string, CacheEntry>; // Key: file path
}

const DEFAULT_EXCLUDE = [
  // Dependencies and vendor code
  "**/node_modules/**",
  "**/vendor/**",
  "**/third_party/**",

  // Version control
  "**/.git/**",
  "**/.svn/**",
  "**/.hg/**",

  // Build outputs
  "**/dist/**",
  "**/build/**",
  "**/out/**",
  "**/.next/**",
  "**/.nuxt/**",

  // Tool directories
  "**/.churn/**",
  "**/.vscode/**",
  "**/.idea/**",

  // Generated code
  "**/generated/**",
  "**/__generated__/**",
  "**/gen/**",

  // Minified and compiled
  "**/*.min.js",
  "**/*.min.css",
  "**/*.bundle.js",
  "**/*.map",

  // Lock files
  "**/*.lock",
  "**/package-lock.json",
  "**/yarn.lock",
  "**/pnpm-lock.yaml",
  "**/Gemfile.lock",
  "**/Cargo.lock",

  // Type definitions (usually generated)
  "**/*.d.ts",

  // Test files (can be analyzed separately)
  "**/*.test.ts",
  "**/*.test.tsx",
  "**/*.test.js",
  "**/*.test.jsx",
  "**/*.spec.ts",
  "**/*.spec.tsx",
  "**/*.spec.js",
  "**/*.spec.jsx",
  "**/__tests__/**",
  "**/__mocks__/**",

  // Documentation build outputs
  "**/docs/_build/**",
  "**/site/**",
];

// Hash file content for caching
function hashFileContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

// Load cache from disk
async function loadCache(cwd: string = process.cwd()): Promise<AnalysisCache> {
  const cachePath = path.join(cwd, ".churn", "cache", "analysis-cache.json");

  try {
    if (await fs.pathExists(cachePath)) {
      const cache = await fs.readJSON(cachePath);
      return cache;
    }
  } catch (error) {
    // If cache is corrupted, ignore it
  }

  return {
    version: "1.0.0",
    entries: {},
  };
}

// Save cache to disk
async function saveCache(
  cache: AnalysisCache,
  cwd: string = process.cwd(),
): Promise<void> {
  const cacheDir = path.join(cwd, ".churn", "cache");
  const cachePath = path.join(cacheDir, "analysis-cache.json");

  await fs.ensureDir(cacheDir);
  await fs.writeJSON(cachePath, cache, { spaces: 2 });
}

// Get cached suggestions if file hasn't changed
async function getCachedSuggestions(
  filePath: string,
  content: string,
  modelConfig: ModelConfig,
  cache: AnalysisCache,
  cwd: string = process.cwd(),
): Promise<FileSuggestion[] | null> {
  const relativePath = path.relative(cwd, filePath);
  const entry = cache.entries[relativePath];

  if (!entry) return null;

  // Check if file content changed
  const currentHash = hashFileContent(content);
  if (entry.fileHash !== currentHash) return null;

  // Check if same model
  if (
    entry.model !== modelConfig.model ||
    entry.provider !== modelConfig.provider
  ) {
    return null;
  }

  // Check if cache is too old (30 days)
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  if (entry.lastModified < thirtyDaysAgo) return null;

  return entry.suggestions;
}

// Update cache with new suggestions
function updateCache(
  cache: AnalysisCache,
  filePath: string,
  content: string,
  suggestions: FileSuggestion[],
  modelConfig: ModelConfig,
  cwd: string = process.cwd(),
): void {
  const relativePath = path.relative(cwd, filePath);
  const fileHash = hashFileContent(content);

  cache.entries[relativePath] = {
    fileHash,
    suggestions,
    lastModified: Date.now(),
    model: modelConfig.model,
    provider: modelConfig.provider,
  };
}

// Invalidate old cache entries
function invalidateOldCache(cache: AnalysisCache): void {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  for (const [filePath, entry] of Object.entries(cache.entries)) {
    if (entry.lastModified < thirtyDaysAgo) {
      delete cache.entries[filePath];
    }
  }
}

// Get language familiarity score for a file extension based on model
function getLanguageScore(
  ext: string,
  provider: string,
  model: string,
): number {
  // Returns 0-5 based on model's strength with this language
  const scores: Record<string, Record<string, number>> = {
    anthropic: {
      ".ts": 5,
      ".tsx": 5,
      ".py": 5,
      ".rs": 5,
      ".go": 4,
      ".js": 4,
      ".jsx": 4,
      ".java": 4,
      ".cpp": 3,
      ".php": 2,
      ".rb": 3,
      ".swift": 3,
      ".c": 3,
    },
    openai: {
      ".py": 5,
      ".js": 5,
      ".ts": 5,
      ".java": 5,
      ".cpp": 4,
      ".cs": 4,
      ".go": 4,
      ".rb": 4,
      ".rs": 3,
      ".swift": 3,
      ".kt": 3,
      ".tsx": 5,
      ".jsx": 5,
    },
    google: {
      ".py": 5,
      ".js": 5,
      ".java": 5,
      ".go": 5,
      ".ts": 4,
      ".cpp": 4,
      ".kt": 4,
      ".tsx": 4,
      ".jsx": 5,
      ".rs": 3,
      ".swift": 3,
      ".php": 3,
    },
    ollama: {
      // Depends on the model, use conservative scores
      ".py": 4,
      ".js": 4,
      ".cpp": 4,
      ".java": 4,
      ".ts": 4,
      ".go": 4,
      ".rs": 4,
      ".tsx": 4,
      ".jsx": 4,
    },
  };

  return scores[provider]?.[ext] || 2; // Default to 2
}

// Prioritize files for analysis based on model strength and file importance
function prioritizeFiles(
  files: string[],
  modelConfig: ModelConfig,
  cwd: string = process.cwd(),
): string[] {
  interface FilePriority {
    file: string;
    priority: number;
  }

  const priorities: FilePriority[] = files.map((file) => {
    const ext = path.extname(file);
    let priority = 100; // Base priority

    try {
      const stats = fs.statSync(file);

      // 1. Model language familiarity (most important)
      const langScore = getLanguageScore(
        ext,
        modelConfig.provider,
        modelConfig.model,
      );
      priority += langScore * 10; // 0-50 points

      // 2. File size (smaller = faster feedback)
      if (stats.size < 10_000)
        priority += 20; // Small files first
      else if (stats.size < 50_000) priority += 10;
      else if (stats.size > 80_000) priority -= 10; // Large files last

      // 3. File importance heuristics
      const basename = path.basename(file);
      if (basename.includes("index.") || basename.includes("main."))
        priority += 15;
      if (basename.includes("config.") || basename.includes("setup."))
        priority += 10;
      if (basename.includes("test.") || basename.includes(".test."))
        priority -= 5;
    } catch (error) {
      // If we can't stat the file, give it default priority
    }

    return { file, priority };
  });

  // Sort by priority descending (highest priority first)
  return priorities.sort((a, b) => b.priority - a.priority).map((p) => p.file);
}

// Scan files based on context
export async function scanFiles(
  context: AnalysisContext,
  cwd: string = process.cwd(),
): Promise<string[]> {
  if (context.mode === "staged") {
    const changedFiles = await getChangedFiles(cwd);
    return changedFiles.map((f) => path.join(cwd, f.path));
  }

  if (context.mode === "files" && context.files) {
    return context.files.map((f) =>
      path.isAbsolute(f) ? f : path.join(cwd, f),
    );
  }

  // Full repo scan
  const patterns = context.includePatterns || ["**/*"];
  const exclude = [...DEFAULT_EXCLUDE, ...(context.excludePatterns || [])];

  const files = await fg(patterns, {
    cwd,
    absolute: true,
    ignore: exclude,
    onlyFiles: true,
  });

  return files;
}

// Read file content with size limit
async function readFileContent(
  filePath: string,
  maxSize: number = 100_000,
): Promise<string | null> {
  try {
    const stats = await fs.stat(filePath);
    if (stats.size > maxSize) {
      return null; // Skip large files
    }

    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

// Analyze a single file
async function analyzeFile(
  filePath: string,
  modelConfig: ModelConfig,
  cwd: string,
): Promise<FileSuggestion[]> {
  const content = await readFileContent(filePath);
  if (!content) return [];

  const relativePath = path.relative(cwd, filePath);
  const ext = path.extname(filePath);

  const prompt = `You are a code review assistant. Analyze the following file and provide actionable suggestions for improvement.

File: ${relativePath}
Language: ${getLanguageFromExtension(ext)}

\`\`\`${ext.slice(1)}
${content}
\`\`\`

Provide your analysis in JSON format with the following structure:
{
  "suggestions": [
    {
      "category": "refactor|bug|optimization|style|documentation",
      "severity": "low|medium|high",
      "title": "Brief title",
      "description": "Detailed description",
      "suggestion": "Specific recommendation",
      "code": {
        "before": "original code snippet",
        "after": "improved code snippet",
        "startLine": 10,
        "endLine": 15
      }
    }
  ]
}

Focus on:
- Code quality and maintainability
- Potential bugs or edge cases
- Performance optimizations
- Best practices for the language/framework
- Documentation improvements

Only include meaningful suggestions. Return an empty array if the code looks good.`;

  const messages: Message[] = [
    {
      role: "system",
      content:
        "You are an expert code reviewer. Provide concise, actionable feedback in valid JSON format.",
    },
    {
      role: "user",
      content: prompt,
    },
  ];

  try {
    const response = await sendPrompt(modelConfig, messages);

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response.trim();
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?$/g, "");
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/```\n?/g, "");
    }

    const parsed = JSON.parse(jsonStr);
    const suggestions = parsed.suggestions || [];

    return suggestions.map((s: any) => ({
      file: relativePath,
      category: s.category,
      severity: s.severity,
      title: s.title,
      description: s.description,
      suggestion: s.suggestion,
      code: s.code,
    }));
  } catch (error) {
    console.error(`Failed to analyze ${relativePath}:`, error);
    return [];
  }
}

// Analyze file with retry logic for rate limits and network errors
async function analyzeFileWithRetry(
  filePath: string,
  modelConfig: ModelConfig,
  cwd: string,
  cache: AnalysisCache,
  maxRetries: number = 2,
): Promise<FileSuggestion[]> {
  // Check cache first
  const content = await readFileContent(filePath);
  if (!content) return [];

  const cachedSuggestions = await getCachedSuggestions(
    filePath,
    content,
    modelConfig,
    cache,
    cwd,
  );

  if (cachedSuggestions) {
    return cachedSuggestions;
  }

  // Not in cache, analyze with retry logic
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const suggestions = await analyzeFile(filePath, modelConfig, cwd);

      // Update cache with successful result
      updateCache(cache, filePath, content, suggestions, modelConfig, cwd);

      return suggestions;
    } catch (error: any) {
      lastError = error;

      // Don't retry certain errors
      if (
        error.message?.includes("file too large") ||
        error.message?.includes("max_tokens")
      ) {
        throw error; // Permanent failure
      }

      // Rate limited - exponential backoff
      if (error.status === 429 || error.message?.includes("rate limit")) {
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      // Network errors - quick retry
      if (
        error.message?.includes("ECONNREFUSED") ||
        error.message?.includes("ETIMEDOUT") ||
        error.message?.includes("fetch failed")
      ) {
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }
      }

      // For other errors, fail on first attempt
      if (attempt === 0) {
        throw error;
      }
    }
  }

  // All retries failed
  console.error(
    `Failed to analyze ${filePath} after ${maxRetries + 1} attempts:`,
    lastError,
  );
  return []; // Return empty suggestions, don't crash the whole analysis
}

// Run full analysis with parallel processing
export async function runAnalysis(
  context: AnalysisContext,
  modelConfig: ModelConfig,
  onProgress?: (progress: AnalysisProgress) => void,
  cwd: string = process.cwd(),
  concurrencyOverride?: number,
): Promise<AnalysisResult> {
  const startTime = Date.now();

  // Scanning phase
  onProgress?.({
    phase: "scanning",
    current: 0,
    total: 0,
    message: "Scanning repository...",
  });

  const files = await scanFiles(context, cwd);
  const total = files.length;

  onProgress?.({
    phase: "scanning",
    current: total,
    total,
    message: `Found ${total} files`,
  });

  // Load cache and invalidate old entries
  const cache = await loadCache(cwd);
  invalidateOldCache(cache);

  // Prioritize files based on model and importance
  const prioritizedFiles = prioritizeFiles(files, modelConfig, cwd);

  // Get concurrency limit
  const concurrency =
    concurrencyOverride ?? (await getConcurrency(modelConfig.provider));

  // Parallel analysis phase
  const allSuggestions: FileSuggestion[] = [];
  const inFlight = new Map<string, Promise<FileSuggestion[]>>();
  const fileTimes: number[] = [];
  let completed = 0;
  let cacheHits = 0;

  for (let i = 0; i < prioritizedFiles.length; i++) {
    const file = prioritizedFiles[i];
    const relativePath = path.relative(cwd, file);

    // Wait if we're at concurrency limit
    if (inFlight.size >= concurrency) {
      await Promise.race(inFlight.values());
    }

    // Start analyzing this file
    const fileStartTime = Date.now();
    const promise = analyzeFileWithRetry(file, modelConfig, cwd, cache)
      .then((suggestions) => {
        completed++;
        const fileTime = Date.now() - fileStartTime;
        fileTimes.push(fileTime);

        // Track cache hits (fast responses are likely cached)
        if (fileTime < 100) cacheHits++;

        allSuggestions.push(...suggestions);
        inFlight.delete(file);

        // Calculate stats
        const avgTimePerFile =
          fileTimes.reduce((a, b) => a + b, 0) / fileTimes.length;
        const remaining = total - completed;
        const eta = remaining > 0 ? avgTimePerFile * remaining : 0;

        // Get current batch (files still in flight)
        const currentBatch = Array.from(inFlight.keys())
          .map((f) => path.relative(cwd, f))
          .slice(0, 5); // Show top 5

        // Update progress
        onProgress?.({
          phase: "analyzing",
          current: completed,
          total,
          currentFile: relativePath,
          currentBatch,
          inProgress: inFlight.size,
          avgTimePerFile,
          eta,
          message: `Analyzing ${inFlight.size} files in parallel...`,
        });

        return suggestions;
      })
      .catch((error) => {
        completed++;
        inFlight.delete(file);
        console.error(`Failed to analyze ${relativePath}:`, error);

        // Update progress even on error
        const avgTimePerFile =
          fileTimes.length > 0
            ? fileTimes.reduce((a, b) => a + b, 0) / fileTimes.length
            : 0;
        const remaining = total - completed;
        const eta =
          remaining > 0 && avgTimePerFile > 0 ? avgTimePerFile * remaining : 0;

        onProgress?.({
          phase: "analyzing",
          current: completed,
          total,
          inProgress: inFlight.size,
          avgTimePerFile,
          eta,
        });

        return [];
      });

    inFlight.set(file, promise);

    // Initial progress update for this file
    const currentBatch = Array.from(inFlight.keys())
      .map((f) => path.relative(cwd, f))
      .slice(0, 5);

    onProgress?.({
      phase: "analyzing",
      current: completed,
      total,
      currentFile: relativePath,
      currentBatch,
      inProgress: inFlight.size,
      message: `Analyzing ${inFlight.size} files in parallel...`,
    });
  }

  // Wait for all remaining files to complete
  await Promise.allSettled(inFlight.values());

  // Save updated cache
  await saveCache(cache, cwd);

  // Generate summary
  const categories: Record<string, number> = {};
  for (const suggestion of allSuggestions) {
    categories[suggestion.category] =
      (categories[suggestion.category] || 0) + 1;
  }

  const duration = Date.now() - startTime;

  // Log cache statistics if verbose
  if (cacheHits > 0) {
    console.log(
      `Cache hits: ${cacheHits}/${total} files (${Math.round((cacheHits / total) * 100)}% saved)`,
    );
  }

  onProgress?.({
    phase: "complete",
    current: total,
    total,
    message: `Analysis complete: ${allSuggestions.length} suggestions`,
  });

  return {
    summary: {
      filesAnalyzed: total,
      suggestions: allSuggestions.length,
      categories,
      duration,
    },
    suggestions: allSuggestions,
    metadata: {
      timestamp: new Date().toISOString(),
      model: modelConfig.model,
      provider: modelConfig.provider,
      mode: context.mode,
    },
  };
}

// Helper: Get language from file extension
function getLanguageFromExtension(ext: string): string {
  const languageMap: Record<string, string> = {
    ".js": "JavaScript",
    ".jsx": "JavaScript (React)",
    ".ts": "TypeScript",
    ".tsx": "TypeScript (React)",
    ".py": "Python",
    ".rs": "Rust",
    ".go": "Go",
    ".java": "Java",
    ".cpp": "C++",
    ".c": "C",
    ".rb": "Ruby",
    ".php": "PHP",
    ".swift": "Swift",
    ".kt": "Kotlin",
  };

  return languageMap[ext] || ext.slice(1).toUpperCase();
}
