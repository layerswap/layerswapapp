# Installation and use

This folder is self-contained; no Layerswap import, route or package is required. Keep one canonical copy and copy the complete folder (excluding node_modules, artifacts, .state and local configs) into the desired skill directory. Do not overwrite an existing skill without reviewing differences.

From the skill's parent directory:

```sh
# Codex project installation (official repo skill convention)
mkdir -p /path/to/project/.agents/skills
cp -R web3-wallet-e2e /path/to/project/.agents/skills/
# Personal Codex installation supported by the current desktop skill loader
mkdir -p "$HOME/.codex/skills"
cp -R web3-wallet-e2e "$HOME/.codex/skills/"
# Claude Code project installation, or use ~/.claude/skills for personal scope
mkdir -p /path/to/project/.claude/skills
cp -R web3-wallet-e2e /path/to/project/.claude/skills/
```

Restart/reload the agent if needed. Codex: `$web3-wallet-e2e discover this repository and test native wallet rejection`. Claude Code: `/web3-wallet-e2e discover this repository and test native wallet rejection`. agents/openai.yaml is optional Codex metadata; the portable SKILL.md and resources are sufficient for compatible Agent Skills clients. Discovery is read-only and has no npm dependencies.

After discovery, choose an isolated tooling package. Reuse existing Playwright by setting `playwrightPackage` to an absolute/relative path to that package's package.json. The runner resolves `playwright` from there without adding dependencies to the app. Otherwise install inside this standalone skill package:

```sh
cd /path/to/web3-wallet-e2e
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
node --test test/*.test.mjs
```

Use Node 22+. On Linux headed tests need a trusted display/Xvfb and Playwright system libraries. No app dependency or React code changes are necessary. Pin browser installation to the locked Playwright release; record its actual browser version in results. Version pinning here is a tested baseline, not a claim of newest release.

Copy templates/wallet-config.example.json and templates/scenario.example.json into your project's test tooling directory as *.local.json, with .state/ and artifacts/ ignored. Set the scenario origin, public test account and code-evidenced selectors. Set config walletName to the registered wallet. The runner defaults to the sibling web3-wallet-session/scripts/runtime.mjs, independent of the working directory. If the session skill is installed elsewhere, set runtimeModule to its helper path (absolute or relative to the config file). Verify extension provenance during provisioning.

```sh
node --input-type=module -e 'import {extensionIdentity} from "/path/to/web3-wallet-e2e/scripts/core.mjs"; console.log(await extensionIdentity(process.argv[1]));' /trusted/extension
node /path/to/web3-wallet-e2e/scripts/discover.mjs /path/to/project origin/main > discovery.json
node /path/to/web3-wallet-e2e/scripts/test.mjs /project/tests/wallet/config.local.json /project/tests/wallet/scenario.local.json
node /path/to/web3-wallet-e2e/scripts/report.mjs /project/tests/wallet/artifacts/RUN/result.json
```

Use web3-wallet-provision to create and register a dedicated test wallet on the destination host. Exploratory runs should use reviewed Playwright tooling with the same safety contract, establish actual selectors/expected values, save a deterministic scenario only when requested or clearly useful to the task. Scheduled/PR execution is possible only with trusted code, a privately provisioned profile and zero retries. Do not expose profiles to untrusted fork jobs.

Official conventions checked 2026-11-04:
- [Agent Skills specification](https://agentskills.io/specification): SKILL.md with name/description; optional scripts/references/assets and other directories.
- [OpenAI skill documentation](https://learn.chatgpt.com/docs/build-skills) and [customization](https://learn.chatgpt.com/docs/customization/overview): reusable skills and project .agents/skills.
- [Claude Code skills](https://code.claude.com/docs/en/skills): .claude/skills and slash invocation.
- [Playwright extensions](https://playwright.dev/docs/chrome-extensions): bundled Chromium and persistent profile.

On-demand examples: `$web3-wallet-e2e Test MetaMask connection and disconnection`, `$web3-wallet-e2e Test my uncommitted changes`, or `$web3-wallet-e2e Explore this swap until native confirmation and reject`. The agent infers the approach; no PR trigger, schedule, scenario file or user-authored plan is required.

When the user supplies a dedicated test-wallet unlock password and requests local persistence, store only `WALLET_TEST_PASSWORD` in an ignored owner-only (0600) `.env.wallet-test.local` outside the portable skill. Load it for the process with `node --env-file=/path/to/.env.wallet-test.local ...`. Never print the file or environment, interpolate the password into CLI arguments, copy it into scenario/report/trace, or install it with the skill. Prefer a secret manager where available.

## Cross-chat wallet runtime

Install web3-wallet-session alongside this skill. Its canonical registry is ~/.codex/wallet-runtime/registry.json; profiles/extension code and private credential references are shared across chats and worktrees. Read its SKILL.md first for existing wallets. Never copy runtime data, password files or vault keys into a distributable skill. The runtime launcher pins the Playwright executable, uses test-only mock-keychain/basic-password-store flags, serializes profile access and refuses personal-browser or fresh-wallet fallback. OS Keychain prompts stop the task, not trigger a password request.
