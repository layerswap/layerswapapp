# Faro production-safety change proposal

## Approved implementation update — 2026-09-08

**Optimized console test passed in dev Loki at 15:36:30 UTC.** The [stored fixture](fixtures/faro-optimized-policy-loki-observed.json) contains one warning and one console-error exception from duplicate calls, with no debug/log/info marker records. Both share a session. The bounded nearby-session window retains navigation, measurements and fetch/XHR mirrors and contains no resource-performance events. Outgoing bodies, TRACE filtering and receiver-side source-map resolution remain unverified. This supersedes deployed-filter/dedupe pending language below for this test only, without establishing production volume or permanent absence of resource events.

**Optimized build available for browser verification.** The [artifact check](faro-optimized-build-check.md) confirms the compiled production-mode policy, local HTTP 200 for the application/chunk/map, and a decoded map position back to policy source. No receiver-side map resolution or browser filtering is claimed. Build completed despite a missing ESLint plugin; lint did not pass. No new uploader credential, deployment, Grafana publication or FluxCD change was introduced.

**Close-flow runtime check passed in dev Loki at 15:19:28 UTC.** The [stored evidence](fixtures/faro-flow-close-loki-observed.json) preserves the closing event's swap/journey context and two subsequent exemplars. All 43 later-client-time records in the 55-row result (limit 300) lack `session_attr_swap_id` and `session_attr_journey_id`, retaining the same session ID and wallet JSON. This is not a blanket proof for all swap-owned fields or an indefinite absence guarantee. The close event's `abandoned` outcome is not backend cancellation. Outgoing close/after payloads, stale-session restoration, deployed-build filters/dedupe and source maps still require their own runtime checks. Historical pending notes below are superseded only for this tested behavior.

Paired outgoing check at **15:14:19 UTC**: the user saved a complete console-log request body, now preserved as a [sanitized paired fixture](fixtures/faro-wallet-browser-payload.json). One original timestamp/message/session match in dev Loki retains wallet JSON, journey, app scope, page URL and all nonempty session attributes. Empty `swap_id` is omitted in the stored projection. This closes the connected-wallet outgoing-body gap, not flow-close/startup-restoration/deployed-policy verification. The request contains no spans or URL query, and the Desktop original is unchanged.

Fresh controlled Loki check at **15:02:57 UTC**: user-reported `collect` calls correspond in time to local/testnet startup, navigation, wallet restoration, measurements and HTTP mirror records. The [sanitized stored projection](fixtures/faro-safety-startup-loki-observed.json) shows no journey/swap context on startup, then a journey on later `flow_error` records. Wallet state progresses from `restoring` (including a partial count of 1) to `ready`. This is a `session_start`, **not proof of cleaning a restored session**. No outgoing body was captured, `local` does not pin a build, and flow-close/deployed filtering/dedupe runtime checks remain pending. Earlier blanket fresh-Loki-pending language below is superseded only for this limited delivery check.

The user approved technical fixes and volume controls. They are now implemented in the working tree, not deployed or pushed. This update supersedes the proposal-only status below for sections A/B, except production sampling remains unchanged (100% default and the pre-existing optional override). Amount minimization, broad provider-body allowlisting, consent, retention/access changes and Tempo remain outside this patch.

