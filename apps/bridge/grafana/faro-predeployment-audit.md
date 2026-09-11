# Grafana Faro pre-deployment audit

## Optimized policy observed in Loki — 2026-09-08

At 15:36:30 UTC, the user-operated [console test](fixtures/faro-optimized-policy-loki-observed.json) returned one warning and one error for two identical invocations each, and no debug/log/info marker records. Both retained the same session. Navigation, measurements and fetch/XHR mirrors occur in the bounded nearby-session window; no resource-performance events were returned. This supersedes optimized-filter/dedupe pending notes only for this controlled stored outcome. Outgoing capture, TRACE filtering, indefinite resource suppression and receiver-side source maps remain unverified. No production or infrastructure changes were made.

## Optimized-build artifact check — 2026-09-08

The [local optimized build check](faro-optimized-build-check.md) passed compilation and HTTP artifact checks at 15:32:59 UTC. Generated source maps resolve a minified position back to the policy source locally. The compiled production-mode policy selects the approved volume controls; browser filtering and receiver-side source-map resolution remain pending. The build reported an ESLint dependency failure, so lint is not validated. No deployment or field verification upgrade is implied.

## Flow-close runtime verification — 2026-09-08

The user created a testnet swap and closed its modal. At 15:19:28 UTC, dev Loki verified the contextual `flow_closed` event, followed by 43 records with later client timestamps and no session swap/journey IDs. Session ID and wallet JSON remain identical across those records. The [sanitized evidence](fixtures/faro-flow-close-loki-observed.json) supersedes flow-close-pending notes below for this scenario only. No outgoing close body, persisted-session restoration, optimized-build filtering or Tempo was verified.

## Paired wallet browser payload — 2026-09-08

The [sanitized complete request](fixtures/faro-wallet-browser-payload.json) supplies previously missing outgoing wallet/session metadata: one console log, ready-state connected wallet JSON and journey context. At 15:14:19 UTC, dev Loki returned one exact client-timestamp/message/session match. Wallet JSON, app scope, page URL and all nonempty session attributes were preserved; empty outgoing `swap_id` was omitted in the parsed stored record. No span/header, flow-exit, persisted-session restoration or deployed volume-policy behavior was verified by this body. Its Desktop original was not modified.

## Approved safety implementation — 2026-09-08

The user approved the [safety patch](faro-production-safety-plan.md): deployed-build warn/error console capture, suppression of resource performance events, SDK dedupe, consistent nested-Error string limits and page/flow-owned swap-context cleanup. Default 100% sampling, ordinary full URLs, wallet/form data, Web Vitals, navigation and HTTP tracing remain. Local development keeps verbose console/resource capture. 36 Faro tests, 9 dashboard tests and the bridge type check pass. The local server was restarted; fresh browser/Loki checks are pending and no field verification state is upgraded. The browser controller has no connected browser. No production, Grafana or FluxCD changes were made. This supersedes the proposal-only status immediately below for the approved patch only.

## Production-safety review and URL decision — 2026-09-08

The user confirms current application URL parameters are safe to log. The [updated safety proposal](faro-production-safety-plan.md) retains full URLs with existing credential redaction, superseding earlier blanket query-removal recommendations. It documents current sampling/console/resource behavior, an independently reproduced nested-Error size-limit gap and flow-exit context ownership work. Existing 18 Faro tests pass. No integration or deployment changes were made; technical corrections and volume settings await approval. No stored-field verification state changed.

## Wallet storage verification — 2026-09-08

Follow-up at 14:11:00 UTC: reconnecting with a different account is verified in dev Loki. The new address replaces the old in current wallet context; exact historical lookups using either address still find the same Faro session. The journey ID differs, so journey preservation is not claimed for this step. The [reconnect fixture](fixtures/faro-wallet-reconnect-loki-observed.json) preserves sanitized evidence. In-place account switching without disconnect, multiple wallets and paired outgoing payload capture remain unverified.

Follow-up at 14:05:30 UTC: disconnect is now verified in subsequent dev Loki records, superseding the disconnect-pending status below. The newest sampled wallet snapshot is `[]`, count `0`, state `ready`, with exact session/journey IDs and application/environment/version retained. See the [disconnect evidence](fixtures/faro-wallet-disconnect-loki-observed.json). Account/chain changes, multiple-wallet tests and paired outgoing wallet payload capture remain pending. All 18 Faro regression tests pass.

