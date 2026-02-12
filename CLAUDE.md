# CLAUDE.md - Project Instructions for Claude CLI

This file provides instructions for Claude CLI users to leverage the project's agent tooling located in `.cursor/`.

## Project Overview

Layerswap UI - A Next.js web application for cross-chain token transfers.

### Quick Start

```bash
yarn
yarn dev
```

### Environment Variables

```yaml
NEXT_PUBLIC_LS_API = https://api-dev.layerswap.cloud/
NEXT_PUBLIC_API_KEY = mainnet  # sandbox for testnets
```

---

## Agent Tooling

This project has specialized agent tooling for common workflows. Before performing these tasks, read the relevant instruction files.

### PR Review System

We have a multi-perspective PR review system with 6 specialized reviewers.

#### Comprehensive Review (Recommended)

For thorough, multi-perspective code reviews, read and follow:

```
.cursor/agents/pr-review-coordinator.md
```

This orchestrates 6 specialized reviewers in parallel:

| Reviewer | File | Focus Area |
|----------|------|------------|
| Architecture | `.cursor/agents/pr-reviewer-architecture.md` | SOLID principles, design patterns, modularity |
| Bugs | `.cursor/agents/pr-reviewer-bugs.md` | Edge cases, null checks, race conditions, cross-file impact |
| Performance | `.cursor/agents/pr-reviewer-performance.md` | N+1 queries, memory leaks, caching, bundle size |
| Quality | `.cursor/agents/pr-reviewer-quality.md` | Naming, readability, DRY, maintainability |
| React | `.cursor/agents/pr-reviewer-react.md` | Hooks, re-renders, state management, a11y, Next.js |
| Security | `.cursor/agents/pr-reviewer-security.md` | Auth, XSS, injection, secrets, CORS |

#### Quick Review

For a single focused review, read and follow:

```
.cursor/agents/pr-reviewer.md
```

---

## Commands Reference

These commands mirror the Cursor IDE commands available in `.cursor/commands/`.

### Review Changes

**Cursor command**: `/reviewchanges`

**Claude CLI equivalent**: Ask "review my changes" or "review this PR", then Claude will:

1. Read `.cursor/commands/reviewchanges.md` for the workflow
2. Follow the instructions to run the appropriate review

**Available review types**:
- `comprehensive` - Full multi-perspective review (default)
- `quick` - Single specialist review
- `explore` - Codebase exploration
- `general` - General purpose analysis

**Output**: Creates `pr-review-report.md` with:
- TL;DR section with verdict and action items
- Effort estimates for each fix
- Blocking vs non-blocking classification
- Copy-paste ready code fixes

---

## Skills Reference

### React & Next.js Best Practices

When writing, reviewing, or refactoring React/Next.js code, reference:

```
.cursor/skills/vercel-react-best-practices/SKILL.md
```

This contains 45+ performance optimization rules organized by priority:

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Eliminating Waterfalls | CRITICAL | `async-` |
| 2 | Bundle Size Optimization | CRITICAL | `bundle-` |
| 3 | Server-Side Performance | HIGH | `server-` |
| 4 | Client-Side Data Fetching | MEDIUM-HIGH | `client-` |
| 5 | Re-render Optimization | MEDIUM | `rerender-` |
| 6 | Rendering Performance | MEDIUM | `rendering-` |
| 7 | Unused Code Detection | MEDIUM | `unused-` |
| 8 | JavaScript Performance | LOW-MEDIUM | `js-` |
| 9 | Advanced Patterns | LOW | `advanced-` |

Individual rules are in `.cursor/skills/vercel-react-best-practices/rules/`.

**Key rules to check**:
- `async-parallel.md` - Use Promise.all() for independent operations
- `bundle-barrel-imports.md` - Import directly, avoid barrel files
- `bundle-dynamic-imports.md` - Use next/dynamic for heavy components
- `rerender-memo.md` - Extract expensive work into memoized components

---

## Project Structure

```
components/     # React components (284 .tsx files)
context/        # React context providers
hooks/          # Custom React hooks
lib/            # Utilities and libraries
Models/         # TypeScript interfaces and types
pages/          # Next.js pages
stores/         # State management (Zustand)
styles/         # CSS styles
```

---

## Common Tasks

### "Review my changes"

1. Read `.cursor/commands/reviewchanges.md`
2. Follow the comprehensive review workflow
3. Output findings to `pr-review-report.md`

### "Review this PR for [specific concern]"

Read the relevant specialist file:
- Security concerns → `.cursor/agents/pr-reviewer-security.md`
- Performance issues → `.cursor/agents/pr-reviewer-performance.md`
- React patterns → `.cursor/agents/pr-reviewer-react.md`
- Bug detection → `.cursor/agents/pr-reviewer-bugs.md`
- Architecture → `.cursor/agents/pr-reviewer-architecture.md`
- Code quality → `.cursor/agents/pr-reviewer-quality.md`

### "Help me optimize this React component"

1. Read `.cursor/skills/vercel-react-best-practices/SKILL.md`
2. Apply relevant rules from the `rules/` directory
3. Focus on `rerender-*` and `rendering-*` rules for component optimization

### "Check for performance issues"

1. Read `.cursor/agents/pr-reviewer-performance.md`
2. Also reference `.cursor/skills/vercel-react-best-practices/rules/` for:
   - `bundle-*.md` rules
   - `async-*.md` rules
   - `js-*.md` rules

---

## Guidelines

- Always read the full file context, not just diffs
- Provide copy-paste ready code fixes
- Include effort estimates for fixes
- Distinguish blocking issues from suggestions
- Follow the output formats specified in agent files
