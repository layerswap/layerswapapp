# Provisional Grafana Faro telemetry contract

Audit date: 2026-09-04
Contract status: source-derived; no captured browser payload, Loki record, or Tempo span is available yet.

## Verification rules

The allowed verification states are:

- `Verified in Loki`
- `Verified in Tempo`
- `Verified only in outgoing Faro payload`
- `Found only in source code`
- `Planned but not implemented`

All implemented fields below are currently `Found only in source code`. A final Loki/Tempo name shown as “expected” is not a storage-schema claim. The checked-in dashboard assumptions are recorded so they can be tested, not endorsed.

## Field dictionary

| Signal | Producer | Faro payload field | Final Loki/Tempo field | Type | Example | Required/optional | Verified where |
| ------ | -------- | ------------------ | ---------------------- | ---- | ------- | ----------------- | -------------- |
| application name | Layerswap Faro config | `meta.app.name` | Loki `app_name` assumed by dashboard; Tempo `service.name` expected | string | `layerswap-frontend` | required when Faro starts | Found only in source code |
| application version | Layerswap Faro config | `meta.app.version` | Loki mapping unknown; Tempo `service.version` expected | string | `f8c50dfda` | required, falls back to `local` | Found only in source code |
| environment | Layerswap Faro config | `meta.app.environment` | Loki mapping unknown; Tempo `deployment.environment.name` expected | string | `sandbox` | required, fallback exists | Found only in source code |
| release | not separately implemented | none | none | string | `2026.09.04+f8c50df` | planned | Planned but not implemented |
| session ID | Faro SDK | `meta.session.id` | Loki mapping unknown; Tempo span attribute `session.id` expected | string | `01J...` | expected on sampled session signals | Found only in source code |
| session lifecycle event | Faro SDK | event name for session start/resume/extend | Loki event mapping unknown | string | `session_start` | automatic | Found only in source code |
| page ID | Faro SDK | `meta.page.id` | Loki mapping unknown | string | `/swap` | automatic | Found only in source code |
| page URL | Faro SDK | `meta.page.url` | Loki mapping unknown | string/URL | `https://app.example/swap?...` | automatic | Found only in source code |
| view name | Layerswap call plus Faro SDK meta | `meta.view.name` | Loki mapping unknown | string | `/swap/[id]` | set after route change | Found only in source code |
| view-change event | Faro SDK | event with `attributes.fromView`, `attributes.toView` | Loki mapping unknown | event + strings | `/` → `/swap` | automatic on change | Found only in source code |
| navigation event | Faro SDK | `faro.navigation` with URL/duration attributes | Loki mapping unknown | event | same-document navigation | optional/qualifying navigation | Found only in source code |
| browser metadata | Faro SDK | `meta.browser.*` | Loki/Tempo mapping unknown/SDK-derived | mixed | Chrome, version, viewport | automatic | Found only in source code |
| OS metadata | Faro SDK | `meta.browser.os` | Loki/Tempo resource mapping unknown | string | `macOS` | automatic when detectable | Found only in source code |
| SDK metadata | Faro SDK | `meta.sdk.*` | Loki/Tempo telemetry SDK mapping unknown | strings | Faro Web SDK `2.11.0` | automatic | Found only in source code |
| console log | Faro console instrumentation | log `level`, message/arguments, context | Loki mapping unknown | log record | `info`, message | automatic when invoked | Found only in source code |
| JavaScript exception | Faro error instrumentation | exception type/value/stack/context | Loki mapping unknown | exception | `TypeError` | automatic on error | Found only in source code |
| explicit widget error | Layerswap `logError()` | exception plus `context.source`, event type, cause/details | Loki mapping unknown | exception | source `layerswap-widget` | on explicitly handled non-rejection error | Found only in source code |
| CSP violation | Faro CSP instrumentation | CSP exception/event fields | Loki mapping unknown | exception/event | blocked URI/directive | only on violation | Found only in source code |
| Web Vital measurement | Faro Web Vitals instrumentation | measurement `type=web-vitals`, `values.*`, `context.*` | backend mapping unknown | measurement | `values.lcp=2100` | metric/browser dependent | Found only in source code |
| navigation performance | Faro performance instrumentation | `faro.performance.navigation` values/context | backend mapping unknown | measurement | TTFB/timing values | per navigation entry | Found only in source code |
| resource performance | Faro performance instrumentation | `faro.performance.resource` values/context | backend mapping unknown | measurement | resource URL and duration | per supported resource | Found only in source code |
| trace ID | Faro tracing/OpenTelemetry | OTLP span trace ID; tracing-event trace field | Loki mapping unknown; Tempo native trace ID expected | hex string | `4bf92f...` | on sampled automatic spans | Found only in source code |
| span ID | Faro tracing/OpenTelemetry | OTLP span ID; tracing-event span field | Loki mapping unknown; Tempo native span ID expected | hex string | `00f067...` | on sampled automatic spans | Found only in source code |
| HTTP span name/kind/status | Faro tracing/OpenTelemetry | OTLP span fields | Tempo native span fields expected | mixed | `GET`, CLIENT, ERROR | automatic fetch/XHR | Found only in source code |
| HTTP method | OpenTelemetry fetch/XHR | span `attributes.http.request.method` | Tempo span attribute of same semantic name expected | string | `GET` | automatic | Found only in source code |
| request URL | OpenTelemetry fetch/XHR | span `attributes.url.full` | Tempo span attribute of same semantic name expected | URL string | `https://api.example/...` | automatic | Found only in source code |
| HTTP status | OpenTelemetry fetch/XHR | span `attributes.http.response.status_code` | Tempo span attribute of same semantic name expected | integer | `500` | when response exists | Found only in source code |
| HTTP server | OpenTelemetry fetch/XHR | span `attributes.server.address`, `server.port` | Tempo span attributes expected | string/integer | `api.example`, `443` | when derivable | Found only in source code |
| HTTP error type | OpenTelemetry fetch/XHR | span `attributes.error.type` | Tempo span attribute expected | string | network error/HTTP status class | on failure | Found only in source code |
| tracing mirror event | Faro tracing integration | event named `faro.tracing.*`, flattened span attributes, duration, trace IDs | Loki mapping unknown | event | fetch client span mirror | sampled client spans | Found only in source code |
| lifecycle event name | Layerswap | event `name=swap_lifecycle` | dashboard assumes `event_name=swap_lifecycle` | string | `swap_lifecycle` | required for lifecycle records | Found only in source code |
| schema version | Layerswap | event `attributes.schema_version` | dashboard assumes `event_data_schema_version` | string | `1` | required | Found only in source code |
| journey ID | Layerswap | event/session `attributes.journey_id` | dashboard assumes `event_data_journey_id`; not copied to Tempo spans | UUID string | `e7b...` | required after journey initialization | Found only in source code |
| sequence | Layerswap | event `attributes.sequence` | dashboard assumes `event_data_sequence` | integer encoded by SDK/event attribute | `7` | required for lifecycle event | Found only in source code |
| attempt | Layerswap | event `attributes.attempt` | dashboard assumes `event_data_attempt` | integer encoded by SDK/event attribute | `2` | required for lifecycle event | Found only in source code |
| lifecycle step | Layerswap | event/session `attributes.step` | dashboard assumes `event_data_step` | enum string | `wallet_connected` | required | Found only in source code |
| lifecycle stage | Layerswap | event/session `attributes.stage` | dashboard assumes `event_data_stage` | enum string | `wallet` | required | Found only in source code |
| lifecycle outcome | Layerswap | event/session `attributes.outcome` | dashboard assumes `event_data_outcome` | enum string | `success` | required | Found only in source code |
| swap path | Layerswap | event/session `attributes.path` | dashboard assumes `event_data_path` | enum/string | `swap` | required | Found only in source code |
| swap ID | Layerswap | event/session `attributes.swap_id` | dashboard assumes `event_data_swap_id`; not copied to Tempo spans | string | `swap_...` | optional before creation | Found only in source code |
| previous swap ID | Layerswap | event `attributes.previous_swap_id` | dashboard mapping not used/unknown | string | `swap_...` | optional | Found only in source code |
| previous step/outcome | Layerswap | event `attributes.previous_step`, `previous_outcome` | dashboard assumes corresponding `event_data_*` fields where used | enum strings | `wallet_prompt_opened`, `pending` | optional | Found only in source code |
| step duration | Layerswap | event `attributes.previous_step_duration_ms` | dashboard assumes `event_data_previous_step_duration_ms` | integer/number | `1300` | optional | Found only in source code |
| journey duration | Layerswap | event `attributes.journey_duration_ms` | dashboard assumes `event_data_journey_duration_ms` | integer/number | `8200` | optional | Found only in source code |
| reason code | Layerswap | event/session `attributes.reason_code` | dashboard assumes `event_data_reason_code` | normalized string | `user_rejected` | optional/error paths | Found only in source code |
| reason detail | Layerswap | event/session `attributes.reason` | dashboard assumes `event_data_reason` | string | normalized provider/error message | optional/error paths | Found only in source code |
| wallet action | Layerswap | event/session `attributes.action` | dashboard assumes `event_data_action` | string | `sign_gasless_authorization` | optional | Found only in source code |
| provider | Layerswap | event/session `attributes.provider` | dashboard assumes `event_data_provider` | string | wallet/provider name | optional | Found only in source code |
| transaction hashes | Layerswap | `attributes.transaction_hash`, `input_transaction_hash`, `output_transaction_hash`, `refund_transaction_hash` | dashboard assumes corresponding `event_data_*` fields | string | `0xabc...` | optional | Found only in source code |
| swap status/phase | Layerswap | event/session `attributes.status`, `phase` | dashboard assumes corresponding `event_data_*` fields | string/enums | `pending`, `InputTransactionPending` | optional | Found only in source code |
| deposit method | Layerswap | event/session `attributes.deposit_method` | dashboard assumes `event_data_deposit_method` | string | provider-specific method | optional | Found only in source code |
| requested amount | Layerswap | event/session `attributes.requested_amount` | dashboard assumes `event_data_requested_amount` | string/number representation | `100.0` | optional | Found only in source code |
| source/destination addresses | Layerswap | event/session `attributes.from_address`, `to_address` | dashboard assumes corresponding `event_data_*` fields | string | blockchain address | optional | Found only in source code |
| source/destination network | Layerswap | event/session `attributes.source_network`, `destination_network` | dashboard assumes corresponding `event_data_*` fields | string | `ETHEREUM_MAINNET` | optional | Found only in source code |
| source/destination token | Layerswap | event/session `attributes.source_token`, `destination_token` | dashboard assumes corresponding `event_data_*` fields | string | `USDC` | optional | Found only in source code |
| confirmations | Layerswap | event/session `attributes.confirmations`, `max_confirmations` | dashboard assumes corresponding `event_data_*` fields | integer/number | `3`, `12` | optional | Found only in source code |
| lifecycle page URL | Layerswap | event/session `attributes.page_url` | dashboard assumes `event_data_page_url` | URL string | `https://app.example/swap?...` | present when browser URL available | Found only in source code |
| suspected-stall data | Layerswap | event attributes `stalled_step`, `stall_threshold_ms`, generated reason code | dashboard assumes corresponding `event_data_*` fields | mixed | `awaiting_user_deposit`, `300000` | only when timer fires | Found only in source code |
| legacy swap event | Layerswap | event names `swap_initiated`, `swap_pending`, `swap_completed`, `swap_failed` plus swap attributes | Loki mapping unknown | event | `swap_completed` | compatibility path | Found only in source code |
| lifecycle trace ID | not implemented | none on `swap_lifecycle` event | none | hex string | `4bf92f...` | planned if direct linking is selected | Planned but not implemented |
| journey/swap on spans | not implemented | no corresponding OTLP span attributes | none | string | journey/swap ID | planned if trace filtering requires it | Planned but not implemented |

