import fg from 'fast-glob';
import fs from 'fs-extra';
import path from 'path';
import { getRepoInfo, getChangedFiles, getAllDiffs } from './git.js';
import { ModelConfig, sendPrompt, Message } from './models.js';

export interface AnalysisContext {
  mode: 'full' | 'staged' | 'files';
  files?: string[];
  includePatterns?: string[];
  excludePatterns?: string[];
}

export interface AnalysisProgress {
  phase: 'scanning' | 'analyzing' | 'generating' | 'complete';
  current: number;
  total: number;
  currentFile?: string;
  message?: string;
}

export interface FileSuggestion {
  file: string;
  category: 'refactor' | 'bug' | 'optimization' | 'style' | 'documentation';
  severity: 'low' | 'medium' | 'high';
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

const DEFAULT_EXCLUDE = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/.churn/**',
  '**/*.min.js',
  '**/*.map',
  '**/*.lock',
  '**/package-lock.json',
  '**/yarn.lock',
  '**/pnpm-lock.yaml',
];

// Scan files based on context
export async function scanFiles(
  context: AnalysisContext,
  cwd: string = process.cwd()
): Promise<string[]> {
  if (context.mode === 'staged') {
    const changedFiles = await getChangedFiles(cwd);
    return changedFiles.map(f => path.join(cwd, f.path));
  }

  if (context.mode === 'files' && context.files) {
    return context.files.map(f => path.isAbsolute(f) ? f : path.join(cwd, f));
  }

  // Full repo scan
  const patterns = context.includePatterns || ['**/*'];
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
async function readFileContent(filePath: string, maxSize: number = 100_000): Promise<string | null> {
  try {
    const stats = await fs.stat(filePath);
    if (stats.size > maxSize) {
      return null; // Skip large files
    }

    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

// Analyze a single file
async function analyzeFile(
  filePath: string,
  modelConfig: ModelConfig,
  cwd: string
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
      role: 'system',
      content: 'You are an expert code reviewer. Provide concise, actionable feedback in valid JSON format.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  try {
    const response = await sendPrompt(modelConfig, messages);

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n?/g, '');
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

// Run full analysis
export async function runAnalysis(
  context: AnalysisContext,
  modelConfig: ModelConfig,
  onProgress?: (progress: AnalysisProgress) => void,
  cwd: string = process.cwd()
): Promise<AnalysisResult> {
  const startTime = Date.now();

  // Scanning phase
  onProgress?.({
    phase: 'scanning',
    current: 0,
    total: 0,
    message: 'Scanning repository...',
  });

  const files = await scanFiles(context, cwd);
  const total = files.length;

  onProgress?.({
    phase: 'scanning',
    current: total,
    total,
    message: `Found ${total} files`,
  });

  // Analysis phase
  const allSuggestions: FileSuggestion[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const relativePath = path.relative(cwd, file);

    onProgress?.({
      phase: 'analyzing',
      current: i + 1,
      total,
      currentFile: relativePath,
      message: `Analyzing ${relativePath}...`,
    });

    const suggestions = await analyzeFile(file, modelConfig, cwd);
    allSuggestions.push(...suggestions);
  }

  // Generate summary
  const categories: Record<string, number> = {};
  for (const suggestion of allSuggestions) {
    categories[suggestion.category] = (categories[suggestion.category] || 0) + 1;
  }

  const duration = Date.now() - startTime;

  onProgress?.({
    phase: 'complete',
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
    '.js': 'JavaScript',
    '.jsx': 'JavaScript (React)',
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript (React)',
    '.py': 'Python',
    '.rs': 'Rust',
    '.go': 'Go',
    '.java': 'Java',
    '.cpp': 'C++',
    '.c': 'C',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
  };

  return languageMap[ext] || ext.slice(1).toUpperCase();
}
