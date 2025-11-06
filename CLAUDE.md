# CLAUDE.md

**AI Assistant Guidance for Churn CLI Development**

This file provides essential context for AI assistants (like Claude Code) working with this codebase. For comprehensive documentation, see [`docs/development/CLAUDE.md`](./docs/development/CLAUDE.md).

---

## Project Overview

**Churn 2.0** - AI-assisted code maintenance CLI tool  
**Published as**: `churn-cli` on npm  
**Current Version**: 2.0.12  
**Repository**: https://github.com/cloudboyjh1/churn2.0

**Core Philosophy:**
- Local-first (no cloud backend, all data stored locally)
- Zero-setup (run from any Git repository)
- Multi-model support (Claude, GPT, Gemini, Ollama)
- Privacy-focused (API keys stored locally, never shared)

---

## Quick Reference

### Technology Stack
- **Runtime**: Bun 1.x (NOT Node.js)
- **Language**: TypeScript 5.6 (ESNext modules, strict mode)
- **UI Framework**: Ink 5.x (React for terminal)
- **Build Tool**: Bun bundler
- **Dependencies**: See package.json for full list

### Essential Commands
```bash
bun install              # Install dependencies
bun run dev              # Run in development mode
bun run type-check       # TypeScript type checking
bun run build            # Build to dist/
bun run compile          # Create standalone binary
```

### Project Structure
```
src/
├── index.tsx           # CLI entry point, phase routing
├── components/         # Ink UI components (Logo, ModelSelect, etc.)
├── engine/             # Business logic (no UI dependencies)
│   ├── config.ts      # Local storage management
│   ├── git.ts         # Repository operations
│   ├── models.ts      # AI provider abstraction
│   ├── analysis.ts    # Parallel file analysis with caching
│   └── reports.ts     # Report generation and export
├── commands/           # Command implementations
└── theme.ts           # Visual design system (#ff5656 vibrant red)
```

---

## Code Style & Conventions

### Import Style
- **ALWAYS** use `.js` extension for local imports (even for `.ts` files)
- ESM only - no CommonJS
```typescript
// ✅ Correct
import { Logo } from "./components/Logo.js";
import { getRepoInfo } from "./engine/git.js";

// ❌ Wrong
import { Logo } from "./components/Logo";
```

### Component Patterns
- Use functional components with hooks
- Always type props with interfaces
- Ink components return `JSX.Element`, not HTML
```typescript
interface MyComponentProps {
  title: string;
  onComplete: () => void;
}

export function MyComponent({ title, onComplete }: MyComponentProps) {
  return <Box>{/* ... */}</Box>;
}
```

### React Hooks Rules
**CRITICAL**: Hooks must be called in the same order every render
- Never call hooks conditionally
- Never call hooks in loops
- Never call hooks in nested functions

```typescript
// ✅ Correct - Hooks at component top level
function MyComponent() {
  const [state, setState] = useState(false);
  
  useEffect(() => {
    if (state) {
      // Conditional logic INSIDE the hook
    }
  }, [state]);
  
  if (state) {
    return <Box>State is true</Box>;
  }
  return <Box>State is false</Box>;
}

// ❌ Wrong - Conditional hook call
function MyComponent() {
  const [state, setState] = useState(false);
  
  if (state) {
    useEffect(() => { /* ... */ }, []); // ❌ Hook called conditionally
  }
  
  return <Box>{/* ... */}</Box>;
}
```

### Error Handling
- Individual file analysis failures should NOT crash entire analysis
- Always display user-friendly error messages
- Log errors but continue processing
```typescript
try {
  const result = await analyzeFile(file);
} catch (error) {
  console.error(`Failed to analyze ${file}: ${error.message}`);
  // Continue processing other files
}
```

### Path Handling
- Display paths: Use `path.relative()` for readability
- Operations: Use `path.resolve()` or absolute paths
- Always handle Windows paths correctly

---

## Design System

### Colors (Theme)
All defined in `src/theme.ts`:
```typescript
Primary:   #ff5656  // Vibrant red (logo, progress bars, highlights)
Secondary: #ff8585  // Light red (gradients)
Text:      #f2e9e4  // Warm white
Gray:      #a6adc8  // Muted purple-gray
Success:   #a6e3a1  // Green
Info:      #8ab4f8  // Blue
Warning:   #f9e2af  // Yellow
Error:     #f38ba8  // Pink
```

### Symbols
```typescript
symbols.tick    // ✓
symbols.cross   // ✗
symbols.pointer // ›
symbols.bullet  // •
```

---

## Common Patterns

### Phase-Based Routing
The app uses a state machine approach with `AppPhase` type:
```typescript
type AppPhase = "init" | "model" | "confirm" | "run" | "review" | "export" | "complete";
```

Each phase renders a different UI component. Phase transitions happen via `setPhase()`.

