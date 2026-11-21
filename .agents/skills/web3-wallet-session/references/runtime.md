# Runtime controller

Default root: ~/.codex/wallet-runtime. Private directories use 0700; registry, locks and credential files use 0600. Neither chat ID nor repository cwd participates in wallet selection. Public records include name, wallet type, accounts by family, absolute profile path, pinned Playwright package/version/executable, extension path/id/version/hash, status and credential **reference**.

```text
wallet-runtime/
  registry.json
  profiles/<environment>/        shared default or justified isolated scenario
  extensions/<id-version>/      verified code only
  credentials/<wallet-name>.env private password reference, when explicitly authorized
  locks/_profile-<hash>.lock     exclusive browser-profile owner
  locks/<wallet-name>.lock       compatibility/member leases
```

Do not move a profile with an active/uncertain owner. A previously abandoned native SingletonLock can be reconciled only after proving the lock is on this host and its PID no longer exists; never infer staleness merely from elapsed time. The regular launcher blocks stale/uncertain locks rather than deleting them automatically. Do not delete a registry lease even if its PID seems dead without checking browser state: the browser can outlive its runner.

Use from any trusted Playwright script:

```js
import {launchRegisteredWallet,withPasswordEnvironment} from '/absolute/path/to/web3-wallet-session/scripts/runtime.mjs';
const session=await launchRegisteredWallet('my-test-wallet');
try {
  // Use the selected wallet adapter, never a generic personal-browser connector.
  const wallet=new MetaMask(session.context,session.extension);
  await withPasswordEnvironment(session.record,()=>wallet.ready()); // all recording OFF
  // Real app navigation, public account/chain check, UI inspection, then rejection or user-requested approval/signing through the native adapter.
} finally {
  await session.close();
}
```

Do not open the same profile in two processes. Persisted wallet state provides sequential access across chats; the lock protects it from simultaneous conflicting interactions. A chat that needs to keep a browser open must retain its lease and tell other chats it is busy. Handoffs close/release then reopen the registered profile; there is no unprotected remote-debugging listener.

Credential references support an owner-only env file or the provisioning vault. An env file is only for the unlock password, never recovery words. `withPasswordEnvironment` loads the registered password privately for the adapter callback, restores the prior process environment afterward, and redacts browser errors from secret input. Missing/locked credentials are a specific wallet blocker, not a reason to open another instance or ask for a Mac password. Recovery words are never exported or used for restore during ordinary wallet reuse. The env-file path reads only an unlock password; a combined encrypted vault record may decode words in memory while retrieving its password, but must not return or use them.

The browser binary is pinned to the configured Playwright installation; a browser/package update, extension update, missing profile, account mismatch, keychain prompt or unknown lock causes a stop with no fallback. Upgrade pins deliberately after validation, never by silently launching whatever Chrome is available. Mock-keychain/basic password-store settings apply exclusively to these test-only profiles; avoid storing personal logins, payment data or production wallets in them.

`list` and `show` return public metadata only. `open <name>` launches the dedicated browser without automatic unlock or recording and holds the lease until browser close. It does not inspect pending wallet requests; an agent must do that with the correct wallet adapter before driving an app. Do not launch a fresh diagnostic profile as a recovery fallback.

## Registration

Prepare a record in local code and call `registerWallet(record,{makeDefault:false})` only after observing its real native public address and backup state. For a new wallet, first reserve the name with reserveProvisioning; release after registration/cleanup. Keep private credential values out of the record. The record's profile must be inside the shared profiles directory and the extension code inside shared extensions. Missing registries do not trigger Chrome profile discovery.

The E2E runner accepts `walletName` and `runtimeModule` in config. When configured, all identity, launch and unlock data come from this registry; old per-worktree profile/extension fields are ignored.

## Default shared provisioning environment

`reserveProvisioning(name,{root})` returns the existing shared profile, member records and browser pin. Selection uses `registry.defaultProfile`, otherwise the default wallet's profile, otherwise the unique registered profile. An ambiguous registry stops. With no existing environment it selects `profiles/shared-test`. The selected `defaultProfile` is persisted, so interrupted onboarding or another wallet name does not allocate another environment. It never recreates a missing registered profile.

A reservation locks the whole profile and member/new wallet names until release. Hold it while adding the new extension, onboarding and registering, and close the owned browser before release. `registerWallet` accepts compatible distinct extensions in that profile while the reservation is held. `launchRegisteredWallet` subsequently loads all registered profile members together. New credentials and journals remain per wallet. No live wallets or profiles are migrated by this helper update.

Use `reserveProvisioning(name,{root,profileMode:'isolated',reason:'clean onboarding / selected-extension scenario'})` only when required by the task or a specific isolation need. The reason is mandatory; retain it in setup metadata. This selects a separately named profile and does not replace the shared default. Do not reinterpret busy locks, missing state or browser/Keychain failures as an isolation need. Existing profiles keep their stored paths; changing the default policy does not merge their wallet storage.
