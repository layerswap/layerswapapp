# Scenario contract and execution

Immediate exploration needs no JSON scenario or permanent tests. Save deterministic scenarios when repeatable testing is requested or useful to the task.

App steps use `click`, `fill` or `expect` with a target `{by: role|testId|css|text, value: string, name?: string}`. Role targets require exact names. Each step must resolve one app control on the expected origin. Wallet approval/signing are explicit scenario kinds, not arbitrary app click steps or injected JavaScript. Review selectors, fill values and expected data for the trusted app; the driver is not a sandbox for hostile scenario files.

Every scenario includes `schemaVersion: 1`, `id`, `kind`, `description`, `url`, `expectedAccount` (full public EVM address), `chainId`, `connectSteps`, `prepareSteps` and `after` (expected app UI). Empty `connectSteps` reuses an existing connection; account and chain are still checked.

| Kind | Native behavior | Additional fields |
| --- | --- | --- |
| `confirmation-rejection` | Inspect a transaction, reject, check app recovery | `trigger`; `expected.requestType/network/amount/recipient` |
| `confirmation-approval` | Inspect and approve the requested transaction, check app result | Above plus `expected.fee`; invocation authorization |
| `signature-rejection` | Inspect a signature request, reject, check app recovery | `trigger`; `expected.requestType/message`; `nativeFields.account/origin/message` |
| `signature-approval` | Inspect and sign the requested message/typed data, check app result | Same signature fields plus invocation authorization |
| `negative` | Check validation/wrong-network/insufficient-balance UI without a native request | No trigger |
| `connection` | Check connected UI without a transaction/signature request | No trigger |

Use `--authorize <scenario-id>` only when the user has requested the action for that run. The agent passes it without asking again when authorization already exists. A persisted scenario does not authorize future runs by itself. Both approval kinds fail before browser launch without this argument. Rejection, connection and negative scenarios need no authorization flag.

```sh
node <skill>/scripts/test.mjs <config> <transaction-scenario> --authorize requested-transaction
node <skill>/scripts/test.mjs <config> <signature-scenario> --authorize requested-signature
```

# Native evidence

Transaction inspection requires native account, network, origin, request type, amount, recipient and fee. Add exact expected spender, token, maximumFee, calldata, decoded or simulation text when relevant. Every supplied expected field is checked, including optional fields; missing values remain null and block approval. A fee estimate is not a maximum fee. Amount includes token/unit text; public addresses must be full, not truncated labels.

Signature inspection requires native account, origin, request type and full message/typed-data content. It does not require a transaction amount, recipient or gas fee for a plain message. Include network and other expected fields when the signature conveys those permissions. Message comparison preserves exact case and whitespace. For typed data/permits, select the full reviewed content including domain, chain, verifying contract, spender, allowance and expiry as applicable, not just a title or partial summary. If the visible layout splits these values, supply additional `nativeFields`/`expected` entries for them using the supported field names below.

`nativeFields` maps fields to read-only native selectors. Supported names: `account`, `origin`, `network`, `requestType`, `message`, `amount`, `recipient`, `spender`, `token`, `fee`, `maximumFee`, `calldata`, `decoded`, `simulation`. Each value uses the same target shape as app steps, with optional `attribute` for a native public attribute such as a full-address title. Without `attribute`, the adapter reads `innerText()` from one visible match. It does not click, expand, execute scripts, or read private background storage through these fields. Use observed selectors and configure normal detail expansion in a reviewed native script where needed. Signature `requestType` defaults to `confirm-title-text`; account/origin/message selectors are required because those layouts vary. Transaction fields can also be overridden for an observed layout.

`expectedAccount` and the scenario URL's host set the account/origin expectation independently of `expected`. Host values must match the native representation; a mismatch requires investigating the actual origin rather than relaxing the comparison. Provider account/chain checks do not fill missing native evidence. The adapter compares addresses/hosts without case; all other expected text, especially messages and typed data, is case-sensitive.

The adapter targets MetaMask 13.54.0's `#/confirm-transaction/<id>` and unified `#/confirmation[/<id>]` routes. Its footer controls are source-verified; live behavior must be validated on the installed wallet. Unrecognized routes/layouts require calibration. The templates intentionally contain placeholders: establish actual native selectors and public test values before executing.

# Multiple requests and uncertain actions

The JSON runner resolves one request per scenario. Compose the native adapter in a reviewed Playwright script for a user-requested intermediate approval/signature followed by a transaction. Inspect each request and verify it is within scope. The generic JSON driver does not automatically approve unrelated pending requests or network-switch dialogs; set the intended network first or use a calibrated native network adapter.

Before each scenario require no pending dialogs. After an uncertain approval/signature attempt, preserve the attempt count and unresolved marker, then reconcile actual state before another attempt. Do not automatically retry. A known request that fails inspection before any authorization can be rejected once; unknown origins or changed request IDs remain unresolved for review. App UI success, native completion and blockchain settlement are separate observations.

# Visual reachability and results

Locator clicks can auto-scroll past broken layout. Inspect the current viewport and use ordinary scrolling/navigation before executing controls. A clipped or unreachable control is FAIL; missing visual evidence is BLOCKED. Report functional results separately from layout checks, and do not turn an automated functional PASS into a claim that the UI is usable.

Result categories:
- PASS: all applicable native and app checks in the scenario were observed and satisfied. This can include the requested approval/signature; it does not by itself prove onchain settlement.
- FAIL: accessible native details or app behavior contradict expectations.
- BLOCKED: missing fields, unavailable prerequisites, uncertain cleanup or insufficient evidence.
- UNSUPPORTED: an unimplemented wallet/version or native layout needs adapter work.

Artifacts distinguish `connection`, `confirmationOpened`, `walletDetails`, `requestRejected`, `requestApproved` and `appHandledResult`. The last replaces the old rejection-specific `appHandledRejection`; inapplicable checks are `NOT_APPLICABLE`. `walletAction` records action/attempted/completed, and `intentionalAuthorizationActions` counts attempted approve/sign clicks, including timeouts. `result.json` contains native evidence, missing/mismatched fields and artifact paths; `report.md` summarizes them. Independent broadcast/settlement verification remains unknown unless separately observed. Do not persist reusable signatures in generic logs or report a completed transaction based only on clicking Confirm.