- `faro-policy.ts`: deployed/optimized builds (`NODE_ENV=production`, including deployed sandbox builds) collect console warn/error and suppress resource performance events. Local development retains every console level and resource events. SDK dedupe is enabled in both. Navigation, Web Vitals, fetch/XHR spans and their tracing mirrors remain enabled.
- `faro-sanitizer.ts`: nested Error name/message/stack now use the existing string redaction and 8,192-character limit plus truncation marker. Regression tests preserve ordinary full URLs/query/fragment, addresses, hashes, swap IDs and amounts. This is not blanket URL redaction or a new error-detail allowlist.
- `faro-session-context.ts`: `SwapContextInstrumentation` registers before the SDK instrumentations and removes restored/foreign swap-owned attributes, preserving the session ID, SDK sampling fields, wallet fields and unrelated metadata. Its writer tracks this page's current context across SDK session changes. Different-swap legacy merges replace old swap fields. It does not rewrite historical batched event snapshots in `beforeSend`.
- `faro-swap-lifecycle.ts`: the existing state machine was extracted from the React hook for direct tests. Flow close emits its contextual record before clearing session context. Unmount clears context and timers. Departure retires known-swap ownership so late callbacks/timers cannot overwrite the current journey; legacy transitions also retire prior ownership. A deferred modal-close cleanup covers pre-creation flows that emit no `flow_closed`, without clearing a newly entered flow. Explicit modal reopening permits a new journey.
- `useSwapLifecycleTelemetry.ts` resumes the controller in a client layout effect before child passive effects, with an SSR-safe effect fallback. `WidgetWrapper.tsx` delegates legacy context and modal-entry/exit notifications while preserving host callbacks. Terminal results still on screen, recoverable errors and wallet rejections do not clear context just because their outcome is terminal/failed/rejected.

Verification: **36 Faro tests**, **9 dashboard regression tests**, bridge TypeScript check (`--noEmit --incremental false`) and `git diff --check` pass. Tests exercise installed Faro APIs/instrumentation with synthetic local inputs, including actual console filtering, resource-observer suppression, duplicate errors, all six repeatable lifecycle steps, SDK metadata initialization/adoption, lifecycle close/legacy/timer ordering and unchanged sanitized historical fixtures. Browser globals used in the resource-observer unit test are test doubles, not a browser capture. No field verification state was upgraded from these tests.

Browser skill discovery returned no available browser. The local server was not running and has been restarted at `http://localhost:3000`; an HTTP GET returned **200**. Fresh outgoing/Loki validation of this patch is pending. Existing dashboard publication and older wallet fixtures do not verify the new context-clearing behavior. No new fixture was fabricated or replayed, and no Grafana/FluxCD configuration changed.

### Remaining runtime checks and boundaries

1. Hard-reload the local app (Faro initialization is idempotent; hot reload alone can retain the previous SDK configuration). In Network, filter `collect`, inspect a new POST, and check the SDK config if needed: local mode intentionally still collects debug/resource data. Deployed verbosity needs an optimized non-production build, not `next dev`.
2. Verify current URL parameters and connected-wallet snapshot on fresh outgoing telemetry, and independently inspect the corresponding dev Loki records. Replace identifiers with aliases when saving fixtures; do not publish raw HAR files, wallet addresses or credentials.
3. Open an existing non-production test swap, then close its flow without signing/sending anything. Its closing event should retain event-level journey/swap identity; subsequent unrelated signals should lack the departed swap's session fields while retaining wallet/session identity. New unrelated application errors can legitimately start their own journey, so compare the departed ID rather than asserting that every later event has no journey.
4. Verify reload restoration and two-tab/session-rotation behavior in a real browser. Wallet startup metadata before its observer mounts remains the previously documented limitation. Tests model SDK metadata adoption but do not prove local-storage/BroadcastChannel behavior or React StrictMode rendering end to end.
5. The existing callback contract lacks an immutable operation token for every asynchronous callback. Known departed swaps/timers are guarded, but an unknown swap ID or an ID-less late callback cannot always be distinguished from a genuinely new operation. Session metadata remains contextual, not proof of causality. Multiple simultaneous widgets also require an explicit ownership contract before claiming isolation. Do not silently add new lifecycle/span correlation fields to solve this outside the approved scope.
6. No source-map minified-error resolution or production-scale sampling/volume/retention validation has been completed. Retention/access and stable deployment/release attribution remain rollout gates; Tempo is deferred.

Actual implementation files are those proposed below plus the announced extraction `apps/bridge/lib/faro-swap-lifecycle.ts`. New tests are `faro-policy.test.mjs` and `faro-swap-context.test.mjs`; the existing sanitizer tests were extended. Existing wallet tests run unchanged.