The new wallet fields are now verified in dev Loki, superseding their earlier source-only status below. A connected `evm` / `metaMaskSDK` wallet with optional chain ID `43114` appears in JSON session context alongside errors and lifecycle records. Exact first-element address extraction/filtering works; wallet fields are parsed log content, not stream labels. See the [wallet report](faro-wallet-session-context.md) and [sanitized stored projections](fixtures/faro-wallet-loki-observed.json). Outgoing wallet payload capture, disconnect/account changes and multiple-wallet browser tests remain pending. Tempo is still deferred.

## Approved connected-wallet context — 2026-09-08

The [wallet/session synchronizer](faro-wallet-session-context.md) is implemented after user approval. It observes existing registry connections, keeps bounded JSON wallet context separate from swap-owned fields, handles account/chain/disconnect changes and preserves SDK session identity/attributes. Seventeen Faro regression tests, seven dashboard tests and the bridge TypeScript check pass; the local app serves HTTP 200. New wallet fields remain source-only, pending real browser and Loki verification. Historical statements below that call this feature unimplemented are superseded by this update. No FluxCD, production policy or Tempo change was made.

## Approved sanitizer correction — 2026-09-08

The frontend [schema-aware sanitizer fix](faro-sanitizer-fix.md) is implemented after user approval. Nine regression tests and the bridge TypeScript check pass. Fresh user-provided browser excerpts show six valid typed span attributes including `session.id` and an intact `browser.brands` resource array containing three typed strings; the span's matching dev Loki tracing mirror retains the exact session/trace/span IDs. See the [sanitized excerpts](fixtures/faro-sanitizer-browser-span-excerpt.json). This is not a full body capture or Tempo verification; other resource attributes and live sensitive-key sanitization remain unverified after the fix. This supersedes earlier **not implemented** status for this correction only; historical payload observations remain valid. Wallet synchronization and production policy choices are unchanged.

## Infrastructure discovery update — 2026-09-08

The user supplied `layerswap/layerswap-fluxcd`; its monitoring configuration was inspected read-only at commit `53b7e74183c84b7395ba1b28fd1a4efd1724dbf8`. The [infrastructure audit](faro-infrastructure-audit.md) supersedes configuration-unavailable statements below. It identifies direct Faro → Loki/Tempo routing, explicit Alloy `source="faro"` labeling, dev/prod CORS, declared retention and datasource provisioning. Active rendered/reconciled configuration is still unverified; no Tempo storage state was upgraded. Fresh dev preflight checks allow `http://localhost:3000` but not `http://127.0.0.1:3000`.

The limited dashboard was subsequently created with approval. [Checkpoint C](faro-checkpoint-c.md) records the browser-reported scalar-variable quoting defect and its saved version-2 correction. Production policy and instrumentation fixes remain proposals; no infrastructure configuration was changed.

## Current evidence update — 2026-09-08

Working revision during verification: `790cb6260`. [Checkpoint B](faro-checkpoint-b.md) and the [updated telemetry contract](faro-telemetry-contract.md) supersede the historical verification status below. The numbered source audit and original test results are retained as the 2026-09-04 snapshot; they are not a claim that all earlier access blockers still exist.

- A manually operated Chrome browser produced genuine Faro envelopes on a temporary loopback collector. The [sanitized browser fixture](fixtures/faro-controlled-browser-payload.json) contains initialization, initial view assignment, navigation timing, TTFB, success/503/slow fetch mirrors and spans, and explicit/uncaught controlled errors.
- The developer Grafana account can query Loki. Six filtered browser envelopes were replayed to the actual dev Faro receiver, all acknowledged with HTTP 202. Nine corresponding records were found and parsed with LogQL `logfmt`. The [stored-record fixture](fixtures/faro-loki-observed-records.json) preserves a sanitized projection of observed fields.
- The user separately created a Sepolia swap and rejected the `send_transaction` prompt from `localhost:3000`. Loki contains ten journey steps. Only five carry the swap ID; session/journey correlation recovers the five earlier steps. No outgoing browser body was captured for this test. Connection cancellation and gasless signature rejection remain unverified.
- Raw controlled Loki responses contain only `source`, `service_name` and `detected_level` as stream labels. All other listed fields are parsed from logfmt, not ingestion labels. No structured metadata tuple was returned. Replayed error labels include `service_name=unknown_service` and `detected_level=unknown`; query `app_name` and `kind=exception` instead.
- Session IDs and the three controlled HTTP trace/span IDs were preserved exactly in Loki. Controlled exceptions carried no trace IDs. Session proximity does not identify the causal request.
- Tempo health failed with connection refused to the provisioned `http://tempo:3200`; the user explicitly deferred Tempo. No field is verified in Tempo, and no trace UI link has been validated.
- Alloy receiver/processor/write configuration remains unavailable. Stored transformations are observed, but their precise component ownership, tenant routing, retention and sampling remain unknown.
- The actual captured application environment was `mainnet` for the local HTTP/error test and `testnet` for the Sepolia swap; both versions were `local`. The local `.env` file alone was not a complete description of effective configuration. The user supplies only the collector as a Faro-specific setting. Do not equate API mode with deployment identity.

