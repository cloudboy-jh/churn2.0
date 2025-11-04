# Churn CLI v2.0.8 Implementation Plan

**Date**: 2025-11-04  
**Version**: 2.0.7 → 2.0.8  
**Status**: In Progress

---

## Issues to Fix

### 1. Double ASCII Logo Render
**Problem**: Logo component renders multiple times during phase transitions  
**Root Cause**: Each phase block (model, confirm, run, review, etc.) has its own `<Logo>` component  
**Locations**: src/index.tsx lines 198, 211, 227, 253, 266, 280, 292, 304  
**Solution**: Move logo to App level (outside phase conditionals), render once

### 2. TUI Exiting After 1 Second
**Problem**: App exits prematurely after 1-1.5 seconds  
**Root Cause**: App reaches "complete" phase too early (lines 146-148), triggering auto-exit (lines 68-76)  
**Solution**: 
- Remove premature `setPhase("complete")` calls
- Only transition to complete after full workflow
- Keep model/setup commands on their respective phases

### 3. Make `churn start` Interactive
**Problem**: `churn start` is just an alias for `churn run`  
**Current**: Lines 390-412 in src/index.tsx  
**Solution**: Create interactive menu with options:
1. Run scan (trigger analysis)
2. Choose model (model selection)
3. Exit

**New Component**: `src/components/StartMenu.tsx`

### 4. Keep `churn run` for Power Users
**Current**: Same as `churn start`  
**Solution**: Keep current direct execution behavior, differentiate from `churn start`

### 5. Fix Duplicate Model Command in Help
**Problem**: Model switching listed twice in help output  
**Solution**: Find and remove duplicate command registration in src/index.tsx

### 6. Fix Bun Install Package Lock Issue
**Problem**: `bun install` reads package-lock.json, installs 5933 files  
**Root Cause**: Bun migrating npm's package-lock.json instead of using native registry  
**Solution**:
- Delete package-lock.json
- Create .bunfig.toml to configure Bun registry
- Update .gitignore to ignore package-lock.json
- Clean install with `bun install`

---

## Implementation Steps

### Phase 1: Create Tracking Document
- [x] Create IMPLEMENTATION.md ← You are here

### Phase 2: Fix Core Issues
- [ ] Fix double logo render (src/index.tsx)
- [ ] Fix TUI exit issue (src/index.tsx)
- [ ] Create StartMenu component (src/components/StartMenu.tsx)
- [ ] Make churn start interactive (src/index.tsx)
- [ ] Keep churn run as-is
- [ ] Fix duplicate model command (src/index.tsx)
- [ ] Delete package-lock.json
- [ ] Create .bunfig.toml
- [ ] Update .gitignore
- [ ] Run `bun install` to regenerate lockfile

### Phase 3: Documentation & Release
- [ ] Update README.md (document new start menu, Bun requirement)
- [ ] Update package.json version to 2.0.8
- [ ] Update CHANGELOG.md with release notes
- [ ] Create git tag v2.0.8

### Phase 4: Cleanup
- [ ] Delete IMPLEMENTATION.md

---

## Files to Modify

### Core Changes
- ✏️ `src/index.tsx` - Logo placement, phase logic, commands
- ➕ `src/components/StartMenu.tsx` - New interactive menu component

### Configuration
- 🗑️ `package-lock.json` - Delete (npm lockfile)
- ➕ `.bunfig.toml` - Bun registry configuration
- ✏️ `.gitignore` - Ignore package-lock.json

### Documentation & Release
- ✏️ `README.md` - Document changes
- ✏️ `package.json` - Version bump to 2.0.8
- ✏️ `CHANGELOG.md` - Release notes

### Temporary
- 🗑️ `IMPLEMENTATION.md` - Delete after completion

---

## Notes

- This is a Bun project (NOT Node.js)
- Always use `.js` extensions for local imports
- Follow React Hooks rules (no conditional hooks)
- Use Ink components (not HTML)
- All paths should be cross-platform compatible

---

## Testing Checklist

After implementation, test:
- [ ] `churn start` shows interactive menu
- [ ] Interactive menu options work (Run scan, Choose model, Exit)
- [ ] `churn run` executes directly without menu
- [ ] Logo renders only once
- [ ] App doesn't exit prematurely
- [ ] `bun install` uses Bun registry (fewer files)
- [ ] Help output shows correct commands (no duplicates)
- [ ] All commands work: start, run, model, ask, review, export

---

**Status**: Phase 1 Complete ✓  
**Next**: Phase 2 - Fix Core Issues
