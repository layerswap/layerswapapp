# Stop conditions and recovery

| Symptom | Outcome and next step |
| --- | --- |
| WALLET_LOCKED | BLOCKED. Operator unlocks the dedicated wallet privately or supplies a test-only unlock secret via secret manager. No recovery phrase request. |
| MANUAL_PROVISIONING_REQUIRED | BLOCKED. Fresh readiness profile proves loading only; provision a separate test profile privately with recording disabled. |
| EXTENSION_PIN_MISMATCH | BLOCKED. Independently establish trusted source and reviewed version/code digest. Never auto-pin an unexpected update. |
| UNSUPPORTED_WALLET_VERSION / REQUEST_UI | UNSUPPORTED. Inspect exact official version/UI and calibrate the appropriate inspect/reject/approve/sign adapter. Discover actual native controls rather than guessing Next/Confirm. |
| STALE/MULTIPLE requests | BLOCKED. Stop; identify originating test and clear safely with an operator. Do not blindly reject unrelated requests. |
| Ambiguous wallet action control | BLOCKED; fail closed. Never infer from position/color. |
| App or RPC/backend unavailable | BLOCKED. Preserve stage and sanitized evidence; do not report rejected or completed. |
| Wrong network | BLOCKED for positive case; configure a negative case asserting actual app network guidance. No guessed network approval. |
| Missing required transaction/signature details | BLOCKED inspection. Record accessible fields; do not approve mismatched or uninspectable requests. Reject the identified request once if it belongs to this app, otherwise preserve it for review. |
| Approval/signature/rejection timeout | BLOCKED, unresolved cleanup, no retry. Record the attempted action; it may have succeeded. Browser close does not prove the outcome. |
| USER_AUTHORIZATION_REQUIRED | An approval/signature scenario needs the user's requested scope. If that scope already exists, pass `--authorize <scenario-id>` without asking again. |
| Profile in use | Stop. Do not delete Chromium/profile locks or attach to a personal session. |

Playwright retries locator resolution internally; the runner never retries a financial action or a full scenario. A changed selector, extension or app build requires fresh exploratory validation. Save a new scenario only after observing the real flow. Browser extension loading/headless behavior depends on Chromium build and display; prefer headed local calibration and report CI as unverified until exercised.

If the dapp reports a pending permission/transaction but no notification window is open, inspect the pinned extension's normal native notification UI (for calibrated MetaMask, notification.html). Opening that page surfaces the existing request; do not invoke provider methods, inspect extension background state, or issue another dapp request to force a popup. Verify origin/type before any action. A locked extension can expose a pending permission only after private unlock; turn all recording off first. The explorer may adapt to this state, while the saved runner should report a clear blocker if it lacks a calibrated recovery path.

A connection dialog's accessible name may include its back button text. Discover the current role/name or use the unique Close modal control after confirming it belongs to the connection dialog. Recent-wallet selection may skip the ecosystem picker: observe the next state rather than requiring EVM choice on every connection.

Keep native inspection bounded so app-side wallet timeouts do not expire while exploring. Capture the relevant transaction details or complete signature content and resolve the request according to the user's scope. If the app timed out before any wallet action, reject only that identified pending request and verify cleanup. If approval/signing was attempted, first reconcile whether it completed; do not reject a possible follow-up request or repeat the action. Begin another scoped attempt only after the prior outcome and clean state are verified.