### New technical findings (proposals only)

1. `beforeSend` depth truncation corrupts OTLP attribute structure: all 19 span attributes in the selected three-span fixture are `[Maximum depth reached]` strings, and a nested resource array is also truncated. The attributes remain readable on the shallower tracing mirror events. Correct with schema-aware sanitization and re-capture; do not mark expected span attributes or `session.id` as observed on OTLP spans.
2. Performance navigation and resource timings were observed as **events**, not measurements. TTFB was a measurement. Other Web Vitals are not verified by the TTFB exemplar.
3. The sole initial `view_changed` event is `unknown` → `/`. It confirms initialization of the view name, not successful navigation between two application routes. A separate view identifier was not observed.
4. Initial capture volume was 131 requests / 583,270 bytes over about 39 seconds, including 307 resource events and 256 tracing mirror events. The collector URL was excluded. The external request initiators and production volume remain unproven; do not infer a production baseline or that every external fetch was a POST.
5. Replay records have newer Loki tuple timestamps while preserving old browser signal timestamps. The dashboard must retrieve by the stored time range and distinguish client event time from ingestion time.
6. The user approved retaining connected-wallet addresses alongside session/form context as searchable fields, never stream labels or metric dimensions. Proposed fields are wallet_address, wallet_family, wallet_connector and optional wallet_chain_id, without required wallet_network. This synchronization is still unimplemented; session attribute replacement must be addressed first.

### Current phase gate

Read-only verification queries passed for error grouping (two groups / two errors), exact error-session filtering, trace-ID equality, the ten-step swap journey and absent-session/wrong-environment empty results. Dashboard UI variables, data links and visual empty states have not been tested. See Checkpoint B for exact query templates and execution window.

The next checkpoint decision is approval of the limited Loki-only vertical slice. Production policy and instrumentation corrections remain proposals. No dashboard or integration code was changed in this evidence update. Source-map resolution, remaining browser scenarios, receiver configuration and production validation remain open.

## Historical source audit — 2026-09-04

Audit date: 2026-09-04
Branch and revision inspected: `dev` at `f8c50dfda`
Scope: the uncommitted working-tree implementation, including the bridge, widget telemetry, source-map build configuration, and checked-in Grafana assets.

## Status and evidence boundary

This is a pre-deployment source and controlled-environment audit. It is not a production telemetry assessment.

- No historical or production Faro data was used.
- No repository-owned Alloy/Faro receiver, Loki destination, or Tempo destination configuration was found.
- Loki field names used by the checked-in dashboard are assumptions until stored records are inspected.
- No dashboard query has been validated against Loki or Tempo.
- A development build started and served the application, bridge type checks passed, and widget unit tests passed.
- The available test environment had no controllable browser. No browser-generated Faro request was captured, so no row in the provisional contract is marked `Verified only in outgoing Faro payload`.
- Loki and Tempo were not reachable or configured from the inspected repository. No field is marked `Verified in Loki` or `Verified in Tempo`.
- No sanitized payload fixture was created because fabricating a payload from source would not be a captured fixture.

The intended next gate is a controlled browser run with a loopback collector or a non-production Faro receiver, followed by inspection of receiver output. Production distributions, thresholds, sampling behavior at scale, and final storage mappings remain post-deployment work.

## Implementation evidence

Primary evidence:

- `apps/bridge/instrumentation-client.ts`
- `apps/bridge/lib/faro.ts`
- `apps/bridge/pages/_app.js`
- `apps/bridge/next.config.js`
- `apps/bridge/components/WidgetWrapper.tsx`
- `packages/widget/core/src/utils/logError.ts`
- `packages/widget/core/src/utils/useSwapLifecycleTelemetry.ts`
- `packages/widget/types/src/logEvents.ts`
- widget lifecycle call sites under `packages/widget/core/src`
- installed `@grafana/faro-*` version `2.11.0`
- `apps/bridge/grafana/swap-lifecycle-dashboard.json`

## 1. SDK initialization and configuration

`apps/bridge/instrumentation-client.ts` calls `initFaro()` at module load, before normal client application startup. `initFaro()` is browser-only and idempotent: it returns the existing global Faro instance if one is already initialized.

Initialization requires `NEXT_PUBLIC_FARO_COLLECTOR_URL`. When it is absent, initialization is skipped; in development, a warning is written to the console.

Configured SDK identity:

| SDK setting | Source | Value |
| --- | --- | --- |
| collector URL | Layerswap | `NEXT_PUBLIC_FARO_COLLECTOR_URL` |
| application name | Layerswap | `layerswap-frontend` |
| application version | Layerswap | `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`, otherwise `local` |
| environment | Layerswap | `NEXT_PUBLIC_API_VERSION`, otherwise `sandbox` |
| signal sampling | Layerswap configuration | `NEXT_PUBLIC_FARO_SAMPLE_RATE`, parsed and clamped to 0..1; invalid/missing values become 1 |
| duplicate suppression | Layerswap configuration | disabled with `dedupe: false` |

The local environment has a Faro collector variable and API-version variable by name, but this audit did not disclose their values. The development verification run overrode the collector with a loopback URL.

## 2. Enabled automatic instrumentations

`getWebInstrumentations()` is configured with console, CSP, and performance instrumentation enabled. With Faro Web SDK 2.11.0, the resulting automatic instrumentation set is:

| Instrumentation | Enabled | Notes |
| --- | --- | --- |
| performance | yes | Navigation timing and, because `trackResources: true`, resource timing |
| user action | yes | Requires Faro-annotated interactive elements; no `data-faro-user-action*` attributes were found in the repository, so it is expected to be mostly inert |
| JavaScript errors | yes | Global errors and unhandled promise rejections |
| Web Vitals | yes | CLS, FCP, INP, LCP, and TTFB measurements |
| session | yes | Persistent sampled sessions |
| view | yes | Initial/current view and view-change events |
| navigation | yes, experimental | Same-document, interaction-associated navigation measurement/event behavior from the SDK |
| CSP | yes | CSP violation capture |
| console | yes | All levels are enabled |
| React integration | installed | Supplies React dependency metadata; no Faro profiler, Faro error boundary, or React Router instrumentation usage was found |
| tracing | yes | Automatic browser fetch and XHR spans |

Fields created by these SDK modules are Faro-owned automatic fields unless the following sections identify a Layerswap override.

## 3. Application, environment, release, and resource attributes

Layerswap supplies Faro `app.name`, `app.version`, and `app.environment`. It does not supply a distinct release field or custom OpenTelemetry resource attributes.

The tracing integration derives resources from the Faro application metadata, including:

- `service.name` from the application name;
- `service.version` from the application version;
- `deployment.environment.name` and the compatibility attribute `deployment.environment` from the Faro environment;
- browser, runtime, and telemetry-distribution attributes supplied automatically by the SDK.

These are present in the installed SDK's payload construction but are not verified in Tempo. `NEXT_PUBLIC_API_VERSION` is serving as the deployment environment; its operational semantics should be confirmed because API version and deployment environment are not necessarily the same concept.

There is no separately modeled release attribute. The source-map bundle ID may use the same commit SHA, but source configuration and emitted application metadata are not explicitly guaranteed to match.

## 4. Session, page, view, and navigation tracking

Session tracking is enabled and persistent. Faro automatically creates a session identifier, persists session state in browser storage, samples at session level, and emits session lifecycle events such as start, resume, and extend. In SDK 2.11.0, the normal limits are four hours maximum session duration and fifteen minutes of inactivity; custom session-attribute persistence also uses a fifteen-minute default window. The internal `isSampled` marker is not expected in the exported session meta.

Faro automatically emits page metadata containing the browser URL and pathname-derived page identity. Layerswap additionally calls `setFaroView(router.pathname)` in `_app.js`, making view names low-cardinality Next.js route templates instead of `asPath` values. Faro emits automatic `view_changed` events with `fromView` and `toView`.

