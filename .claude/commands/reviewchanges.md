# reviewchanges

Review all changes in the current branch compared to the dev branch using specialized subagents.

## What You Get

A comprehensive `pr-review-report.md` with:
- **TL;DR section** with verdict and action items upfront
- **Effort estimates** for each fix (helps prioritize)
- **Blocking vs non-blocking** classification
- **Copy-paste ready code fixes**
- **Single-location findings** (no duplicate issues across sections)

## Available Review Options

### Option 1: Comprehensive Multi-Perspective Review (Recommended)
Uses the **PR Review Coordinator** that runs 6 specialized subagents in parallel:

- **Architecture Review**: Design patterns, SOLID principles, modularity, separation of concerns
- **Bug Detection**: Edge cases, null checks, race conditions, error handling, cross-file impact
- **Performance Analysis**: N+1 queries, memory leaks, inefficient loops, caching opportunities
- **Code Quality**: Naming, readability, DRY violations, comments, maintainability
- **React Patterns**: Hooks usage, re-renders, state management, component patterns, a11y
- **Security Review**: Auth issues, XSS, injection, secrets exposure, CORS

Best for: Thorough, multi-dimensional code reviews before merging

### Option 2: Single Specialist Review
Uses the **PR Reviewer** for focused, faster reviews

Best for: Quick reviews or when you need a specific perspective

### Option 3: Codebase Exploration
Uses the **Explore Agent** to understand code structure and patterns

Best for: Onboarding, understanding existing patterns, or architectural questions

### Option 4: General Purpose
Uses the **General Purpose Agent** for complex multi-step analysis

Best for: Custom analysis or research questions about the codebase

## How to Use

Ask for a review using the command, specifying which type you want:
- `/reviewchanges comprehensive` - Full multi-perspective review (default)
- `/reviewchanges quick` - Single specialist review
- `/reviewchanges explore` - Codebase exploration
- `/reviewchanges general` - General purpose analysis

All reviews automatically compare your current branch against the dev branch.

## Report Format

The comprehensive review produces a report structured for actionability:

```
# PR Review: [branch] → [base]

## TL;DR
Verdict + action items table with effort estimates

## What This PR Does
Brief description

## Breaking Changes
Checklist

## Detailed Findings
Each issue once, numbered for reference

## File Summary
Quick navigation table

## Review Checklist
Single scannable checklist
```
