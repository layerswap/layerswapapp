# Agent-guided native provisioning

This skill has wallet discovery, storage and general extension-staging helpers. Select the actual requested wallet; no universal fixed onboarding script is assumed. Native onboarding changes across versions; use exact installed code/runtime evidence. The current official guide includes Secret Recovery Phrase and social-login choices. For a local test wallet whose words must be saved, choose the phrase-based path. Do not accept a social account login, cloud backup, funding, purchase, transaction or signature as part of setup.

1. Identify trusted distribution and actual manifest/browser versions. Reserve the new wallet name with the session helper in its default shared mode. Use the returned existing dedicated test profile and browser pins; keep a wallet-specific journal and the profile-wide lease. Record public provenance/profile paths before generation. Initialize the shared profile only if it has never been created and has no registered wallets. Never use personal Chrome Default or copy another wallet profile.
2. Before any create button, prepare the encrypted password record and verify its key. Preserve a journal even if onboarding fails. Do not delete uncertain profiles or retry wallet generation automatically.
3. Run a local deterministic provisioning script with all recording/auto screenshots disabled. Before launch, check the session runtime's launch block and stop if present. Use the reservation's exact shared profile and pinned Playwright/browser. Keep its lease; do not call `launchRegisteredWallet` again while holding the reservation, attach to another owner's session or launch a second browser for the other wallets. Obtain verified code identities for every existing extension and the new one. Use the session helper's `launchOptions(candidate, {headless:false}, allProfileWalletsPlusCandidate)` to assemble the complete extension set and Keychain isolation flags; never pass only the new extension to `--load-extension`/`--disable-extensions-except`. Validate package/executable/version pins and `assertCompatibleBrowser` before `chromium.launchPersistentContext(reservation.profile, options)`, then call `verifyBrowserArguments(context, candidate, allProfileWalletsPlusCandidate)` on that owned browser. Wait for each required extension service worker and open the new extension's native UI. A first environment needs an explicitly established compatible pin; do not guess another binary after failure. No background storage/vault/React inspection or LavaMoat bypass.
4. Inspect the non-secret initial screen; follow its real Create wallet/phrase/terms/data-preference controls as requested. Do not dump a screen once it may contain recovery words. Native password actions must be performed through the helper with an already checked extension ID.
5. Use version-specific source or structural metadata/counts to identify the word nodes without exposing their text. Never print all buttons or accessibility trees on recovery pages: those can contain the words. The word locators must identify exactly one English word each, in displayed order, excluding number labels. Word-count/layout mismatch stops; duplicate words are legal and must not be deduplicated.

Local script patterns (the arrays contain **locators**, not strings of words):

```js
import {fillWalletPassword,captureRecovery,fillRecoveryChallenge,completeWallet} from '/absolute/skill/scripts/vault.mjs';
// ref and trustedExtensionId established before onboarding. Never console.log secrets.
await fillWalletPassword(ref, [observedPasswordLocator, observedConfirmLocator], trustedExtensionId);
// Continue native creation/backup only through observed version-specific controls.
await captureRecovery(ref, {words:orderedWordLocators, expectedCount:12, extensionId:trustedExtensionId, read:'text'});
// Read the requested word POSITION labels only; never dump candidate words.
await fillRecoveryChallenge(ref, [{wordNumber:requestedPosition,locator:observedChallengeInput}], trustedExtensionId);
// Finish the native backup challenge and hide recovery UI first.
const result=await completeWallet(ref, fullPublicAddressReadFromNativeAccountUI, {family:selectedChainFamily, validator:addressValidatorFromAppOrVendorSdk});
console.log(JSON.stringify(result)); // public metadata only
```

If a native challenge uses word buttons instead of inputs, extend the helper locally using the words in memory and verified native controls; do not return words to the agent or call a signing API. Keep a narrow reviewed implementation and test the changed behavior. If browser tools cannot avoid model-visible seed output, stop and request private operator completion instead of leaking it.

6. Extract the full public address through a normal native account/address detail dialog. Read-only DOM/locator attributes may expose a full public address; require a single unambiguous value and compare against visible account selection. Do not use private keys, recovery-derived SDK accounts or another signer to compute it. If the wallet creates multiple chain-family accounts, return only addresses actually observed and label their families. The helper accepts a selected chain family and a trusted app/vendor validator. Built-in EVM/Starknet/Fuel format checks are available; other encodings require a validator callback. It never derives an address or proves ownership cryptographically.
7. Verify normal home/account UI, phrase no longer visible, successful native backup, authenticated encrypted record and full public address. Mark complete only after those observations. Record unsupported/blocked stages truthfully. Keep the public report free of private paths if sharing externally. An account is created but unfunded; never claim chain activity, balance or completed transactions.

# Recovery after interruption

- Before generation: prepared password record exists, but do not overwrite it or assume a wallet exists.
- After wallet generation/before phrase backup: retain profile and journal; reopen that exact native backup flow with recording off. Do not create a new account to mask the failure.
- After phrase saved/before challenge: use saved words privately with the original profile/challenge.
- After challenge/before address: read the existing account address and finalize; do not repeat creation.
- After complete: a request for another wallet gets its own ID, credential reference and journal in the same shared profile by default. Requests to unlock an existing test wallet reuse its saved password and profile. Do not rerun onboarding for another extension already containing a wallet.

## Non-MetaMask differences

Read the requested wallet's current official native setup instructions before generation. Preserve its exact ordered word count (12/18/24 supported by the current helper; other formats need a local reviewed implementation). Mobile/hardware/organization/passkey products may have no locally accessible phrase; do not invent or export one. Those paths use a public setup journal and device-managed backup metadata, not completeWallet's recovery-phrase vault path. Confirm all requested native setup stages before marking complete.

For Starknet use the full account address selected in the wallet. Account creation/address availability and onchain deployment are separate: stop before funding/deploying/activating and report deployment unverified/undeployed if that is what the UI shows. Do not install a MetaMask Snap as a silent replacement for the requested Argent X/Ready X or Braavos wallet.

## Clean, partial or isolated scenarios

Separate profiles are exceptions driven by the task: clean onboarding, extension absence, selected extension subsets, incompatible versions or a genuinely independent instance. Use `reserveProvisioning(name,{profileMode:'isolated',reason:'task-specific reason'})`, record the intended extension set and leave the shared default intact. Do not reset or temporarily strip the normal shared environment to simulate a clean test. Never treat contention, launch failure, an OS credential dialog or a new chat as permission to create another environment.

`reserveProvisioning` only reserves a profile; it does not open a browser or create a wallet. Close the owned browser before releasing the reservation, including after failure. Register a completed wallet while its reservation is held. Keep wallet identities, credentials and backup status separate even though they share a profile. Two independent instances of the same extension cannot be registered in one profile; use the wallet's native additional-account flow when that meets the request, or an explicitly justified separate profile. Never reset an existing extension to manufacture a new wallet.
