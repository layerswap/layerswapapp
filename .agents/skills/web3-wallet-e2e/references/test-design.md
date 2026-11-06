Immediate exploratory testing requires no JSON scenario or permanent test files. Use this contract only for reusable regression execution when requested or clearly part of the task.

# Visual reachability is a separate check

The click/fill/expect scenario contract does not by itself prove that controls are reachable by a person. Apply the visual/reachability check in SKILL.md before executing saved actions, including the wallet trigger. A driver using locator clicks may auto-scroll past a broken layout; a successful result is functional evidence only unless visual inspection and ordinary user scrolling/navigation also verified reachability at the tested viewport. Do not run a trigger through a known clipping or scrolling defect. Record that defect as FAIL, or missing visual evidence as BLOCKED, in the overall report even if the runner reports functional PASS. Preserve the runner result and explain its narrower scope.

# Scenario contract and deterministic execution

Copy templates into the target project's test package, not production code. JSON steps have action click/fill/expect and a target `{by: role|testId|css|text, value: string, name?: string}`. Role targets use exact names. Each app action requires exactly one matching control and the expected app origin. No JavaScript/evaluate/wallet actions are accepted in saved scenarios. This is a bounded driver, not a sandbox for hostile test data: review selectors and fill values for trusted app code and no secrets.

A scenario includes schemaVersion 1, stable id, kind, description, actual url, expectedAccount (public EVM address), chainId, connectSteps, prepareSteps and after (expected app UI). A confirmation-rejection scenario additionally requires trigger and expected native requestType/network/amount/recipient. Expected origin/account are checked independently. Expected details are exact native displayed text except case, not guessed amounts. Fee must be accessible; simulation/warnings/calldata may be unavailable and are recorded explicitly. A fee estimate is not a maximum. Do not compare truncated addresses as full identities.

Kinds:
- confirmation-rejection: app connection steps → native Connect → read-only account/chain → preparation → real app trigger → native request inspection → rejection → expected app recovery. Empty connectSteps means an already connected test profile; accounts must still match.
- negative: connection → app preparation → expected validation/wrong-network/insufficient-balance UI, with no native request. Positive confirmation checks are NOT_APPLICABLE, never PASS. Omit transaction trigger.
- connection: connection → expected connected UI, without a transaction request. Rejection checks are NOT_APPLICABLE.

The generic driver deliberately does not accept arbitrary wallet controls or approve network changes. For saved runs set the network privately before the campaign, or explore and implement a separately audited connection/network adapter. Interactive exploration may verify and approve an ordinary native network switch; financial/signature authorization remains forbidden. Detect intermediate approvals or signatures and stop at their first native request. The bundled native transaction route cannot inspect signatures: report UNSUPPORTED rather than guessing a reject selector.

Inspect displayed account, network, origin, transaction type, token/amount, recipient/spender, fee, decoded calldata, warnings and simulation. For fields not exposed, preserve null and an explicit missing list. Provider chain/account are independent public observations and cannot fill native missing evidence. Add project assertions for balances, allowed network, expired quote, allowance and disconnect behavior based on actual code/runtime.

No retries. Before each scenario require no pending dialogs. If a request fails inspection, attempt the audited rejection once. Never repeat a timed-out rejection. Keep pending-request cleanup status separate from browser closure. After rejection assert the app error/retry UI but do not click retry automatically.

Result categories:
- PASS: all checks applicable to the scenario observed and satisfied; this means only the specified no-submit behavior.
- FAIL: an accessible wallet detail contradicts expected data or observed app behavior contradicts an assertion.
- BLOCKED: missing wallet fields, locked wallet, unavailable app/backend/network, unverified cleanup, or insufficient evidence.
- UNSUPPORTED: unimplemented wallet, uncalibrated version, unsupported native request layout/type.

Artifacts distinguish connection, confirmationOpened, walletDetails, requestRejected and appHandledRejection; negative/connection scenarios mark inapplicable stages. result.json includes metadata, expected/actual result, native evidence, missing/mismatched fields, console error categories, screenshot and trace names. report.md is a human-readable summary; result.json is authoritative. Preserve partial evidence on failures. If you add nonce/read-only monitoring, record exact scope and limits rather than changing unknown broadcast verification to an unjustified guarantee.
