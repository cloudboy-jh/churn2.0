/**
 * Adaptive Prompt System for Churn
 *
 * Provides language and framework-specific prompts for better analysis quality
 * and reduced token usage compared to one-size-fits-all approach.
 */

import type { Message } from "./models.js";

// Prompt version for cache invalidation
export const PROMPT_VERSION = "2.1.0";

export interface ProjectContext {
  // Primary language/type detected from project root
  type: "javascript" | "typescript" | "python" | "rust" | "go" | "unknown";

  // Framework detected (React, Next.js, FastAPI, etc.)
  framework?: string;

  // Tools and configurations
  tools: {
    packageManager?: "npm" | "yarn" | "pnpm" | "bun";
    bundler?: "webpack" | "vite" | "rollup" | "esbuild" | "turbopack";
    testFramework?: "jest" | "vitest" | "pytest" | "cargo-test" | "go-test";
    linter?: "eslint" | "pylint" | "clippy" | "golangci-lint";
  };

  // Project conventions
  conventions: {
    typescript?: {
      strict: boolean;
      target: string;
    };
    hasTests: boolean;
  };
}

export interface FileInfo {
  path: string;
  relativePath: string;
  extension: string;
  content: string;
  language: string;
}

export type AnalysisMode = "full" | "diff";

export interface PromptTemplate {
  version: string;
  system: string;
  buildUserPrompt: (
    file: FileInfo,
    context: ProjectContext,
    mode: AnalysisMode,
  ) => string;
  focusAreas: string[];
  maxSuggestions: number;
}

/**
 * TypeScript/JavaScript specialized prompt
 * Focus: React hooks, type safety, async patterns, bundle size
 */
const typescriptTemplate: PromptTemplate = {
  version: PROMPT_VERSION,
  system: `You are an expert TypeScript/JavaScript code reviewer specializing in modern web development. You understand React, Node.js, and the broader ecosystem. Focus on practical improvements that enhance type safety, performance, and maintainability. Respond with valid JSON only.`,

  buildUserPrompt: (file, context, mode) => {
    const isReact =
      context.framework?.toLowerCase().includes("react") ||
      context.framework?.toLowerCase().includes("next");
    const isTypeScript = file.extension === ".ts" || file.extension === ".tsx";

    let focusAreas = `
Focus your analysis on:
- **Type Safety**: ${isTypeScript ? "Improve type definitions, avoid any types, use strict null checks" : "Consider migrating critical code to TypeScript"}
- **Async Patterns**: Promise handling, async/await usage, error boundaries
- **Modern JavaScript**: Use ES6+ features, optional chaining, nullish coalescing
- **Performance**: Unnecessary re-renders${isReact ? ", memo/useMemo/useCallback opportunities" : ""}, bundle size considerations`;

    if (isReact) {
      focusAreas += `
- **React Best Practices**: Hooks rules, proper dependency arrays, component composition
- **State Management**: Efficient state updates, avoiding prop drilling`;
    }

    return `Analyze this ${file.language} file and provide 3-5 actionable suggestions.

File: ${file.relativePath}
${context.framework ? `Framework: ${context.framework}` : ""}
${isTypeScript && context.conventions.typescript ? `TypeScript: ${context.conventions.typescript.strict ? "Strict mode" : "Non-strict"}, Target: ${context.conventions.typescript.target}` : ""}

\`\`\`${file.extension.slice(1)}
${file.content}
\`\`\`
${focusAreas}

Respond in JSON format:
{
  "suggestions": [
    {
      "category": "refactor|bug|optimization|style|documentation",
      "severity": "low|medium|high",
      "title": "Brief, specific title",
      "description": "Detailed explanation of the issue",
      "suggestion": "Concrete recommendation with rationale",
      "code": {
        "before": "relevant code snippet showing the issue",
        "after": "improved version",
        "startLine": 10,
        "endLine": 15
      }
    }
  ]
}

Prioritize high-impact changes. Be specific and provide working code examples.`;
  },

  focusAreas: [
    "Type Safety",
    "React Hooks",
    "Async Patterns",
    "Performance",
    "Modern JS",
  ],
  maxSuggestions: 5,
};

/**
 * Python specialized prompt
 * Focus: PEP compliance, type hints, pythonic idioms, async code
 */
