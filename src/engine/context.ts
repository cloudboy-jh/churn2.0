/**
 * Project Context Detection for Churn
 *
 * Detects project type, frameworks, tools, and conventions to provide
 * better context for adaptive prompts.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import crypto from 'crypto';
import type { ProjectContext } from './prompts.js';

/**
 * Detect comprehensive project context
 * Cached per analysis session to avoid repeated file reads
 */
export async function detectProjectContext(cwd: string = process.cwd()): Promise<ProjectContext> {
  // Start with unknown defaults
  const context: ProjectContext = {
    type: 'unknown',
    tools: {},
    conventions: {
      hasTests: false,
    },
  };

  // Detect primary project type and framework
  await detectTypeAndFramework(cwd, context);

  // Detect tooling
  await detectTools(cwd, context);

  // Detect conventions
  await detectConventions(cwd, context);

  return context;
}

/**
 * Hash project context for cache invalidation
 * Only includes factors that would affect analysis
 */
export function hashProjectContext(context: ProjectContext): string {
  // Create a stable string representation of relevant context
  const relevant = {
    type: context.type,
    framework: context.framework,
    typescript: context.conventions.typescript,
  };

  const str = JSON.stringify(relevant, Object.keys(relevant).sort());
  return crypto.createHash('sha256').update(str).digest('hex').slice(0, 16);
}

/**
 * Detect project type and framework
 */
async function detectTypeAndFramework(cwd: string, context: ProjectContext): Promise<void> {
  // Check for JavaScript/TypeScript project
  const packageJsonPath = path.join(cwd, 'package.json');
  if (await fs.pathExists(packageJsonPath)) {
    try {
      const pkg = await fs.readJSON(packageJsonPath);

      // Determine if TypeScript or JavaScript
      const hasTsConfig = await fs.pathExists(path.join(cwd, 'tsconfig.json'));
      context.type = hasTsConfig ? 'typescript' : 'javascript';

      // Detect framework from dependencies
      const deps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };

      if (deps['next']) {
        context.framework = 'Next.js';
      } else if (deps['react']) {
        context.framework = 'React';
      } else if (deps['vue']) {
        context.framework = 'Vue';
      } else if (deps['@angular/core']) {
        context.framework = 'Angular';
      } else if (deps['express']) {
        context.framework = 'Express';
      } else if (deps['@nestjs/core']) {
        context.framework = 'NestJS';
      } else if (deps['svelte']) {
        context.framework = 'Svelte';
      }

      return; // Found JS/TS, we're done
    } catch (error) {
      // Invalid package.json, continue checking other types
    }
  }

  // Check for Rust project
  const cargoTomlPath = path.join(cwd, 'Cargo.toml');
  if (await fs.pathExists(cargoTomlPath)) {
    context.type = 'rust';

    try {
      const cargoContent = await fs.readFile(cargoTomlPath, 'utf-8');

      // Basic TOML parsing for common frameworks
      if (cargoContent.includes('tokio')) {
        context.framework = 'Tokio';
      } else if (cargoContent.includes('actix-web')) {
        context.framework = 'Actix Web';
      } else if (cargoContent.includes('rocket')) {
        context.framework = 'Rocket';
      } else if (cargoContent.includes('axum')) {
        context.framework = 'Axum';
      }
    } catch (error) {
      // Failed to read Cargo.toml, but we know it's Rust
    }

    return;
  }

  // Check for Go project
  const goModPath = path.join(cwd, 'go.mod');
  if (await fs.pathExists(goModPath)) {
    context.type = 'go';

    try {
      const goModContent = await fs.readFile(goModPath, 'utf-8');

      if (goModContent.includes('github.com/gin-gonic/gin')) {
        context.framework = 'Gin';
      } else if (goModContent.includes('github.com/gofiber/fiber')) {
        context.framework = 'Fiber';
      } else if (goModContent.includes('github.com/labstack/echo')) {
        context.framework = 'Echo';
      }
    } catch (error) {
      // Failed to read go.mod, but we know it's Go
    }

    return;
  }

  // Check for Python project
  const requirementsPath = path.join(cwd, 'requirements.txt');
  const pyprojectPath = path.join(cwd, 'pyproject.toml');

  if (await fs.pathExists(requirementsPath) || await fs.pathExists(pyprojectPath)) {
    context.type = 'python';

    try {
      // Check requirements.txt
      if (await fs.pathExists(requirementsPath)) {
        const requirements = await fs.readFile(requirementsPath, 'utf-8');

        if (requirements.includes('fastapi')) {
          context.framework = 'FastAPI';
        } else if (requirements.includes('django')) {
          context.framework = 'Django';
        } else if (requirements.includes('flask')) {
          context.framework = 'Flask';
        }
      }

      // Check pyproject.toml (takes precedence)
      if (await fs.pathExists(pyprojectPath)) {
        const pyproject = await fs.readFile(pyprojectPath, 'utf-8');

        if (pyproject.includes('fastapi')) {
          context.framework = 'FastAPI';
        } else if (pyproject.includes('django')) {
          context.framework = 'Django';
        } else if (pyproject.includes('flask')) {
          context.framework = 'Flask';
        }
      }
    } catch (error) {
      // Failed to read files, but we know it's Python
    }

    return;
  }

  // If nothing matched, type remains 'unknown'
}

