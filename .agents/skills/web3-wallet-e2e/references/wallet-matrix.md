# Support and prioritization

Support has three separate dimensions: app integration, installed real extension, and validated adapter/version. Track all three. Unknown installation/version/capabilities means not verified. A wallet supported by Synpress is not automatically supported by this skill's runner.

| Wallet | Bundled adapter | Verified installation in initial environment | Other capabilities |
| --- | --- | --- | --- |
| MetaMask | Native connect, confirmation inspection, reject for 13.54.0 | Official installed unpacked extension; version/hash checked at runtime | Onboarding is private; signature, network approval and new layouts UNSUPPORTED |
| Rabby | UNSUPPORTED | Not verified | Needs official installation and audited native adapter |
| Coinbase Wallet | UNSUPPORTED | Not verified | Confirm current browser-extension product availability first |
| Phantom | UNSUPPORTED | Not verified | Synpress documents real Phantom integration; this runner has none |
| Argent X | UNSUPPORTED | Not verified | Starknet requires native chain-specific inspection |
| Braavos | UNSUPPORTED | Not verified | Starknet requires native chain-specific inspection |
| TronLink | UNSUPPORTED | Not verified | Tron request types and address encoding require separate adapter |
| Other discovered wallets | UNSUPPORTED | Not verified | No fallback signer |

Before adding any wallet, check its official site/store/release channel for current version, trusted installation source, browser compatibility and distribution digest where available. Record source URLs, checked date, actual installed version, code digest and each observed capability. Pin a reproducible version; never silently update a calibrated adapter. An installed extension may require manual calibration rather than a download.

Playwright requires bundled Chromium persistent contexts for extension side-loading. Synpress's official documentation currently lists MetaMask and Phantom real integrations; its Ethereum Wallet Mock is excluded. Evaluate version selectors, caches and retry semantics before borrowing connection/inspection/rejection helpers. Do not use confirmation helpers. Direct Playwright is appropriate when the installed UI differs from a maintained wrapper.

Project matrix columns: wallet/version, chain ID/family, workflow, request type (including intermediate approvals/signatures), scenario ID, evidence source, adapter support, priority/rationale, observed outcome. Prioritize critical flows, PR-changed integrations, prior regressions, representative chain families, then wallet-specific behaviors. Avoid Cartesian products. Stop at the first authorization request: a flow requiring a signed approval before the principal transaction cannot reach the latter under this skill.

Sources checked 2026-11-04:
- https://playwright.dev/docs/chrome-extensions
- https://docs.synpress.io/docs/introduction
- https://docs.synpress.io/api-reference/playwright/classes/MetaMask
- Installed MetaMask 13.54.0 manifest and existing framework's native selectors; runtime calibration is required before claiming end-to-end success.