const pythonTemplate: PromptTemplate = {
  version: PROMPT_VERSION,
  system: `You are an expert Python code reviewer with deep knowledge of PEP standards, type hints, and modern Python practices. You understand frameworks like FastAPI, Django, Flask, and async Python. Focus on pythonic solutions and practical improvements. Respond with valid JSON only.`,

  buildUserPrompt: (file, context, mode) => {
    const isFastAPI = context.framework?.toLowerCase().includes("fastapi");
    const isDjango = context.framework?.toLowerCase().includes("django");
    const isFlask = context.framework?.toLowerCase().includes("flask");

    let focusAreas = `
Focus your analysis on:
- **Type Hints**: Add/improve type annotations for better IDE support and runtime checking
- **Pythonic Idioms**: List comprehensions, context managers, generators, decorators
- **Error Handling**: Proper exception handling, custom exceptions, error messages
- **Code Quality**: PEP 8 compliance, naming conventions, docstrings`;

    if (isFastAPI || isDjango || isFlask) {
      focusAreas += `
- **${context.framework} Best Practices**: Dependency injection, async endpoints, validation, security`;
    }

    if (file.content.includes("async def")) {
      focusAreas += `
- **Async Patterns**: Proper await usage, async context managers, concurrent execution`;
    }

    return `Analyze this Python file and provide 3-5 actionable suggestions.

File: ${file.relativePath}
${context.framework ? `Framework: ${context.framework}` : ""}
${context.tools.testFramework ? `Testing: ${context.tools.testFramework}` : ""}

\`\`\`python
${file.content}
\`\`\`
${focusAreas}

Respond in JSON format:
{
  "suggestions": [
    {
      "category": "refactor|bug|optimization|style|documentation",
      "severity": "low|medium|high",
      "title": "Brief, specific title",
      "description": "Detailed explanation",
      "suggestion": "Concrete pythonic recommendation",
      "code": {
        "before": "current code snippet",
        "after": "improved pythonic version",
        "startLine": 10,
        "endLine": 15
      }
    }
  ]
}

Prefer pythonic solutions. Be specific with PEP references when relevant.`;
  },

  focusAreas: [
    "Type Hints",
    "Pythonic Idioms",
    "PEP Compliance",
    "Async Patterns",
    "Error Handling",
  ],
  maxSuggestions: 5,
};

/**
 * Rust specialized prompt
 * Focus: Memory safety, ownership, error handling, clippy warnings
 */
const rustTemplate: PromptTemplate = {
  version: PROMPT_VERSION,
  system: `You are an expert Rust code reviewer with deep understanding of ownership, borrowing, lifetimes, and the Rust ecosystem. You know common patterns from the Rust Book and clippy best practices. Focus on memory safety, idiomatic Rust, and performance. Respond with valid JSON only.`,

  buildUserPrompt: (file, context, mode) => {
    return `Analyze this Rust file and provide 3-5 actionable suggestions.

File: ${file.relativePath}
${context.framework ? `Framework: ${context.framework}` : ""}

\`\`\`rust
${file.content}
\`\`\`

Focus your analysis on:
- **Ownership & Borrowing**: Unnecessary clones, better lifetime management, smart pointer usage
- **Error Handling**: Use Result<T, E>, custom error types, ? operator, proper error propagation
- **Idiomatic Rust**: Pattern matching, iterators over loops, method chaining
- **Performance**: Zero-cost abstractions, avoiding allocations, compiler optimizations
- **Safety**: Minimize unsafe blocks, interior mutability patterns, thread safety

Respond in JSON format:
{
  "suggestions": [
    {
      "category": "refactor|bug|optimization|style|documentation",
      "severity": "low|medium|high",
      "title": "Brief, specific title",
      "description": "Detailed explanation with Rust concepts",
      "suggestion": "Idiomatic Rust recommendation",
      "code": {
        "before": "current code",
        "after": "improved idiomatic version",
        "startLine": 10,
        "endLine": 15
      }
    }
  ]
}

Reference clippy lints or Rust patterns when applicable. Prioritize safety and idioms.`;
  },

  focusAreas: [
    "Ownership",
    "Error Handling",
    "Idiomatic Rust",
    "Memory Safety",
    "Performance",
  ],
  maxSuggestions: 5,
};

/**
 * Go specialized prompt
 * Focus: Goroutine safety, error handling, standard library, interfaces
 */