Experimental navigation instrumentation is enabled. It can emit `faro.navigation` for qualifying same-document navigations associated with user interaction and a DOM change. It is not a substitute for the manual route-template view update.

Layerswap lifecycle telemetry creates a random `journey_id` and attaches current journey/swap context to Faro session attributes. `setSwapContext()` preserves the session ID and replaces the other custom attributes with the supplied values. This means the session metadata represents current context, not an immutable history.

## 5. Error and console instrumentation

Automatic behavior:

- window JavaScript errors and unhandled promise rejections are captured;
- console instrumentation captures all levels;
- `consoleErrorAsLog: false` means console errors are emitted as exceptions rather than ordinary logs;
- error serialization is enabled;
- CSP violations are captured;
- exceptions containing `ResizeObserver loop` are dropped in `beforeSend`.

Layerswap behavior:

- `logError()` explicitly calls Faro `pushError()` with source `layerswap-widget`, an event type, a cause, and normalized error details;
- widget error handling classifies recognized user wallet rejection separately and emits a lifecycle event without also reporting it as an exception;
- other handled widget failures can be explicitly reported through `logError()`.

`beforeSend` sanitizes nested payload and metadata objects, detects circular data, limits traversal depth to eight, truncates string values to 8,192 characters, and redacts a configured set of credential-like keys and textual bearer/query/key-value secrets.

Because all console levels are enabled and Faro duplicate suppression is disabled, volume and accidental data capture need controlled testing and privacy review.

## 6. Web Vitals and performance measurements

The SDK automatically collects CLS, FCP, INP, LCP, and TTFB as Faro measurements of type `web-vitals`. Expected measurement data includes the lowercase metric value, delta, and numeric attribution values. Context includes metric ID, rating, navigation type, navigation-entry ID, and metric-specific attribution such as a target or load state where applicable.

`reportAllChanges` is not enabled, so the expected behavior is the SDK default rather than continuous reporting of every intermediate change. Attribution source URLs are not explicitly enabled.

Performance navigation timing is enabled. `trackResources: true` enables timing for all supported resources, not only fetch and XHR. Expected attributes include the resource URL, host, duration, timing components, response status, sizes, protocol, initiator type, visibility, TTFB, and entry identifiers.

This can be high-volume and can expose high-cardinality URLs. No Web Vital or resource record has yet been captured, and no distribution or percentile is justified by this audit.

## 7. Fetch and XHR instrumentation

Fetch and XHR are traced automatically by the tracing integration. Performance resource instrumentation can independently create resource measurements for those requests.

Expected span attributes from the installed OpenTelemetry instrumentation include:

- `http.request.method`;
- `url.full`;
- `http.response.status_code`;
- `server.address` and `server.port`;
- `error.type` on applicable failures;
- request/response body-size attributes where the browser exposes them.

The Faro wrapper marks status 0 and HTTP 4xx/5xx spans as errors. This behavior is found in installed source and is not verified in an exported payload or Tempo.

## 8. Frontend spans and trace-context propagation

No Layerswap-authored custom span creation was found. Frontend spans are automatic fetch/XHR client spans.

Same-origin propagation follows the underlying OpenTelemetry browser behavior. Additional propagation targets come from the comma-separated `NEXT_PUBLIC_FARO_TRACE_PROPAGATION_URLS` list, converted to escaped URL-prefix regular expressions. Cross-origin targets therefore require explicit configuration and compatible server CORS policy.

`omitTraceContextForUnsampledSessions: true` prevents trace headers from being added for unsampled Faro sessions. This aligns header propagation with session sampling but must be measured after deployment.

The span processor adds `session.id` to spans. It can add user fields if Faro user metadata exists, but the application does not set Faro user identity. It does not copy `journey_id`, `swap_id`, or other Layerswap session attributes onto spans.

For exported client spans, the tracing integration can also generate a `faro.tracing.*` event containing flattened span attributes, duration, and trace identifiers. That could provide a Loki-to-Tempo trace link if the receiver retains the event and fields as expected. Neither the event's stored Loki mapping nor Tempo ingestion is verified.

There is no guaranteed direct trace identifier on `swap_lifecycle` events. The currently plausible correlation path is lifecycle event to session ID, then an automatic tracing event/span in the same session, then trace ID. Its success rate is unknown.

## 9. Custom logs, events, measurements, and spans

