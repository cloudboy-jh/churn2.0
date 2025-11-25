# AGENTS.md

## Commands
- `bun install` - Install dependencies
- `bun run dev` - Run in development mode
- `bun run type-check` - TypeScript type checking
- `bun run build` - Build to dist/
- `bun run compile` - Create standalone binary

## Code Style Guidelines

### Imports
- ALWAYS use `.js` extension for local imports (even for `.ts` files)
- ESM only - no CommonJS
- Use absolute imports with `@/*` path alias when beneficial

### TypeScript
- Strict mode enabled
- Functional components with typed props interfaces
- Use `JSX.Element` return type for Ink components
- Prefer explicit types over inference

### React Hooks (Ink)
- Hooks must be called in same order every render
- Never call hooks conditionally, in loops, or nested functions
- Keep hooks at component top level

### Error Handling
- Individual file analysis failures should NOT crash entire analysis
- Always display user-friendly error messages
- Log errors but continue processing

### Path Handling
- Use `path.relative()` for display paths
- Use `path.resolve()` or absolute paths for operations
- Always handle Windows paths correctly

### Performance
- Files analyzed with concurrency (5-20 concurrent based on provider)
- Respect API rate limits
- Use progress callbacks for real-time UI updates

### Critical Constraints
- 100KB per file limit - larger files skipped
- Always verify `await isGitRepo()` before Git operations
- Bun runtime required (NOT Node.js)