const goTemplate: PromptTemplate = {
  version: PROMPT_VERSION,
  system: `You are an expert Go code reviewer with deep knowledge of Go idioms, concurrency patterns, and the standard library. You understand effective Go principles and common pitfalls. Focus on simplicity, correctness, and performance. Respond with valid JSON only.`,

  buildUserPrompt: (file, context, mode) => {
    return `Analyze this Go file and provide 3-5 actionable suggestions.

File: ${file.relativePath}
${context.framework ? `Framework: ${context.framework}` : ""}

\`\`\`go
${file.content}
\`\`\`

Focus your analysis on:
- **Error Handling**: Proper error returns, error wrapping, sentinel errors, custom error types
- **Concurrency**: Goroutine safety, channel usage, sync primitives, context cancellation
- **Idiomatic Go**: Interfaces, composition over inheritance, small interfaces, defer usage
- **Standard Library**: Prefer stdlib over dependencies, effective use of packages
- **Simplicity**: Clear variable names, small functions, obvious code over clever code

Respond in JSON format:
{
  "suggestions": [
    {
      "category": "refactor|bug|optimization|style|documentation",
      "severity": "low|medium|high",
      "title": "Brief, specific title",
      "description": "Detailed explanation with Go concepts",
      "suggestion": "Idiomatic Go recommendation",
      "code": {
        "before": "current code",
        "after": "improved idiomatic version",
        "startLine": 10,
        "endLine": 15
      }
    }
  ]
}

Follow Effective Go and Go Proverbs. Prioritize correctness and clarity.`;
  },

  focusAreas: [
    "Error Handling",
    "Goroutine Safety",
    "Idiomatic Go",
    "Standard Library",
    "Simplicity",
  ],
  maxSuggestions: 5,
};

/**
 * Generic/Enhanced fallback prompt
 * For languages without specialized templates or mixed-language files
 */
const genericTemplate: PromptTemplate = {
  version: PROMPT_VERSION,
  system: `You are an expert code reviewer with broad knowledge across multiple programming languages and paradigms. Focus on universal principles: readability, maintainability, performance, and correctness. Provide thoughtful, language-appropriate suggestions. Respond with valid JSON only.`,

  buildUserPrompt: (file, context, mode) => {
    return `Analyze this ${file.language} file and provide 3-5 actionable suggestions for improvement.

File: ${file.relativePath}
Language: ${file.language}

\`\`\`${file.extension.slice(1) || "text"}
${file.content}
\`\`\`

Focus your analysis on:
- **Readability**: Clear variable names, function structure, comments where needed
- **Error Handling**: Proper exception/error management for this language
- **Best Practices**: Language-specific idioms and conventions
- **Performance**: Unnecessary operations, better algorithms, resource usage
- **Maintainability**: Code organization, duplication, testability

Provide your analysis in JSON format:
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

Prioritize practical, implementable changes. Be specific with code examples.`;
  },

  focusAreas: [
    "Readability",
    "Error Handling",
    "Best Practices",
    "Performance",
    "Maintainability",
  ],
  maxSuggestions: 5,
};

/**
 * Config file minimal prompt
 * For JSON, YAML, TOML, etc. - focus on syntax and security only
 */
const configTemplate: PromptTemplate = {
  version: PROMPT_VERSION,
  system: `You are a configuration file reviewer. Focus on syntax correctness, security issues (exposed secrets, insecure settings), and common misconfigurations. Keep suggestions minimal and high-value only. Respond with valid JSON only.`,

  buildUserPrompt: (file, context, mode) => {
    return `Analyze this configuration file. Only provide suggestions if there are security issues, syntax errors, or critical misconfigurations. Return 0-2 suggestions maximum.

File: ${file.relativePath}

\`\`\`${file.extension.slice(1)}
${file.content}
\`\`\`

Check for:
- **Security**: Exposed API keys, passwords, tokens, insecure settings
- **Syntax**: Valid format, proper structure, required fields
- **Common Issues**: Deprecated options, conflicting settings

Respond in JSON format:
{
  "suggestions": [
    {
      "category": "bug|optimization|documentation",
      "severity": "medium|high",
      "title": "Brief title",
      "description": "What's wrong and why it matters",
      "suggestion": "How to fix it",
      "code": {
        "before": "problematic configuration",
        "after": "corrected configuration",
        "startLine": 10,
        "endLine": 15
      }
    }
  ]
}

Only report actionable issues. If the config looks fine, return an empty suggestions array.`;
  },

  focusAreas: ["Security", "Syntax", "Critical Issues"],
  maxSuggestions: 2,
};

/**
 * Test file prompt
 * Focus on test quality, coverage, and best practices (not "add tests")
 */
