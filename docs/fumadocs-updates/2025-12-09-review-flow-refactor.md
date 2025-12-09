# Review Flow Refactor - December 9, 2025

## Overview

This update completely redesigns the post-analysis review flow to be more scannable, actionable, and agent-friendly. The old one-by-one checkbox review has been replaced with a scoped handoff approach.

## The Problem

The previous review panel forced users to go through 215+ findings one-by-one, checking boxes. This was:
- Slow and tedious
- Defeating the purpose of an agent-first workflow
- Visually cluttered with poor information hierarchy

## The Solution

The new flow enables:
1. **Scannable** - see what you got at a glance with meaningful summaries
2. **Actionable** - make ONE scoping decision, not 215 individual ones
3. **Agent-friendly** - fast path to handoff with sensible defaults
4. **Human-in-the-loop** - optional drill-down when you want control

## New User Flow

```
churn run
    |
    v
[Analysis Summary Screen]
    |
    +-- [H] Pass HIGH only --> Agent handoff
    +-- [M] Pass HIGH + MEDIUM --> Agent handoff
    +-- [A] Pass ALL --> Agent handoff
    +-- [R] Review first --> Drill-down browser --> then pass
    +-- [E] Export only --> JSON/MD/patch, no agent
```

## New Components

### AnalysisSummary.tsx
The new post-analysis landing screen showing:
- Analysis completion status with timing and cost
- Severity breakdown with progress bars (HIGH/MEDIUM/LOW)
- Category summaries per severity (e.g., "4 potential bugs", "3 security vulnerabilities")
- Action keys: [H] [M] [A] [R] [E]

### ReviewBrowser.tsx
Optional drill-down tree browser with **exclude mode** (everything included by default):
- Three-level tree: Severity > Category > Finding
- Expand/collapse navigation
- Space to toggle, X to exclude group, I to include group
- V to view finding detail, P to pass included findings

### FindingDetail.tsx
Extracted detail view modal (previously inline in ReviewPanel):
- Full finding information with file path
- Before/after code blocks
- Include/exclude toggle

### AgentOnboarding.tsx
First-run agent configuration as part of init sequence:
- Prompts after model selection
- Select target agent (Claude Code, Cursor, Gemini CLI, etc.)
- Skip option marks onboarding complete (won't nag again)

## Updated Components

### ExportPanel.tsx
Refactored with `mode` prop:
- `'handoff'` mode: Export files + launch agent (with Y/N/R confirmation)
- `'export-only'` mode: Export files only, return to summary

Handoff flow respects `autoLaunch` config setting.

### StartMenu.tsx
Now shows configured agent status:
- "+ Agent settings (claude ✓)" when configured
- "+ Agent settings (not configured)" when not

### theme.ts
Added new visual elements:
- Tree characters: `▼` `▶` `├─` `└─` `│`
- Checkbox characters: `[✓]` `[ ]` `[○]`
- Severity colors: HIGH=#f38ba8, MEDIUM=#f9e2af, LOW=#a6adc8
- Category label helpers for human-readable display

### config.ts
Added onboarding tracking:
- `onboardingComplete` flag in ChurnConfig
- `hasCompletedOnboarding()` helper
- `setOnboardingComplete()` helper
- `isAgentConfigured()` helper

### analysis.ts
Added `security` to the `FileSuggestion.category` union type.

## Init Flow Changes

First-run sequence:
```
Model Selection --> Agent Onboarding --> Start Menu
                    (skip = complete)
```

The onboarding is part of initial setup, not a separate phase after.

## Phase Changes in index.tsx

New phases added:
- `onboarding` - First-run agent configuration
- `summary` - Analysis summary screen (replaces direct to review)

Updated phase flow:
```
run --> summary --> [H/M/A] --> export (handoff mode) --> complete
                --> [R] --> review --> [P] --> export --> complete
                --> [E] --> export (export-only mode) --> summary
```

## Migration Notes

- `ReviewPanel.tsx` is retained for backwards compatibility with standalone `churn review` command
- The main interactive flow now uses `AnalysisSummary` and `ReviewBrowser`
- Old review behavior can still be accessed via `churn review` command

## Files Changed

| File | Change |
|------|--------|
| `src/components/AnalysisSummary.tsx` | NEW |
| `src/components/ReviewBrowser.tsx` | NEW |
| `src/components/FindingDetail.tsx` | NEW |
| `src/components/AgentOnboarding.tsx` | NEW |
| `src/components/ExportPanel.tsx` | MODIFIED |
| `src/components/StartMenu.tsx` | MODIFIED |
| `src/engine/config.ts` | MODIFIED |
| `src/engine/analysis.ts` | MODIFIED |
| `src/theme.ts` | MODIFIED |
| `src/index.tsx` | MODIFIED |

## Testing Checklist

- [ ] First-run: Model selection -> Agent onboarding -> Start menu
- [ ] Run scan -> Summary screen displays correctly
- [ ] Press H: Pass HIGH only to agent
- [ ] Press M: Pass HIGH+MEDIUM to agent
- [ ] Press A: Pass ALL to agent
- [ ] Press R: Navigate to ReviewBrowser
- [ ] ReviewBrowser: Expand/collapse tree navigation
- [ ] ReviewBrowser: Toggle include/exclude
- [ ] ReviewBrowser: Press P to pass included
- [ ] Press E: Export only, return to summary
- [ ] Handoff confirmation: Y/N/R options work
- [ ] No agent configured: Shows configure prompt
- [ ] Agent not available: Shows error with file paths
- [ ] Start menu shows configured agent status