| Signal type | Layerswap implementation |
| --- | --- |
| custom logs | none found (`pushLog` is not called) |
| custom events | `swap_lifecycle`; legacy `swap_initiated`, `swap_pending`, `swap_completed`, and `swap_failed` |
| custom measurements | none found (`pushMeasurement` is not called) |
| custom spans | none found |
| explicitly reported errors | implemented through `pushError` in `logError()` |

Automatic console logs, Web Vitals/performance measurements, and fetch/XHR spans are separate SDK-produced signals.

## 10. Layerswap attributes and lifecycle events

All `swap_lifecycle` events include schema and lifecycle dimensions where available:

- `schema_version`, `step`, `stage`, `outcome`, `path`;
- `journey_id`, `sequence`, `attempt`, `previous_step`, `previous_outcome`;
- `previous_step_duration_ms`, `journey_duration_ms`;
- `swap_id`, `previous_swap_id`;
- `reason_code`, `reason`, `action`, `provider`;
- transaction, input, output, and refund transaction hashes;
- swap status, phase, deposit method, requested amount;
- source/destination addresses, networks, and tokens;
- confirmation counts;
- `page_url`.

Implemented lifecycle steps include form submission/cancellation, swap creation, wallet connection, network switching, wallet prompts/actions, transaction submission, gasless authorization, user-deposit waiting/copying, input detection/pending/confirmation, output pending/detected/settling, delay, completion/failure/expiry/cancellation, refund pending/completion, retry, flow close/error, and suspected stalls.

Gasless signature rejection is explicitly mapped to `wallet_action_rejected` with action `sign_gasless_authorization` when the provider error is recognized as a user rejection. Wallet connection success and failure have explicit lifecycle steps.

Lifecycle events are deduplicated using event fingerprints, except for a defined repeatable set. Journey sequence and attempt numbers are in-memory client state. Suspected-stall events are timer-driven, diagnostic signals; browser suspension/throttling can affect them.

The older top-level events contain swap ID, addresses, source/destination network and token, status, phase, path, and page URL. They are deduplicated by event name and swap ID.

## 11. Sampling, filtering, and privacy controls

Implemented controls:

- persistent session-level sample rate, defaulting to 100%;
- omission of trace context for unsampled sessions;
- one known noisy exception filter for ResizeObserver loop messages;
- recursive credential-oriented redaction and value truncation;
- optional cross-origin trace-propagation allowlist.

Not found:

- telemetry consent or opt-out handling;
- Do Not Track handling;
- an application-level payload allowlist;
- environment-specific sampling defaults;
- resource URL filtering;
- console-level filtering;
- address, transaction-hash, swap-ID, amount, or query-string minimization;
- label-cardinality enforcement.

Privacy-sensitive or linkable values currently eligible for export include wallet addresses, transaction hashes, swap IDs, requested amounts, error response details, full page URLs, full request/resource URLs, provider names, and console arguments. The redactor covers common credentials, but it is not a general PII or financial-metadata policy. Custom swap context can also be persisted in Faro session storage.

## 12. Source-map configuration

Production client builds conditionally enable `FaroSourceMapUploaderPlugin` when all of these exist:

- `FARO_SOURCE_MAP_ENDPOINT`;
- `FARO_SOURCE_MAP_APP_ID`;
- `FARO_SOURCE_MAP_API_KEY`;
- `FARO_SOURCE_MAP_STACK_ID`.

The source-map application name is `layerswap-frontend`. The bundle ID uses `FARO_BUNDLE_ID`, otherwise the public Vercel commit SHA, otherwise plugin behavior. Git hash is selected from server-side Vercel/GitHub/public commit variables. Uploads are limited to matching `static/chunks/*.js.map` recursively, with Next.js and gzip options enabled.

Source maps are retained long enough for Faro upload when the PostHog uploader is also configured; otherwise Faro uploader cleanup behavior applies after success. `productionBrowserSourceMaps` is enabled.

No local values for the required Faro uploader variables were found, so upload was disabled in the inspected development environment. Production secret/configuration state and upload success are unknown. Source-map resolution has not been verified against an actual stored error.

## 13. Alloy/Faro receiver processing

No Alloy configuration, Faro receiver pipeline, transformation rules, label promotion, or receiver authentication configuration was found in this repository.

Consequences:

- no transformation can be attributed to Alloy from the available implementation;
- the checked-in dashboard's use of `source="faro"`, `app_name`, `event_name`, and `event_data_*` is an unverified schema assumption;
- outgoing Faro payload shape cannot prove final Loki or Tempo field names;
- retention, tenant routing, filtering, and backend sampling are unknown.

The deployment/observability configuration repository or an exported sanitized Alloy configuration is required to complete this section.

## 14. Loki and Tempo destinations

No Loki or Tempo endpoint, tenant, write component, authentication, retention, or datasource provisioning configuration was found in this repository.

The existing dashboard is Loki-only and contains no Tempo datasource, trace panel, or verified trace link. It assumes a Loki `source="faro"` selector and logfmt-parsed Faro records. There is no evidence here that those fields are labels rather than parsed fields, or that Loki ingestion preserves the expected names.

Tempo destination configuration and `session.id` searchability are unknown. A receiver/backend configuration audit and controlled ingestion test are required.

## Controlled verification performed

| Check | Result | What it proves | What it does not prove |
| --- | --- | --- | --- |
| bridge TypeScript check | passed | working-tree bridge code type-checks | runtime Faro behavior or payload schema |
| widget unit tests | 10/10 passed | existing normalization, rejection, error, and log-store behaviors | transport, browser hooks, or stored schema |
| Next.js development server | started; `/` returned 200 | working branch can compile and serve in the controlled environment | browser SDK initialization or event export |
| compiled client bundle inspection | Faro initialization code present | `instrumentation-client` is included in the client build | execution order in a real browser or successful collector delivery |
| browser run | blocked: no browser was available to the in-app browser controller | environment limitation documented | every Phase 2 browser scenario |
| loopback payload capture | not completed | — | outgoing payload fields, IDs, batching, redaction, or trace headers |
| Loki inspection | not available | — | stored log labels/fields and Alloy transformations |
| Tempo inspection | not available | — | stored resources/spans and trace correlation |

The development compilation emitted unrelated optional-dependency warnings for React Native async storage and `pino-pretty`; they did not prevent serving the bridge.

## Instrumentation gaps and recommendations

These are recommendations only; the integration was not changed during this audit.

### Pre-deployment blockers

1. Obtain the deployed Alloy/Faro receiver and Loki/Tempo destination configuration. Without it, final field names, transformations, filtering, sampling, and routing cannot be audited.
2. Run controlled browser capture for the required scenarios before accepting dashboard queries. Store captured, sanitized requests as fixtures and separately inspect backend records.
3. Define and approve a telemetry privacy policy for addresses, transaction hashes, swap IDs, amounts, full URLs/query strings, console arguments, error response data, and persistent session attributes. Prefer explicit allowed fields and URL normalization over relying only on secret redaction.
4. Add a stable, unambiguous environment and release model. Confirm whether `NEXT_PUBLIC_API_VERSION` really represents environment, and align emitted release/version with the source-map bundle identifier.
5. Decide how lifecycle events link to traces. Today only `session.id` is automatically attached to spans; swap/journey attributes and trace IDs are not directly attached to lifecycle events.

### High-priority controlled-test findings to resolve

1. Measure the volume/privacy impact of all-level console capture, all-resource performance capture, `dedupe: false`, and a default sample rate of 1.
2. Add payload/transport tests around `beforeSend`, SDK meta, session/view changes, Web Vitals, HTTP successes/failures, explicit errors, and trace propagation.
3. Validate source-map upload artifacts and resolve a captured minified exception before deployment approval.
4. Verify whether the receiver creates the Loki fields assumed by the existing dashboard and whether trace IDs remain linkable.
5. Test empty/missing attributes; lifecycle events are intentionally sparse and the dashboard must not assume every optional field exists.

### Existing dashboard status

`swap-lifecycle-dashboard.json` is a provisional, unvalidated Loki dashboard. It has application, journey, swap, and step variables, but no environment or release variables and no Tempo workflow. Its data link preserves time and application but cannot preserve environment/release values that do not exist as variables. It is not the requested Frontend Health → Error Investigation → Session Investigation → Loki/Tempo vertical slice.

Do not use its rates, P95 values, funnels, or stall/error panels as operational baselines until production validation is complete.

## Phase gate

The audit and source-derived provisional contract are ready for review. The next safe work item is Phase 2 controlled browser telemetry. Building or revising the vertical-slice dashboard should wait until at least outgoing payload field names have been captured and, preferably, Alloy output in test Loki/Tempo has been inspected.