## Historical proposal (approved scope recorded above)

2026-09-08. Source review and local checks only; no instrumentation, dashboard, infrastructure or deployment changes in this review. Awaiting approval of the changes below. Tempo remains deferred. No production volume, thresholds or sampling effectiveness have been established.

## Decisions already made

- The user confirms current application URL parameters are safe and useful to log. **Keep full page, request and resource URLs, including ordinary query parameters.** No blanket query/fragment stripping, host allowlist or path replacement is proposed for this patch. Existing credential redaction remains a backstop; this decision does not request exporting authentication credentials or prove arbitrary third-party provider URLs safe.
- Keep connected-wallet addresses alongside session and swap-form context, with family/connector and optional observed chain ID. Do not infer a network from MetaMask alone. Historical wallet lookup must survive disconnect and account replacement.
- Full URLs, addresses, session/journey/swap IDs and transaction hashes remain searchable fields, never Loki ingestion labels or metric dimensions. URL safety and URL cardinality are separate concerns. Future aggregate metrics should use a separate bounded route dimension without deleting the raw investigation URL.
- Only `NEXT_PUBLIC_FARO_COLLECTOR_URL` is currently supplied as a Faro-specific setting. Do not introduce a required additional environment variable or infer deployment identity from the API mode.

This supersedes the blanket URL-removal recommendation in historical Checkpoint B; its other recommendations remain proposals, not approvals.

## Current source evidence and checks

- `apps/bridge/lib/faro.ts`: missing/invalid sampling override defaults to 1; `dedupe: false`; console `disabledLevels: []`; `trackResources: true`; persistent session tracking; unsampled trace headers omitted. `app.environment` is API mode, not verified deployment identity.
- Installed Faro 2.11.0 `performance/resource.js`: `trackResources: false` suppresses resource performance events; unset means fetch/XHR resources, while true includes all supported resources. Keep navigation/Web Vitals instrumentations and automatic fetch/XHR tracing enabled independently.
- Installed core `api/{events,logs,exceptions,measurements}/initialize.js`: SDK dedupe compares the last payload for that signal API and supports `skipDedupe`; it is not a general burst limiter or lifecycle retry policy.
- `apps/bridge/hooks/useSwapLifecycleTelemetry.ts`: each transition replaces swap-owned metadata; `form_submitted` creates a new journey; terminal events stop timers. Unmount only clears timers, and `flow_closed` leaves its swap fields in session metadata. A terminal swap result is not necessarily the user leaving its result screen.
- `apps/bridge/components/WidgetWrapper.tsx`: legacy callbacks merge swap metadata, including before legacy event deduplication. Sparse updates for a different swap can retain previous journey/reason fields. Callback ordering must be tested; blindly clearing every terminal event can be undone by subsequent status callbacks.
- `apps/bridge/lib/faro-session-context.ts`: ownership-aware replacement already preserves wallet and SDK fields. Reuse it; do not rotate/reset the Faro session to clear a swap.
- `apps/bridge/components/utils/logError.ts`: reports `cause` and all remaining event details, rather than an explicit error-context allowlist.
- `apps/bridge/lib/faro-sanitizer.ts`: credential redaction and OTLP-aware traversal exist. Ordinary strings are bounded at 8,192 characters plus a truncation marker, but the `Error` branch handles name/message/stack separately. A local synthetic 8,292-character Error message and stack both remained 8,292 characters. This is a local code-path finding, not a newly captured browser payload.
- `pnpm --filter @layerswap/bridge test:faro`: **18/18 passed** on the unchanged integration. The new Error-size probe is not covered by those tests yet.
- The project-referenced `.cursor/skills/vercel-react-best-practices/SKILL.md` is absent; hook/callback source was inspected directly. No React code was changed.

## Decision table

