# Discovery checklist

Apply this broad checklist only to unfamiliar/open-ended or change-aware work. For a focused request inspect only what is needed to locate and execute that flow; skip unrelated diffs and repository-wide scans. Start read-only. Inspect root and workspace manifests, lockfiles, app entry points, framework config, tests, wallet libraries, provider factories, supported network configuration, connection dialog and operation handlers. Use rg first. Read complete matching files, not only diff hunks. Do not read .env contents, wallet profiles or secret fixture files. Record necessary environment variable names from code/examples; do not copy values.

The discover helper scans tracked-style nonignored source files and reports file+line+matched terms without copying source lines. It does not resolve runtime SDK support. For monorepos follow package dependencies to the actual app, provider implementation and chain registry. Routes may be dynamic; verify runtime URLs from real navigation. Wallet names in a type, registry or dependency are candidates, never proof of supported automation.

When broad discovery is useful, produce a summary with:
- package manager/workspaces and actual app start command;
- framework, routes, component/handler paths, existing E2E tools;
- wallet/library and chain-family evidence with file+line references;
- initiation → connection → preparation → native request → requested approval/signature or rejection → app result;
- configuration names and known dev/staging origins, including source;
- runtime-only observations and unresolved prerequisites.

Run `node scripts/discover.mjs /repo origin/main > discovery.json` to include PR changed filenames. The diff command is read-only and does not fetch. If the base is unavailable, report unknown rather than inventing change scope. Compare changed wallet/transaction paths against discovered scenarios, rank risk, and explain recommended coverage. Do not execute the plan while generating it.

Before installing tools, describe what already exists and which capabilities are missing. Reuse compatible Playwright and browser setup. Read an existing financial test command's execution path and match any submissions/signatures to the user's requested scope before invoking it; local/test names alone do not describe its effects.

For uncommitted changes inspect both `git diff` and `git diff --cached`, including relevant untracked source. For branch changes choose the actual merge base; for a requested PR inspect its actual patch. Use a historical diff only when appropriate and disclose the range. Start/reuse a server serving the affected checkout; report missing dependencies/build/environment blockers rather than presenting production-only checks as local-change validation.