/**
 * Detect tooling (package managers, bundlers, test frameworks, linters)
 */
async function detectTools(cwd: string, context: ProjectContext): Promise<void> {
  // Package managers
  if (await fs.pathExists(path.join(cwd, 'bun.lockb'))) {
    context.tools.packageManager = 'bun';
  } else if (await fs.pathExists(path.join(cwd, 'pnpm-lock.yaml'))) {
    context.tools.packageManager = 'pnpm';
  } else if (await fs.pathExists(path.join(cwd, 'yarn.lock'))) {
    context.tools.packageManager = 'yarn';
  } else if (await fs.pathExists(path.join(cwd, 'package-lock.json'))) {
    context.tools.packageManager = 'npm';
  }

  // Bundlers (for JS/TS projects)
  if (context.type === 'javascript' || context.type === 'typescript') {
    const packageJsonPath = path.join(cwd, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      try {
        const pkg = await fs.readJSON(packageJsonPath);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        if (deps['vite']) {
          context.tools.bundler = 'vite';
        } else if (deps['webpack']) {
          context.tools.bundler = 'webpack';
        } else if (deps['rollup']) {
          context.tools.bundler = 'rollup';
        } else if (deps['esbuild']) {
          context.tools.bundler = 'esbuild';
        } else if (deps['turbopack']) {
          context.tools.bundler = 'turbopack';
        }
      } catch (error) {
        // Failed to read package.json
      }
    }
  }

  // Test frameworks
  if (context.type === 'javascript' || context.type === 'typescript') {
    const packageJsonPath = path.join(cwd, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      try {
        const pkg = await fs.readJSON(packageJsonPath);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        if (deps['vitest']) {
          context.tools.testFramework = 'vitest';
        } else if (deps['jest']) {
          context.tools.testFramework = 'jest';
        }
      } catch (error) {
        // Failed to read package.json
      }
    }
  } else if (context.type === 'python') {
    // Python test framework detection
    const requirementsPath = path.join(cwd, 'requirements.txt');
    if (await fs.pathExists(requirementsPath)) {
      try {
        const requirements = await fs.readFile(requirementsPath, 'utf-8');
        if (requirements.includes('pytest')) {
          context.tools.testFramework = 'pytest';
        }
      } catch (error) {
        // Failed to read requirements
      }
    }
  } else if (context.type === 'rust') {
    context.tools.testFramework = 'cargo-test';
  } else if (context.type === 'go') {
    context.tools.testFramework = 'go-test';
  }

  // Linters
  if (context.type === 'javascript' || context.type === 'typescript') {
    if (await fs.pathExists(path.join(cwd, '.eslintrc.js')) ||
        await fs.pathExists(path.join(cwd, '.eslintrc.json')) ||
        await fs.pathExists(path.join(cwd, 'eslint.config.js'))) {
      context.tools.linter = 'eslint';
    }
  } else if (context.type === 'python') {
    if (await fs.pathExists(path.join(cwd, '.pylintrc')) ||
        await fs.pathExists(path.join(cwd, 'pylintrc'))) {
      context.tools.linter = 'pylint';
    }
  } else if (context.type === 'rust') {
    // Clippy is standard with Rust
    context.tools.linter = 'clippy';
  } else if (context.type === 'go') {
    if (await fs.pathExists(path.join(cwd, '.golangci.yml')) ||
        await fs.pathExists(path.join(cwd, '.golangci.yaml'))) {
      context.tools.linter = 'golangci-lint';
    }
  }
}

