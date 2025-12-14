import fs from "fs-extra";
import path from "path";
import fg from "fast-glob";

// Types
export interface DependencyUsage {
  name: string;
  importCount: number;
  importedBy: string[];
}

export interface UnmatchedImport {
  import: string;
  files: string[];
  likely: "builtin" | "alias" | "missing" | "local";
}

export interface DependencyAnalysisResult {
  used: DependencyUsage[];
  declaredUnused: string[];
  importedNotDeclared: UnmatchedImport[];
  summary: {
    totalDeclared: number;
    totalUsed: number;
    totalUnused: number;
    totalDevDependencies: number;
  };
}

// Node.js built-in modules
const NODE_BUILTINS = new Set([
  "assert",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "constants",
  "crypto",
  "dgram",
  "dns",
  "domain",
  "events",
  "fs",
  "http",
  "https",
  "module",
  "net",
  "os",
  "path",
  "perf_hooks",
  "process",
  "punycode",
  "querystring",
  "readline",
  "repl",
  "stream",
  "string_decoder",
  "timers",
  "tls",
  "tty",
  "url",
  "util",
  "v8",
  "vm",
  "worker_threads",
  "zlib",
]);

// Import pattern sources (without global flag) to avoid shared state issues
const IMPORT_PATTERN_SOURCES = [
  // ES6: import x from 'pkg', import { x } from 'pkg', import 'pkg', import * as x from 'pkg'
  /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))?\s+from\s+)?['"]([^'"]+)['"]/,
  // CommonJS: require('pkg'), require("pkg")
  /require\s*\(\s*['"]([^'"]+)['"]\s*\)/,
  // Dynamic import: import('pkg')
  /import\s*\(\s*['"]([^'"]+)['"]\s*\)/,
];

/**
 * Parse package.json to get declared dependencies
 */
async function parseDeclaredDependencies(
  cwd: string,
): Promise<{
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} | null> {
  const packageJsonPath = path.join(cwd, "package.json");

  if (!(await fs.pathExists(packageJsonPath))) {
    return null;
  }

  try {
    const packageJson = await fs.readJSON(packageJsonPath);
    return {
      dependencies: packageJson.dependencies || {},
      devDependencies: packageJson.devDependencies || {},
    };
  } catch {
    return null;
  }
}

/**
 * Extract import paths from file content
 */
function extractImports(content: string): string[] {
  const imports: Set<string> = new Set();

  for (const patternSource of IMPORT_PATTERN_SOURCES) {
    // Create a new global regex instance for each call to avoid shared state
    const pattern = new RegExp(patternSource.source, 'g');
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath) {
        imports.add(importPath);
      }
    }
  }

  return Array.from(imports);
}

/**
 * Get package name from import path
 * Handles scoped packages (@org/pkg) and subpath imports (lodash/get)
 */
function getPackageName(importPath: string): string {
  // Handle node: prefix
  if (importPath.startsWith("node:")) {
    return importPath.slice(5);
  }

  // Handle scoped packages: @org/pkg/subpath -> @org/pkg
  if (importPath.startsWith("@")) {
    const parts = importPath.split("/");
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    return importPath;
  }

  // Regular packages: lodash/get -> lodash
  return importPath.split("/")[0];
}

/**
 * Check if import is a local/relative path
 */
function isLocalImport(importPath: string): boolean {
  return (
    importPath.startsWith(".") ||
    importPath.startsWith("/") ||
    importPath.startsWith("~")
  );
}

/**
 * Check if import is a Node.js built-in module
 */
function isBuiltinModule(importPath: string): boolean {
  const moduleName = importPath.startsWith("node:")
    ? importPath.slice(5)
    : getPackageName(importPath);
  return NODE_BUILTINS.has(moduleName);
}

/**
 * Classify unmatched imports
 */
function classifyUnmatchedImport(
  importPath: string,
): "builtin" | "alias" | "missing" | "local" {
  if (isLocalImport(importPath)) {
    return "local";
  }

  if (isBuiltinModule(importPath)) {
    return "builtin";
  }

  // Check for common alias patterns
  const packageName = getPackageName(importPath);
  if (
    packageName.startsWith("@/") ||
    packageName.startsWith("~/") ||
    packageName.startsWith("#")
  ) {
    return "alias";
  }

  return "missing";
}

/**
 * Scan all source files in the project for imports
 */
async function scanProjectFiles(cwd: string): Promise<string[]> {
  const patterns = [
    "**/*.js",
    "**/*.jsx",
    "**/*.ts",
    "**/*.tsx",
    "**/*.mjs",
    "**/*.cjs",
  ];

  const exclude = [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.churn/**",
    "**/*.d.ts",
    "**/*.min.js",
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
 * Main entry point for dependency analysis
 */
export async function analyzeDependencies(
  cwd: string = process.cwd(),
): Promise<DependencyAnalysisResult | null> {
  // Parse package.json
  const declared = await parseDeclaredDependencies(cwd);
  if (!declared) {
    return null; // No package.json found
  }

  // Combine dependencies and devDependencies
  const allDeclared = {
    ...declared.dependencies,
    ...declared.devDependencies,
  };
  const declaredNames = new Set(Object.keys(allDeclared));

  // Scan all source files
  const files = await scanProjectFiles(cwd);

  // Track usage
  const usageMap = new Map<
    string,
    { importCount: number; importedBy: Set<string> }
  >();
  const unmatchedMap = new Map<string, Set<string>>();

  // Process each file
  for (const file of files) {
    try {
      const content = await fs.readFile(file, "utf-8");
      const imports = extractImports(content);
      const relativePath = path.relative(cwd, file);

      for (const importPath of imports) {
        // Skip local imports
        if (isLocalImport(importPath)) {
          continue;
        }

        const packageName = getPackageName(importPath);

        if (declaredNames.has(packageName)) {
          // Found a match with declared dependency
          if (!usageMap.has(packageName)) {
            usageMap.set(packageName, { importCount: 0, importedBy: new Set() });
          }
          const usage = usageMap.get(packageName)!;
          usage.importCount++;
          usage.importedBy.add(relativePath);
        } else if (!isBuiltinModule(importPath)) {
          // Unmatched and not a builtin
          if (!unmatchedMap.has(importPath)) {
            unmatchedMap.set(importPath, new Set());
          }
          unmatchedMap.get(importPath)!.add(relativePath);
        }
      }
    } catch {
      // Skip files that can't be read
    }
  }

  // Build results
  const used: DependencyUsage[] = Array.from(usageMap.entries())
    .map(([name, data]) => ({
      name,
      importCount: data.importCount,
      importedBy: Array.from(data.importedBy).sort(),
    }))
    .sort((a, b) => b.importCount - a.importCount);

  const usedNames = new Set(used.map((u) => u.name));
  const declaredUnused = Array.from(declaredNames)
    .filter((name) => !usedNames.has(name))
    .sort();

  const importedNotDeclared: UnmatchedImport[] = Array.from(
    unmatchedMap.entries(),
  )
    .map(([importPath, files]) => ({
      import: importPath,
      files: Array.from(files).sort(),
      likely: classifyUnmatchedImport(importPath),
    }))
    .filter((item) => item.likely !== "local" && item.likely !== "builtin")
    .sort((a, b) => b.files.length - a.files.length);

  return {
    used,
    declaredUnused,
    importedNotDeclared,
    summary: {
      totalDeclared: declaredNames.size,
      totalUsed: used.length,
      totalUnused: declaredUnused.length,
      totalDevDependencies: Object.keys(declared.devDependencies).length,
    },
  };
}