| Concern | Current behavior | Risk | Recommended production behavior | Tradeoff | Required code/config change |
| --- | --- | --- | --- | --- | --- |
| Sampling | Default 100% for all sessions | Unbounded ingestion cost as traffic grows | Sandbox/dev 100%; production 5% remains an explicitly opt-in cost-control proposal, not an approved default. Keep 100% during current controlled verification | At 5%, unsampled sessions lose errors and wallet history too; address search is not comprehensive | Later approved profile in `faro.ts` / new `faro-policy.ts`; confirm deployment discriminator first; existing optional sample-rate override remains available |
| Console | All levels; console.error becomes an exception | Debug noise and arbitrary argument contents | Warn/error on deployed builds; retain all levels in local development | Fewer debug breadcrumbs; warnings can still be noisy | `faro.ts`, `faro-policy.ts`; test disabled DEBUG/TRACE/LOG/INFO and existing error classification |
| Duplicate suppression | SDK off; lifecycle fingerprint suppression already on | Repeated identical signals | Enable SDK dedupe; explicitly preserve meaningful repeatable lifecycle attempts through existing sequence/attempt attributes and tests | Consecutive identical errors can be undercounted; not a rate limiter | `faro.ts`, SDK-backed regression tests; no global custom dedupe cache |
| Page URLs | Full URL, existing credential redactor | Linkability and high cardinality even when safe | Retain full URL/query/fragment as approved; keep route-template view name separately | More detailed records | No URL-removal change; add preservation tests |
| Request/resource URLs | Full URL, existing credential redactor | Unique query values increase cardinality and bytes | Retain raw URL as approved; no new blanket domain exclusions | Third-party request noise remains in automatic tracing | No normalization change to stored raw URLs; preservation tests; future bounded metric route only |
| Resource timings | All supported resources | Per-resource event duplication alongside fetch mirrors/spans | Deployed builds: `trackResources: false`; local dev: true. Keep Web Vitals, navigation and fetch/XHR tracing/mirrors | Lose per-asset resource detail; HTTP mirrors/traces still contribute volume | `faro.ts`, `faro-policy.ts`; SDK/config tests plus controlled verification |
| Wallet addresses | Current connected snapshot in session metadata, verified connect/disconnect/reconnect in Loki | Linkable history, repeated metadata | Keep approved searchable addresses and snapshot ownership | Storage/access obligations remain | Preserve existing observer; regression checks for context cleanup |
| Swap IDs / transaction hashes | Structured lifecycle and session fields | Stale attribution and high cardinality | Retain relevant identifiers; clear only departed swap context; never ingestion labels/metric dimensions | Later unrelated signals no longer carry old swap IDs | Context lifecycle corrections below; no infrastructure label changes |
| Requested amounts | Exact values on lifecycle/session context | Financial context and repeated metadata | No removal in first patch; retain current form context. Any move to event-only amounts requires separate approval | Larger/linkable records; exact debugging remains available | None in first patch; optional later field-selection policy |
| Errors/provider messages | Credential redaction, broad error details, Error object limit bypass | Oversized objects and unintended response contents | Fix existing string-limit bypass without removing useful errors. Separately propose bounded explicit error-context fields instead of arbitrary raw provider bodies | Truncated long details; later allowlist would reduce diagnostics | First: sanitizer/tests. Later approval: `components/utils/logError.ts` and targeted tests |
| Persistent swap context | Session persistence; transition replacement, no explicit flow-exit clearing | Old swap attached to later unrelated errors | Clear on actual flow exit/unmount and before startup signals can reuse a prior-page swap snapshot; rebuild from current app state. Preserve SDK session and wallet ownership | Early startup errors may lack swap context until app state is known; stored history remains | `faro.ts`, `faro-session-context.ts`, hook/wrapper and regressions; cross-tab/session-adoption behavior must be tested |
| Consent/opt-out | No explicit integration found | Collection may not respect required product preferences | Product/legal owner specifies whether collection requires consent and what opt-out must do; implement that contract before applicable rollout | Reduced coverage for opted-out users | Separate initialization gate/persistence cleanup after requirements; no legal conclusion or automatic DNT policy here |
| Retention/access | Audited FluxCD declares dev 7 days; production 30-day period without verified compactor enable; runtime enforcement unknown | Excess retention or broad access to address histories | Confirm dev 7-day deletion; propose production raw 14 days for operational approval; restrict read access and service tokens, verify gateway/network isolation | Shorter investigation window; RBAC work | Separate reviewed `layerswap-fluxcd` and runtime checks; no change here |