/**
 * Detect project conventions
 */
async function detectConventions(cwd: string, context: ProjectContext): Promise<void> {
  // TypeScript configuration
  if (context.type === 'typescript') {
    const tsconfigPath = path.join(cwd, 'tsconfig.json');
    if (await fs.pathExists(tsconfigPath)) {
      try {
        const tsconfig = await fs.readJSON(tsconfigPath);

        context.conventions.typescript = {
          strict: tsconfig.compilerOptions?.strict === true,
          target: tsconfig.compilerOptions?.target || 'ES2015',
        };
      } catch (error) {
        // Failed to parse tsconfig, use defaults
        context.conventions.typescript = {
          strict: false,
          target: 'ES2015',
        };
      }
    }
  }

  // Check if project has tests
  const testDirs = ['test', 'tests', '__tests__', 'spec'];
  for (const dir of testDirs) {
    if (await fs.pathExists(path.join(cwd, dir))) {
      context.conventions.hasTests = true;
      break;
    }
  }

  // Also check for test files in src
  const srcPath = path.join(cwd, 'src');
  if (await fs.pathExists(srcPath)) {
    try {
      const files = await fs.readdir(srcPath);
      const hasTestFiles = files.some(file =>
        file.includes('.test.') ||
        file.includes('.spec.') ||
        file.includes('_test.')
      );

      if (hasTestFiles) {
        context.conventions.hasTests = true;
      }
    } catch (error) {
      // Failed to read src directory
    }
  }
}

/**
 * Quick check if a file path should skip detailed analysis
 * Returns true for generated files, lockfiles, etc.
 */
export function shouldSkipDetailedAnalysis(filePath: string): boolean {
  const fileName = path.basename(filePath).toLowerCase();
  const ext = path.extname(filePath).toLowerCase();

  // Skip type definition files (generated)
  if (ext === '.d.ts') return true;

  // Skip lockfiles
  if (fileName.includes('lock') || fileName.includes('.lock')) return true;

  // Skip minified files
  if (fileName.includes('.min.')) return true;

  // Skip source maps
  if (ext === '.map') return true;

  return false;
}

/**
 * Determine if a file is a test file
 */
export function isTestFile(filePath: string): boolean {
  const fileName = path.basename(filePath).toLowerCase();
  const dirPath = path.dirname(filePath).toLowerCase();

  return (
    fileName.includes('.test.') ||
    fileName.includes('.spec.') ||
    fileName.includes('_test.') ||
    dirPath.includes('/tests/') ||
    dirPath.includes('/__tests__/') ||
    dirPath.includes('/test/') ||
    dirPath.includes('/spec/')
  );
}

/**
 * Determine if a file is a configuration file
 */
export function isConfigFile(filePath: string): boolean {
  const fileName = path.basename(filePath).toLowerCase();
  const ext = path.extname(filePath).toLowerCase();

  const configExtensions = ['.json', '.yaml', '.yml', '.toml', '.ini', '.env', '.config'];
  const configNames = ['config', '.config', 'package.json', 'tsconfig', 'webpack', 'vite', 'rollup'];

  if (configExtensions.includes(ext)) {
    return true;
  }

  return configNames.some(name => fileName.includes(name));
}
