# Stop conditions and recovery

| Symptom | Outcome and next step |
| --- | --- |
| WALLET_LOCKED | BLOCKED. Operator unlocks the dedicated wallet privately or supplies a test-only unlock secret via secret manager. No recovery phrase request. |
| MANUAL_PROVISIONING_REQUIRED | BLOCKED. Fresh readiness profile proves loading only; provision a separate test profile privately with recording disabled. |
| EXTENSION_PIN_MISMATCH | BLOCKED. Independently establish trusted source and reviewed version/code digest. Never auto-pin an unexpected update. |
| UNSUPPORTED_WALLET_VERSION / REQUEST_UI | UNSUPPORTED. Inspect exact official version/UI and add a reject-only adapter; no generic Next/Confirm workaround. |
| STALE/MULTIPLE requests | BLOCKED. Stop; identify originating test and clear safely with an operator. Do not blindly reject unrelated requests. |
| Ambiguous rejection control | BLOCKED; fail closed. Never infer from position/color. |
| App or RPC/backend unavailable | BLOCKED. Preserve stage and sanitized evidence; do not report rejected or completed. |
| Wrong network | BLOCKED for positive case; configure a negative case asserting actual app network guidance. No guessed network approval. |
| Missing amount/account/fee | BLOCKED inspection. Record accessible fields and reject once through the known cancel control. |
| Rejection timeout | BLOCKED, unresolved cleanup, no retry. Browser close is not evidence of rejection. |
| Profile in use | Stop. Do not delete Chromium/profile locks or attach to a personal session. |

Playwright retries locator resolution internally; the runner never retries a financial action or a full scenario. A changed selector, extension or app build requires fresh exploratory validation. Save a new scenario only after observing the real flow. Browser extension loading/headless behavior depends on Chromium build and display; prefer headed local calibration and report CI as unverified until exercised.

If the dapp reports a pending permission/transaction but no notification window is open, inspect the pinned extension's normal native notification UI (for calibrated MetaMask, notification.html). Opening that page surfaces the existing request; do not invoke provider methods, inspect extension background state, or issue another dapp request to force a popup. Verify origin/type before any action. A locked extension can expose a pending permission only after private unlock; turn all recording off first. The explorer may adapt to this state, while the saved runner should report a clear blocker if it lacks a calibrated recovery path.

A connection dialog's accessible name may include its back button text. Discover the current role/name or use the unique Close modal control after confirming it belongs to the connection dialog. Recent-wallet selection may skip the ecosystem picker: observe the next state rather than requiring EVM choice on every connection.

Keep native inspection bounded so app-side wallet timeouts do not expire while exploring. Capture visible fee/amount/origin first, record inaccessible details and reject promptly. If a request already timed out, reject that exact pending request, verify cleanup, and report the timeout. Only begin a new explicitly scoped attempt after the prior rejection and clean state are verified; never blindly click Try again while uncertain.
