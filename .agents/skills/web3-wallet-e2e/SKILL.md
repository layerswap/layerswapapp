---
name: web3-wallet-e2e
description: Test Web3 application UI and real browser wallets on demand from natural-language requests, including focused flows, changed-code journeys and interactive exploration through native confirmation inspection and rejection. Never send transactions or sign asset-moving messages.
---

# Real wallet E2E, ending at rejection

Requires Node.js 22+, Playwright Chromium, a trusted unpacked extension and a privately provisioned dedicated test profile; headed display may be required.

Never authorize a transaction or signature, including on local chains. Do not use existing send/local transaction commands, SDK signers, RPC submission, private keys, wallet mocks or fallback signers. Connection approval is allowed only for the dedicated test account and verified app origin. Read [safety](references/safety.md) before browser work.

## Reuse the registered wallet across chats

First read [the sibling session skill](../web3-wallet-session/SKILL.md). Resolve the named wallet or registered default in `~/.codex/wallet-runtime/registry.json`, independent of cwd/worktree/chat. Launch through that skill's `launchRegisteredWallet` and unlock through its private credential reference with recording off. Use `walletName`/`runtimeModule` in saved-runner config. Account mismatch, missing profile, browser/extension pin mismatch or an existing lease stops the run without fallback.

Never use the user's personal Chrome/CUA browser surface, attach to another agent's wallet/CDP session, create a new profile/account, restore/import a phrase or delete locks to continue a test. Wait for the current owner to close/release before using the same persistent profile. A macOS login/Chromium Safe Storage prompt is not wallet unlock: stop; never enter/request a Mac password, approve OS Keychain access or alter Keychain entries. Do not guarantee launch flags can suppress all OS prompts.

Do not launch fresh profiles as recovery probes or wallet fallbacks. In another installation, install/configure the shared session helper and a dedicated registry rather than discovering personal browser profiles.

## Follow the user's testing intent

The user chooses when and what to test in natural language. Infer the smallest useful scope and execution approach; do not require a mode, test plan, PR trigger, schedule or saved scenario. Ordinary repository inspection, server startup, browser setup, dedicated-wallet connection, UI exploration and evidence collection are part of the requested testing task. Ask only for essential information unavailable in the repository/runtime.

- **Direct request** ("Test MetaMask connection", "Check this wallet fix", "Explore the token selector"): locate that UI and reuse available setup. Read only relevant source/configuration and exercise the real flow. Do not analyze unrelated Git changes or require repository-wide discovery/matrices.
- **Change-aware request** ("Test uncommitted changes", "Inspect PR #123 and test affected UI", "Run relevant tests on this branch"): inspect the requested diff, including staged/unstaged changes where relevant. Identify affected journeys, reuse useful tests, explore missing coverage and investigate failures. Select representative coverage; do not run all wallets/chains automatically. If explicitly demonstrating this style on a clean branch, use a relevant historical diff and disclose its range. See [discovery](references/discovery.md).
- **Open-ended exploration** ("Explore an EVM swap", "Test the new Tron integration"): inspect the relevant functionality and adapt interactively to observed UI. No predefined scenario is required. Unknown real-wallet automation remains UNSUPPORTED; never replace it with a signer/mock.

Give a brief scope/setup summary before installing or modifying anything. Separate source evidence, runtime observations and unknowns. Use `scripts/discover.mjs` only when broad discovery is useful; use [wallet-matrix](references/wallet-matrix.md) when coverage choices warrant a matrix. Never invent routes or selectors.

## Execute immediately; save regression tests when useful

For immediate exploration, use available Playwright/browser tooling and the pinned real extension, with the same no-submit boundary. Find or start the appropriate dev server. For changes, verify the runtime serves the changed checkout; production behavior alone cannot validate local changes. Minimize setup and adapt from actual UI observations. Record reproducible bug steps and evidence. Do not create permanent tests for every exploration.

For requested repeatable testing, or when persistence is clearly part of the task, save/reuse deterministic Playwright or JSON scenarios and use `scripts/test.mjs`; read [test-design](references/test-design.md). The user does not need to choose these implementation details. The bundled adapter is calibrated only to MetaMask 13.54.0 transaction confirmation; other layouts/types require safe exploration and adapter validation. Ordinary network switching may be approved only after verifying the native request's origin and exact intended chain; never treat a financial confirmation or signature as network approval.

## Verify the UI users can actually operate

