---
name: web3-wallet-session
description: Reuse the user's registered dedicated Web3 test wallet consistently across chats and worktrees. Resolve the shared wallet profile, pinned browser/extension and private credential reference; serialize access without personal Chrome, new-wallet fallback or macOS Keychain approval.
---

# One registered wallet across chats

Use this skill first when interacting with an existing browser wallet, including wallet connection, UI testing, unlocking or continuing setup. The public registry is `~/.codex/wallet-runtime/registry.json`. It contains identity and paths, never passwords/recovery words. This machine-wide registry is independent of repository/worktree/current directory.

1. Run `node <skill>/scripts/runtime.mjs list` or `show <wallet-name>`. Resolve the explicitly named wallet or its unique registered wallet type or chain family (`accounts` key). Use the registered default only when the user has not specified another wallet. If missing or ambiguous, stop and report it; never silently use MetaMask, a personal browser, a fresh profile or a second account.
2. Import `launchRegisteredWallet` from `scripts/runtime.mjs`. It takes a name and uses the recorded absolute profile, exact Playwright package/browser binary and managed extension version/hash. Do not supply another profile, executable, Chrome channel, debugging port or browser args. Do not use CUA/Chrome's personal browser surface for wallet interactions.
3. The launcher acquires a profile-wide process lock and all member wallet-name leases across chats. Another owner means WALLET_BUSY_NO_PROFILE_FALLBACK: report busy and wait for that owner to finish/close, or coordinate an explicit handoff. Do not delete locks, kill other agents' browsers, attach by CDP, copy profiles, restore/import seeds, or create replacement wallets to bypass contention.
4. Unlock using `withPasswordEnvironment(record, action)` and the registry's private credential reference, or the provisioning vault's private fill helper. No traces, screenshots, video or input/console capture during unlock. Verify actual public account and selected chain against the registry before testing; mismatch stops. Credentials never go into tool output or command arguments.
5. Always close through the returned session's `close()` in finally; this releases the lease after browser closure. Persistent wallet data stays in the same directory for the next chat/process. If close fails, leave the lock and report uncertainty. A pending transaction must be explicitly rejected through the correct native control before handoff/closure; closing a browser alone is not rejection evidence.

## Launch block and recovery

If `~/.codex/wallet-runtime/launch-block.json` exists, browser launches are disabled. Do not remove/bypass the marker, call Chromium directly, change flags/modes/executables or open a fresh diagnostic profile to work around it. The user reported repeated OS Keychain prompts during verification on this machine. Resolve identity and do offline work only; report the block. Further live browser diagnosis needs an agreed recovery approach, not more repeated launches.

## macOS Keychain is separate

The screenshot/message “Chromium Safe Storage”, “login keychain password”, “wants to use confidential information”, or similar is an OS Keychain prompt, not the wallet password screen. Stop and report SYSTEM_KEYCHAIN_PROMPT. Never enter the wallet password, request/store the user's Mac login password, click Allow/Always Allow, change/delete Keychain entries, or approve OS credential access to make automation proceed. The registered browser uses explicit `--use-mock-keychain` and `--password-store=basic` in an isolated **test-only** profile. These flags are not a guarantee that no OS prompt can ever appear; if one appears, stop. Never weaken a personal browser's storage settings.

## Creating another wallet

Only create a new wallet when the user asks for one; a new wallet normally joins the existing shared test profile. “Use”, “connect”, “unlock”, “set up the existing wallet” or a new chat is not a request for a second wallet. For explicit creation use the provisioning skill, reserve a unique name with `reserveProvisioning(name)`, use its returned shared profile and browser pins, stage verified code under `extensions/`, save credentials privately and register the actual public account on completion. Keep all existing extensions loaded alongside the new extension. A new chain, wallet type or chat does not imply a separate profile. For task-required clean/partial/isolation scenarios, use `reserveProvisioning(name,{profileMode:'isolated',reason:'...'})`, retain the reason, and preserve the shared environment and default. Do not create an isolated profile to bypass contention, missing state or a launch failure. Do not change the default wallet silently. The recovery phrase is not needed to reuse an existing profile.

## Existing environment and portability

Read [runtime notes](references/runtime.md) for setup, registration and shared-profile use. Resolve the default or requested wallet from the destination registry. Separate environments have separate local profiles and credentials.

The session helper grants no transaction/signing authority. Preserve the user's no-submit boundary. Opening a wallet does not authorize signing, approvals, deployments or funding.

## Multiple wallets in one profile

Launch any registered member once with `launchRegisteredWallet`. Use `session.wallets[name]` for each member's record and extension in the same browser context. Close that session once to release the profile lease.