## Signal behavior and suitability

| Signal family | Semantic meaning and emission | Expected frequency | Correlation | Privacy and cardinality | Appropriate destination |
| --- | --- | --- | --- | --- | --- |
| application/environment/version | identifies emitting deployment/build | every Faro payload through metadata | application, environment, version | low cardinality except version grows per release; no direct PII | Loki labels only after cardinality review; Tempo resources |
| session/page/view | identifies sampled browser session and current route context | metadata on signals; lifecycle/view events on changes | session ID, page, view | session ID is high-cardinality and linkable; full URL may contain sensitive query data | logs/traces as fields; do not promote session ID or URL to broad Loki labels |
| automatic errors | unexpected JS, promise, console-error, or CSP failures | event-driven; burst-prone | session; trace only when separately discoverable | messages/stacks/console arguments can contain sensitive data; fingerprints medium/high | Loki; link to Tempo when trace exists |
| explicit widget errors | handled application failures reported by Layerswap | per handled failure | session, current journey/swap session context | error response/cause may contain sensitive values; high message cardinality | Loki; trace link desirable |
| console logs | developer/application console output | unbounded and workload-dependent | session | highest accidental-disclosure risk; message cardinality high | Loki only after filtering policy |
| Web Vitals | user-perceived loading/interactivity/layout quality | normally a small set per navigation, browser dependent | session/page/view/navigation entry | target selectors can be identifying; values low cardinality but IDs high | metrics preferred for aggregates; logs/measurements for exemplars and debugging |
| performance navigation | browser navigation timing | roughly per navigation | session/page/view/navigation entry | URLs/entry IDs high-cardinality | metrics for aggregate; logs for detail |
| performance resource | timing for each supported loaded resource | potentially many per page | session/page/view/resource entry | full resource URL and IDs high-cardinality; query data risk | metrics after URL normalization; sampled logs for detail |
| HTTP client spans | latency/status of browser fetch/XHR | per instrumented request in sampled session | native trace/span IDs plus `session.id` | full URL high-cardinality; trace/session IDs high-cardinality | Tempo; aggregate metrics derived carefully |
| tracing mirror events | log-side representation of automatic client spans | per sampled client span | session and trace/span IDs | duplicates trace volume; flattened URL attributes high-cardinality | Loki only if needed for cross-link/search |
| swap lifecycle | ordered state transitions in a user swap journey | several to dozens per journey plus retry/repeat events | journey, session, swap; no direct trace ID | IDs, addresses, hashes, amount, URLs are high-cardinality and linkable | Loki for investigations; metrics derived from normalized low-cardinality dimensions only |
| suspected stall | client timer indicates a step exceeded a heuristic duration | zero or more per affected journey | journey/session/swap/step | diagnostic, vulnerable to browser suspension; IDs high-cardinality | Loki; metrics only after production validation |
| legacy swap events | coarse compatibility status events | a few per swap | session/swap | same financial-metadata concerns as lifecycle events | Loki; retire or document duplication after migration |
| source-map identity | resolves minified client stacks to source | per build/upload; applied to errors | app/version/bundle/git hash | build identifiers moderate cardinality; source disclosure/access policy applies | receiver/error processing rather than user-facing signal |