Sampling behavior is documented by [Grafana's Faro sampling guide](https://grafana.com/docs/grafana-cloud/observe-and-act/monitor-applications/frontend-observability/configure/sampling/). The 5% choice is a proposed budget tradeoff, not a rate derived from test data. If comprehensive wallet-based error investigation is required, choose an operationally budgeted 100% pilot instead of approving 5%. Do not promise a separate always-on error path: it is not implemented.

`NODE_ENV=production` can distinguish deployed/optimized builds for console/resource settings, **not production versus sandbox deployments**. Until a reliable deployment discriminator is approved, do not automatically apply different production/sandbox sampling rates from `mainnet`/`testnet` or collector host guesses. Source-map/release attribution remains a separate rollout gate.

## Proposed implementation boundaries (approval required)

### A. Technical correctness first

1. Apply the existing string redaction/truncation rules consistently to nested Error name/message/stack. Preserve OTLP structure and all approved normal URLs/addresses/amounts.
2. Make swap-context ownership explicit on initial page setup, different-swap legacy callbacks and actual flow exit. Emit the `flow_closed` record with its context before clearing it. Do not clear solely because of rejection, a recoverable `flow_error`, wallet disconnect, or a terminal result still being viewed.
3. Cancel prior journey timers on departure; prevent a late callback/timer for a departed journey from replacing the current session snapshot. Such events can retain their own event-level swap data. Never clear current wallet fields or SDK sampling/session identity.
4. Test restored attributes before first outgoing telemetry, flow-close/unmount ordering, same/different-swap legacy callbacks, late timers, preserved terminal record context and wallet history. Do not use an arbitrary timeout as a substitute for ownership. Full cross-tab browser verification remains required.

Exact intended implementation files:

- `apps/bridge/lib/faro.ts`
- `apps/bridge/lib/faro-sanitizer.ts`
- `apps/bridge/lib/faro-session-context.ts`
- `apps/bridge/hooks/useSwapLifecycleTelemetry.ts`
- `apps/bridge/components/WidgetWrapper.tsx`
- `apps/bridge/lib/__tests__/faro-sanitizer.test.mjs`
- `apps/bridge/lib/__tests__/faro-wallet-context.test.mjs`
- New `apps/bridge/lib/__tests__/faro-swap-context.test.mjs`

### B. Volume policy, only after explicit approval

Console warn/error and no per-resource events in deployed builds; local development retains current verbosity. Enable SDK duplicate suppression and validate repeatable lifecycle events. Keep current sampling unchanged pending its separate coverage decision. Intended additional files: new `apps/bridge/lib/faro-policy.ts` and `apps/bridge/lib/__tests__/faro-policy.test.mjs`, wired by `faro.ts`. No additional required Faro environment variable.

Broader error allowlisting, amount minimization, consent behavior, retention/access changes and a production sampling rollout are not included in A or B approval. Optional later improvements: bounded route metrics, targeted resource capture, custom operation spans once Tempo work resumes, clearer dashboard error-panel scope labels.

### Documentation and verification

This turn adds only this proposal and a superseding decision note in `faro-predeployment-audit.md` and `faro-telemetry-contract.md`. After implementation, update these same three documents with test evidence, without upgrading field verification states from unit tests alone.

Run existing/new Faro tests, dashboard regression tests and bridge TypeScript checks. Then use the non-production collector for a small real browser test: initial load, safe URL query preservation, repeated errors and legitimate lifecycle retries, flow exit, wallet disconnect/reconnect, HTTP fetch and Web Vitals. Inspect outgoing payloads and Loki independently. No new transactions required. No Grafana publication, GitHub push, FluxCD mutation or production deployment is part of this proposal.