### Streaming AI Responses
All AI providers support streaming for real-time UI updates:
```typescript
await sendPrompt(modelConfig, messages, {
  onStream: (chunk) => {
    // Update UI with chunk
    setProgress(prev => prev + chunk);
  }
});
```

### File Analysis with Caching
Analysis uses content-based SHA-256 caching (30-day retention):
```typescript
const cache = await loadCache();
const hash = createHash('sha256').update(content).digest('hex');

if (cache[filePath]?.hash === hash && !isCacheExpired(cache[filePath])) {
  return cache[filePath].suggestions; // Use cached result
}
```

---

## Critical Constraints

### File Size Limits
- **100KB per file** - Larger files skipped to avoid overwhelming AI context
- Binary files automatically excluded
- Generated code (e.g., `.d.ts`) excluded

### Git Repository Requirement
- ALWAYS verify `await isGitRepo()` before Git operations
- Exit gracefully if not in a Git repository
- Show helpful error message

### Performance Considerations
- Files analyzed with concurrency (5-20 concurrent based on provider)
- Respect API rate limits
- Use progress callbacks for real-time UI updates
- Streaming responses preferred over batch

### Bun-Specific
- This project requires Bun, NOT Node.js
- Use Bun APIs where beneficial
- Binary compilation uses `bun build --compile`

---

## Anti-Patterns to Avoid

### ❌ Don't: Create Files Unnecessarily
```typescript
// ❌ Creating new config files proactively
await fs.writeFile('new-config.json', JSON.stringify(config));
```
**Why**: Churn is zero-setup. Only create files when absolutely required.

### ❌ Don't: Use Node.js-Specific Code
```typescript
// ❌ Using Node.js APIs that don't work in Bun
require('some-module'); // Use ESM imports instead
```

### ❌ Don't: Ignore Git Detection
```typescript
// ❌ Assuming we're in a Git repo
const files = await getChangedFiles(); // Might crash if not in Git repo

// ✅ Always check first
if (await isGitRepo()) {
  const files = await getChangedFiles();
}
```

### ❌ Don't: Hard-Code Paths
```typescript
// ❌ Windows-specific path
const configPath = "C:\\Users\\...";

// ✅ Use path module
const configPath = path.join(os.homedir(), '.churn', 'config.json');
```

---

## Testing Strategy

Since this is a CLI tool, **manual testing** is primary:

1. Test in a real Git repository
2. Verify all commands work (`churn start`, `churn model`, `churn ask`, etc.)
3. Test all AI providers (Claude, GPT, Gemini, Ollama)
4. Test edge cases:
   - Large repositories (1000+ files)
   - Binary files in repo
   - No API key configured
   - Ollama not running
   - Malformed AI responses
5. Verify exports generate correctly
6. Test keyboard navigation in ReviewPanel

---

## Adding New Features

### New AI Provider
1. Add to `ModelProvider` type in `models.ts`
2. Add models to `AVAILABLE_MODELS` constant
3. Implement `send[Provider]Prompt()` with streaming
4. Add to `sendPrompt()` switch statement
5. Update `ModelSelect.tsx` UI
6. Update docs

### New Command
1. Add to `program.command()` in `index.tsx`
2. Add phase to `AppPhase` type
3. Create component in `src/components/` if needed
4. Add phase routing in `App` component
5. Update README.md

### New Export Format
1. Add function to `reports.ts`
2. Call from `exportSuggestions()`
3. Update `ExportPanel.tsx` UI
4. Document in README.md

---

## Documentation

- **Full Development Docs**: [`docs/development/CLAUDE.md`](./docs/development/CLAUDE.md)
- **User Guide**: [`README.md`](./README.md)
- **Examples**: [`docs/guides/EXAMPLES.md`](./docs/guides/EXAMPLES.md)
- **Changelog**: [`CHANGELOG.md`](./CHANGELOG.md)

---

## Common Gotchas

1. **Bun vs Node**: This is a Bun project - don't use Node.js commands
2. **ESM imports**: Always use `.js` extension for local TypeScript imports
3. **Ink vs React**: Ink uses React but for terminal, not browser (no `<div>`, use `<Box>`)
4. **Hooks order**: Must be consistent across all render paths (see React Hooks Rules above)
5. **Path separators**: Always use `path.join()` or `path.resolve()` for cross-platform compatibility
6. **Git operations**: Always check `isGitRepo()` first

---

## Version Information

**Current Version**: 2.0.12  
**Last Major Update**: Analysis quality improvements, viewport fixes, user confirmation flows

See [`CHANGELOG.md`](./CHANGELOG.md) for version history.

---

**For comprehensive documentation, architecture details, and advanced guides, see:**  
→ [`docs/development/CLAUDE.md`](./docs/development/CLAUDE.md)