## Layerswap lifecycle emission contract

The following implemented steps are expected under event name `swap_lifecycle`; individual attributes remain optional unless source logic has them at that step:

| Stage | Representative steps | Normal cadence |
| --- | --- | --- |
| form | `form_submitted`, `form_confirmation_cancelled` | once per submit/cancel; submission can repeat |
| swap creation | `swap_creation_started`, `swap_created`, `swap_creation_failed` | one attempt sequence; start can repeat |
| wallet | `wallet_connection_started`, `wallet_connected`, `wallet_connection_failed`, network-switch and wallet-action steps | per provider/user attempt; selected start/prompt steps can repeat |
| transaction | `transaction_submitted`, `gasless_authorization_submitted` | normally once per relevant attempt |
| deposit | `awaiting_user_deposit`, `deposit_address_copied`, input transaction steps | event-driven; address copies may repeat depending on caller behavior |
| settlement | output pending/detected/settling and delay | status-driven, deduplicated by lifecycle fingerprint |
| terminal | completion, failure, expiry, cancellation, refund completion, flow close/error | normally once per fingerprint; terminal state ends journey timers |
| diagnostic | `retry_requested`, `suspected_stall` | per retry or timer threshold |

## Correlation contract, current and proposed

Current source-derived chain:

1. `swap_lifecycle` event carries `journey_id` and usually `meta.session.id`.
2. Automatic `faro.tracing.*` events and HTTP spans carry trace/span identifiers; spans receive `session.id`.
3. A session search may discover an HTTP tracing event/span near the lifecycle event.
4. The trace identifier may then open the Tempo trace if Alloy retains/routes both representations.