Apply this check to each tested screen and before interacting with its controls, including the swap trigger. A successful locator click or DOM visibility check alone is not evidence of usable layout: automation can scroll containers programmatically even when ordinary scrolling is blocked.

- Inspect a screenshot of the current viewport before acting and after meaningful layout changes (expanded details, dialogs, validation/errors, wallet panels). Verify the intended control is visibly identifiable, unobscured and reachable. Keep capture off during wallet unlock/recovery and other secret handling.
- If the control is offscreen, use ordinary wheel/trackpad-equivalent scrolling over the intended page or container, or a supported user-facing keyboard navigation path. Inspect the resulting viewport to establish reachability before clicking. Do not rely on locator auto-scroll, `scrollIntoView`, setting `scrollTop`, forced clicks, DOM-dispatched clicks, or CSS/DOM changes to pass this check.
- Start with the user's current window and zoom. Do not enlarge the viewport, zoom out, collapse sections or close panels solely to hide clipping or blocked scrolling. If a user-facing workaround helps continue exploration, first record the original failure and report the workaround separately; it does not turn the failed layout into a pass.
- If required controls are clipped, covered, or unreachable through normal interaction, mark that UI check FAIL and stop the affected action. If visual/reachability evidence cannot be obtained, mark it BLOCKED. Continue only independent checks; do not bypass the defect to trigger a wallet request.
- Record the tested viewport dimensions, relevant expanded sections/panels, and screenshot or concise reproduction evidence. Report functional results separately from layout/reachability. Claim only the screens and viewports actually checked, never that the entire UI is unbroken. Add other viewport sizes when requested or relevant to the observed defect.

Saved runners need the same visual/reachability evidence. Without it, report their functional results as partial validation and the UI check as unverified; see [test design](references/test-design.md).

## Execute and report

1. Reuse available Playwright/browser tooling; for the saved runner use `playwrightPackage` or the standalone package after the relevant setup check. See [installation](references/installation.md).
2. Pin a trusted extension's version and code digest. `extensionIdentity` reads extension code only. Do not derive trust from the extension ID or observed hash alone.
3. Reuse the registered shared profile and private credential reference. Only explicit new-wallet provisioning allocates a new profile, outside recording; never copy a personal browser profile.
4. If readiness is unknown, optionally run `node <skill>/scripts/setup.mjs <config>` for a fresh-profile extension and app readiness probe. Reuse known-good setup for focused requests. It does not connect or test a transaction.
5. Exercise the requested flow interactively, or run `node <skill>/scripts/test.mjs <config> <scenario>` for saved regression testing. The app drives the wallet request through its real UI. Inspect the native confirmation; record missing fields; capture safe evidence; reject once; verify app rejection UI and no remaining wallet requests. No automatic retry.
6. Each saved-runner execution emits private `artifacts/<scenario>-<uuid>/result.json` and `report.md`. Rebuild a report with `node <skill>/scripts/report.mjs <result.json>`. Preserve PASS/FAIL/BLOCKED/UNSUPPORTED and each individual check. A failed expected detail is FAIL; inaccessible evidence is BLOCKED. Opening MetaMask does not prove a completed operation or onchain success.

Record chain ID from the real provider separately from native network text; never label provider data as wallet-displayed evidence. Capture token/amount, account, recipient/spender, fee estimates, decoded details, simulation, warnings, browser/extension versions, public source account, commit, URL, console error categories and artifact paths. Missing or inaccessible values remain null. No intentional authorization actions is narrower than verified absence of broadcast; report independent verification as unknown unless read-only chain monitoring supports it.

If blocked, stop safely and use [troubleshooting](references/troubleshooting.md). An operator may need to provision/unlock privately; never ask for recovery phrases. Do not claim real flow validation from unit tests, readiness probes, historical artifacts or local submission tests.

## Match reporting to the request

For every task state requested scope, what was actually exercised, app URL/build and wallet/version, passed/failed checks, blockers/untested areas, relevant evidence, and bug reproduction steps where applicable. Keep a single connection test concise; give change-aware work affected-flow coverage and remaining risks. Do not require a large permanent report for a short task. Never call opening confirmation a completed blockchain transaction. No automatic triggers or schedules are required or created.

When inspecting native MetaMask pages, use locators and native text/attribute reads. Custom `page.evaluate`/`locator.evaluateAll` may fail under LavaMoat; never disable its protections. To verify the public EVM account independently of a dapp, use Receive → the unique Ethereum address row → Show QR code, then read `account-address`. Check that actual full address against the registry; verify the selected chain separately for chain-specific tests.