const testTemplate: PromptTemplate = {
  version: PROMPT_VERSION,
  system: `You are a test code reviewer. You understand that this IS a test file, so focus on improving test quality, not suggesting to add tests. Review test organization, assertions, edge cases, and test maintainability. Respond with valid JSON only.`,

  buildUserPrompt: (file, context, mode) => {
    return `Analyze this test file and provide 2-4 suggestions for improving test quality.

File: ${file.relativePath}
${context.tools.testFramework ? `Framework: ${context.tools.testFramework}` : ""}

\`\`\`${file.extension.slice(1)}
${file.content}
\`\`\`

Focus your analysis on:
- **Test Coverage**: Missing edge cases, error scenarios, boundary conditions
- **Test Quality**: Clear test names, good assertions, avoid flaky tests
- **Organization**: Proper setup/teardown, test independence, descriptive describes
- **Maintainability**: DRY in tests (but not at expense of clarity), helper functions
- **Best Practices**: One assertion per test (where appropriate), arrange-act-assert pattern

Note: This IS a test file. Don't suggest "add tests" - improve the existing tests.

Respond in JSON format:
{
  "suggestions": [
    {
      "category": "refactor|bug|optimization|documentation",
      "severity": "low|medium|high",
      "title": "Brief title",
      "description": "What could be better in these tests",
      "suggestion": "How to improve test quality",
      "code": {
        "before": "current test code",
        "after": "improved test code",
        "startLine": 10,
        "endLine": 15
      }
    }
  ]
}

Focus on making tests more reliable, readable, and comprehensive.`;
  },

  focusAreas: ["Test Coverage", "Test Quality", "Organization", "Edge Cases"],
  maxSuggestions: 4,
};

/**
 * Select appropriate template based on file type and context
 */
function selectTemplate(
  file: FileInfo,
  context: ProjectContext,
): PromptTemplate {
  const ext = file.extension.toLowerCase();
  const fileName = file.relativePath.toLowerCase();

  // Config files get minimal analysis
  const configExtensions = [
    ".json",
    ".yaml",
    ".yml",
    ".toml",
    ".ini",
    ".env",
    ".config",
  ];
  const isConfigFile =
    configExtensions.includes(ext) ||
    fileName.includes("config") ||
    fileName.includes(".config.");

  if (isConfigFile) {
    return configTemplate;
  }

  // Test files get test-specific analysis
  const isTestFile =
    fileName.includes(".test.") ||
    fileName.includes(".spec.") ||
    fileName.includes("_test.") ||
    fileName.includes("/tests/") ||
    fileName.includes("/__tests__/");

  if (isTestFile) {
    return testTemplate;
  }

  // Language-specific templates
  if (
    ext === ".ts" ||
    ext === ".tsx" ||
    ext === ".js" ||
    ext === ".jsx" ||
    ext === ".mjs"
  ) {
    return typescriptTemplate;
  }

  if (ext === ".py" || ext === ".pyi") {
    return pythonTemplate;
  }

  if (ext === ".rs") {
    return rustTemplate;
  }

  if (ext === ".go") {
    return goTemplate;
  }

  // Fallback to enhanced generic
  return genericTemplate;
}

/**
 * Build adaptive prompt for file analysis
 */
export function buildPrompt(
  file: FileInfo,
  context: ProjectContext,
  mode: AnalysisMode = "full",
  fileDiff?: any, // FileDiff from differential.ts
): Message[] {
  // If mode is 'diff', use specialized diff prompt
  if (mode === "diff" && fileDiff) {
    const { buildDiffPrompt } = require("./differential.js");
    const diffPromptContent = buildDiffPrompt(fileDiff, file.language);

    return [
      {
        role: "system",
        content:
          "You are an expert code reviewer analyzing changes in a git diff. Focus only on issues introduced by the modifications. Respond with valid JSON only.",
      },
      {
        role: "user",
        content: diffPromptContent,
      },
    ];
  }

  // Otherwise use adaptive prompt templates
  const template = selectTemplate(file, context);

  const messages: Message[] = [
    {
      role: "system",
      content: template.system,
    },
    {
      role: "user",
      content: template.buildUserPrompt(file, context, mode),
    },
  ];

  return messages;
}

/**
 * Get template metadata (for debugging/logging)
 */
export function getTemplateInfo(file: FileInfo, context: ProjectContext) {
  const template = selectTemplate(file, context);
  return {
    version: template.version,
    focusAreas: template.focusAreas,
    maxSuggestions: template.maxSuggestions,
  };
}