Unverified assumptions are steps 1 through 4 at storage time. A lifecycle event is not guaranteed to identify the causally relevant HTTP span merely because both share a session.

Before the vertical slice is considered working, choose and verify one of these contracts:

- direct: attach active trace/span context to the relevant lifecycle/error event; or
- session bridge: prove that Loki preserves session ID on lifecycle and tracing events and Tempo indexes `session.id`, then define deterministic time-bounded linking behavior.

## Privacy and label policy to decide before deployment

Do not promote these to Loki labels or metric dimensions: session ID, journey ID, swap ID, wallet addresses, transaction hashes, page/request URLs, reason text, error messages, span IDs, or trace IDs. They are high-cardinality investigation fields.

Candidate bounded dimensions, subject to controlled payload verification and production cardinality measurement, are application, environment, lifecycle stage/step/outcome, normalized reason code, network, token, path, action, and provider. Release/version is useful but grows with deployments.

Before telemetry is enabled broadly, decide whether to omit, truncate, hash, or access-restrict wallet addresses, transaction hashes, swap IDs, amounts, page query strings, request URLs, provider error contents, and console data. Hashing linkable identifiers is pseudonymization, not anonymization.

## Controlled-telemetry update procedure

For each captured scenario—initialization, route navigation, successful/failed/slow HTTP, uncaught and explicitly reported errors, wallet connection, signature rejection, lifecycle events, and Web Vitals—update the corresponding rows:

1. Save a sanitized raw browser request as a fixture and mark fields actually present as `Verified only in outgoing Faro payload`.
2. Record signal count, batch/request endpoint, session/view IDs, and trace headers/IDs without treating the small sample as a distribution.
3. Inspect the receiver's Loki record and Tempo span independently.
4. Replace assumed final names with observed names and mark `Verified in Loki` or `Verified in Tempo` as applicable.
5. Record every Alloy-added, removed, renamed, flattened, parsed, promoted, or redacted field as an Alloy-produced transformation.
6. Keep fields absent from the controlled capture at `Found only in source code`; absence in a single scenario is not proof of non-emission.

This contract must be reconciled again after enough production telemetry exists. Controlled telemetry can validate schema and linking mechanics, but not production baselines, thresholds, percentiles, volume, retention, cardinality at scale, query cost, or sampling effects.
