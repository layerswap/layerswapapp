# Official extension installation and skill setup

Use official vendor download pages and follow their store links, not search ads or lookalike downloads. For MetaMask start at https://metamask.com/download or https://support.metamask.io/start/getting-started-with-metamask. In a normal supported browser the agent may follow Add to browser/Add extension prompts under the user's install request, using native browser controls. Verify the installed extension ID, version and publisher/source after installation. Do not automate security-warning bypasses.

For the dedicated test Playwright Chromium environment, use a verified official unpacked distribution or reuse the installed official **extension directory only**. Extension code contains no wallet recovery phrase; the user profile does. Do not copy the profile, unlock state or vault. Playwright's current extension guidance requires persistent bundled Chromium for side loading; do not assume branded Chrome/Edge side-loading flags work.

The staging helper deliberately does not implement an unauthenticated downloader or archive extractor. Obtain the actual extension through its official store or independently verified vendor release, record provenance, verify exact version/hash, then:

```sh
node /path/to/web3-wallet-provision/scripts/install-extension.mjs /trusted/unpacked/source /private/new/extension-dir ACTUAL_VERSION TRUSTED_64_HEX_DIGEST VERIFIED_EXTENSION_ID
```

Supply the independently verified official extension ID for the requested wallet; no MetaMask-only restriction remains. MetaMask's ID is nkbihfbeogaeaoehlefnkodbefgpgknn; other IDs must come from the vendor-linked store, not guesses. A matching manifest ID alone does not authenticate copied extension code. The helper hashes versioned code, refuses symlinks, verifies the pinned digest before copying and verifies the copied code afterward, and never overwrites an existing destination. Failed partial destinations remain for inspection; do not auto-delete/retry an uncertain installation. Its success means code is staged, not that browser loading or wallet creation succeeded. Native browser installation and actual Chromium loading must be validated separately.

The current existing test environment has MetaMask 13.54.0. This is an observed baseline, not a newest-release claim or proven automatic onboarding support. Other wallets/versions use official installation and native-flow calibration; do not advertise adapter coverage without actual validation.

Install this whole skill folder for Codex in ~/.codex/skills/web3-wallet-provision or a project's .agents/skills/web3-wallet-provision. Claude Code uses ~/.claude/skills/web3-wallet-provision or .claude/skills/web3-wallet-provision. Keep vaults, keys, browser profiles and local configs outside the skill so they are never copied along with it.

Invoke naturally: `$web3-wallet-provision Create a fresh MetaMask test wallet, save its credentials securely, and give me its public EVM address.` Claude Code: `/web3-wallet-provision` followed by the request. The agent chooses appropriate setup and does not require a user-authored plan. No blockchain operation is included.

Validation: `node --test /path/to/web3-wallet-provision/test/*.test.mjs` needs Node.js 22+ and no npm dependencies. Browser creation requires a separately available compatible Playwright/native browser tool. Storage tests use synthetic words, never an actual wallet or funds.

Official sources checked 2026-11-04:
- https://agentskills.io/specification
- https://metamask.com/download
- https://support.metamask.io/start/getting-started-with-metamask
- https://support.metamask.io/start/creating-a-new-wallet/
- https://support.metamask.io/start/user-guide-secret-recovery-phrase-password-and-private-keys/
- https://playwright.dev/docs/chrome-extensions

Validation on 2026-11-04: nine storage/native-surface tests passed; the skill metadata validator passed; the installer copied the pinned installed official MetaMask 13.54.0 code into a new private directory and verified its digest; actual isolated Chromium loaded that copy and exposed the native Create a new wallet control. Recording was disabled. No real wallet was generated and no real recovery phrase was accessed during this skill-authoring task. Full native wallet creation/backup/address extraction remains agent-guided and must be validated on invocation; do not claim unattended onboarding coverage from these checks.

For a Layerswap-compatible wallet, start with references/layerswap.md and the discovery helper. Public registry/store links are candidates, not trust anchors: follow the selected vendor's official download link to verify publisher and store ID. If a manifest has no public key or a different browser manifest format, use native official-store installation instead of weakening integrity checks. Installation automation may require browser/OS controls; never equate a catalog entry with installed software.

The provider-aware expansion adds generic verified extension IDs, chain-family completion, 38 source/SDK discovery seeds and open-ended runtime discovery; see layerswap.md for the latest checks and limits. The earlier nine-test/native MetaMask readiness result above is historical, not the current full test count.

## Cross-chat wallet runtime

Install web3-wallet-session alongside this skill. Its canonical registry is ~/.codex/wallet-runtime/registry.json; profiles/extension code and private credential references are shared across chats and worktrees. Read its SKILL.md first for existing wallets. Never copy runtime data, password files or vault keys into a distributable skill. The runtime launcher pins the Playwright executable, uses test-only mock-keychain/basic-password-store flags, serializes profile access and refuses personal-browser or fresh-wallet fallback. OS Keychain prompts stop the task, not trigger a password request.

## Profile selection

By default install every test-wallet extension into the same registered persistent browser profile. Keep all extensions needed by a multi-wallet dapp journey loaded together. Reserve it through `web3-wallet-session`; keep profile access exclusive while installing/restarting/onboarding. A separate clean/partial/isolated profile needs a reason grounded in the task and never replaces the ordinary shared default. Separate wallet IDs and secret records do not imply separate profiles. See provisioning.md for the combined extension launch procedure.
