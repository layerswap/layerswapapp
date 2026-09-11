# Checkpoint B — controlled Faro and Loki verification

Later update: the user supplied the deployment repository. The [FluxCD infrastructure audit](faro-infrastructure-audit.md) supersedes configuration-unavailable statements in this historical checkpoint; applied cluster state remains unverified. The approved slice and its browser-reported quoting correction are documented in [Checkpoint C](faro-checkpoint-c.md).

Evidence date: 2026-09-08. Working revision: `790cb6260`.
Status: partial verification complete; ready to review a limited Loki-only vertical slice. No dashboard was created or changed in this checkpoint. No integration correction or production policy was implemented.

## Verified outcome and boundary

Manually operated Chrome generated real Faro requests against a temporary loopback collector. Selected errors, events and a TTFB measurement were filtered and replayed to `https://faro.dev.lb.layerswap.cloud:12347/collect`. Six replay envelopes were accepted with HTTP 202 and yielded nine records in development Loki. This validates receiver ingestion of those replayed bodies; it does not prove browser CORS to the remote endpoint. Trace bodies were not replayed to Tempo.

The user separately operated `localhost:3000` for an Ethereum Sepolia → Arbitrum Sepolia swap and rejected the `send_transaction` wallet prompt. Stored lifecycle records were located by the user-supplied swap ID, then by session and journey. That browser request body was not captured. This was a transaction rejection, not a wallet connection cancellation or gasless-signature rejection.

The supplied remote collector URL is the only Faro environment setting the user intends to use. The temporary local run overrode that same setting; it did not require deployment of additional Faro variables. API and build attribution are separate concerns.

## Evidence artifacts

- [Browser fixture](fixtures/faro-controlled-browser-payload.json): six selected original envelope bodies, nine selected non-trace signals, three actual OTLP spans and three captured application-request header summaries. IDs/URLs/error stack details are replaced; missing and empty values are preserved. The view event is initial assignment (`unknown` → `/`). Only TTFB is the retained Web Vital exemplar.
- [Loki fixture](fixtures/faro-loki-observed-records.json): sanitized parsed-field projections of nine replay records and five swap-ID-filtered lifecycle records. Raw lines are omitted. `parsedFields` are query results, not ingestion labels. The later ten-step journey query is documented below, not fabricated into this five-record projection.
- [Telemetry contract](faro-telemetry-contract.md): field-by-field verification scope, including source-only and planned fields.
- Raw captures and backend responses remain in local temporary files, outside Git. They must be treated as sensitive. These fixtures do not include the Grafana token, real wallet addresses, swap IDs or transaction hashes. Revoke the dedicated verification token when the work ends.

The sanitized fixture is not the exact replay byte stream: replay retained original correlation IDs and replaced page/view/stack details; the committed fixture additionally replaces IDs and preserves original view values for schema inspection. No fixture is inferred from SDK source.

Artifact validation passed: six browser envelopes / nine selected non-trace signals / three spans; exact placeholder trace/span equality; 19 preserved malformed span attributes; three absent trace-header summaries; fourteen stored projections; no original session/trace/span/journey/swap/address identifiers from the paired saved responses in the fixtures; no raw user-agent strings or loopback URLs; 69 dictionary rows with valid verification states and none claiming Tempo verification. `git diff --check` passed. These checks validate the artifacts, not a correction to instrumentation. No application tests were rerun for this documentation/fixture-only change.

## Scenario coverage

| Scenario | Browser evidence | Loki evidence | Remaining limitation |
| --- | --- | --- | --- |
| initialization | session_start and application metadata | replay record | initial view can be absent |
| route/view tracking | view_changed from unknown to / | replay record, view fields retained | two-route navigation and view ID not verified |
| successful fetch | GET 200, ~8 ms, span and mirror | matched mirror | one controlled local request |
| failed fetch | GET 503, ~3 ms, error.type=503 | matched mirror | HTTP failure; not a transport failure |
| slow fetch | GET 200, ~2.007 s, span and mirror | matched mirror | controlled delay only, no percentile claim |
| uncaught error | FARO_CONTROLLED_UNCAUGHT, exception/stack | matched exception | console-injected timer error, not minified build |
| explicitly reported error | FARO_CONTROLLED_EXPLICIT via existing window.faro.api.pushError | matched exception and context_scenario | does not verify the application-specific handled-error wrapper |
| Web Vitals | TTFB measurement | matched measurement | CLS/FCP/LCP/INP coverage incomplete |
| wallet connection cancellation | not captured | not verified | transaction rejection is a different operation |
| gasless signature rejection | not captured | not verified | do not trigger a live authorization to fill this gap |
| swap lifecycle / transaction rejection | no outgoing body for this test | ten ordered journey events; send_transaction rejected | no transaction submission or completion claimed |
| fetch trace headers | none of traceparent/tracestate/baggage on three local cross-origin requests | not applicable | not a backend API propagation test |
| source-map resolution | not tested | not tested | requires a minified production build and configured resolution pipeline |

Initial capture: 131 envelopes, 583,270 bytes, 566 events, 26 console logs, one measurement, 30 trace-bearing envelopes over approximately 39 seconds. Event counts: 307 resource, 253 fetch mirror, three XHR mirror, one session_start, one view_changed, one navigation timing. There were 245 external fetch events across 60 external origins; 249 POSTs across all 253 fetch events. These categories overlap, so do not describe all 245 external requests as POSTs. No collector URL appeared in the captured fetch/resource events. The exact initiator of the external traffic is not yet established. Development compilation, wallet/RPC initialization and retries may affect the sample; this is a volume warning, not a production rate or baseline.

## Storage schema and receiver processing

Grafana: `https://grafana-2.dev.lb.layerswap.cloud/`; Loki datasource UID `P8E80F9AEF21F6940`. Authenticated health, metadata, raw log and LogQL queries succeeded. Receiver authentication/tenant routing and Loki write/retention configuration remain unavailable.

| Layer | Observation | Interpretation |
| --- | --- | --- |
| raw Loki stream labels | source, service_name, detected_level | verified on controlled exception and swap streams; not a universal label inventory |
| raw error label values | faro, unknown_service, unknown | use app_name and kind after parsing; do not assume service_name equals app.name or detected_level identifies exceptions |
| raw line | logfmt text | JSON parsing is inappropriate for these records |
| structured metadata | no third tuple element returned | none exposed in tested responses; backend capability/configuration not established |
| metadata flattening | app_name/environment/version, session_id, page_id/url, view_name, browser_*, sdk_* | parsed fields; replay preserves application and session values |
| session context | session_attr_journey_id, session_attr_step, etc. | current session context repeated on signals, not immutable causal ownership |
| events | kind=event, event_name/domain, event_data_* | dots in HTTP attribute keys appear as underscores, e.g. event_data_http_response_status_code |
| exceptions | kind=exception, type, value, stacktrace, context_scenario, hash | hash is observable, but its algorithm and stability are unknown |
| Web Vital | kind=measurement, type=web-vitals, ttfb and value_ttfb, context_* | duplicate numeric field naming observed; select one canonical field per query |
| trace mirrors | traceID, spanID, event_data_session_id, event_data_duration_ns | exact browser trace/span IDs preserved on all three controlled HTTP mirrors |
| timestamps | Loki tuple time differs from browser signal timestamp on replay | query replay by ingestion window; retain original client timestamp for chronology; exact receiver time policy unknown |

These are observed receiver-to-storage transformations. Without sanitized Alloy/Faro receiver and Loki processing configuration, they cannot be attributed to specific Alloy processors versus receiver serialization, Loki discovery or query parsing. `| logfmt` makes fields appear in query response `stream` objects; it does not promote them to stored stream labels.

Needed infrastructure artifact: the dev observability deployment repository or a sanitized export containing receiver configuration, outputs, processors, Loki write/tenant routing, datasource provisioning, retention and sampling. Credentials are not needed in that export.

Tempo datasource `P214B5B846CF3925F` is provisioned read-only with URL `http://tempo:3200`; the health response reported connection refused and search returned 502. Tempo was explicitly deferred. Its source-map behavior, stored span schema and correlation links are not verified. Configured links referring to datasource names `Loki`/`Prometheus` instead of the discovered UIDs need review if Tempo work resumes; the existence of settings alone does not prove working links.

## Queries tested through Grafana

Executed 2026-09-08 at approximately 08:34 UTC. Range: `1788853889049731335` through `1788856044222695435` (Loki nanoseconds), forward direction, at most 100 records per range query. This is the stored replay/test interval, not the older original browser capture interval. All eight requests returned HTTP 200 and no parsing errors.

The named placeholders below were replaced with observed values in the actual requests. Placeholder IDs in fixtures will not match live records. Queries use the non-production datasource above.

```logql
# Raw controlled errors (2 records; inspect real ingest labels before parsing)
{source="faro"} |= "FARO_CONTROLLED_"

# Error groups (instant query at range end; 2 groups, total count 2)
sum by (type, hash) (count_over_time(
  {source="faro"} |= "FARO_CONTROLLED_" | logfmt | __error__=""
  | app_name="layerswap-frontend" | app_environment="mainnet"
  | app_version="local" | kind="exception" [24h]
))

# Same controlled error session (2 records)
{source="faro"} | logfmt | __error__=""
  | app_name="layerswap-frontend" | app_environment="mainnet"
  | app_version="local" | session_id="<observed-error-session>"
  | kind="exception" |= "FARO_CONTROLLED_"

# Exact HTTP mirror trace (1 record)
{source="faro"} | logfmt | __error__=""
  | app_name="layerswap-frontend" | app_environment="mainnet"
  | app_version="local" | session_id="<observed-error-session>"
  | traceID="<observed-fetch-trace>"

# Complete test journey (10 records)
{source="faro"} | logfmt | __error__=""
  | app_name="layerswap-frontend" | app_environment="testnet"
  | app_version="local" | session_id="<observed-swap-session>"
  | event_name="swap_lifecycle" | event_data_journey_id="<observed-journey>"

# Absent session (0 records)
{source="faro"} | logfmt | __error__=""
  | app_name="layerswap-frontend" | app_environment="mainnet"
  | app_version="local" | session_id="faro-controlled-definitely-absent"

# Wrong environment (0 records)
{source="faro"} | logfmt | __error__=""
  | app_name="layerswap-frontend" | app_environment="faro-controlled-absent-environment"
  | session_id="<observed-error-session>"

# Raw later swap lifecycle subset (5 records; ingest-label inspection)
{source="faro"} |= "<observed-swap-id>" |= "swap_lifecycle"
```

The group query validates count arithmetic and syntax only. No affected-user rate, alert threshold or production error fingerprint stability is established. The absent-value tests verify query results, not a dashboard's visual empty state. Variable interpolation, clickable data links and preserved browser navigation remain untested until the vertical slice is built.

## Correlation findings

Sequence 1–10 from the session/journey query:

1. form_submitted
2. awaiting_wallet_action
3. network_switch_started
4. network_switched
5. swap_creation_started
6. swap_created
7. wallet_prompt_opened
8. awaiting_wallet_action
9. wallet_action_rejected (action=send_transaction, reason_code=user_rejected)
10. awaiting_wallet_action

The later five records carry the swap ID. All ten are found through session and journey. Sequence is numeric text: convert to a number before sorting (`10` must follow `9`). A journey can return to pending after rejection, so rejection is not a terminal failed-swap count. Use client timestamps plus journey/sequence for the event timeline while preserving the Loki time range needed to retrieve records. Clock skew and cross-tab ordering remain untested.

Both controlled exceptions have no trace ID. All three fetch mirrors do have trace/span IDs, matched to their original browser spans. A session/time match does not establish which of multiple fetches caused an error. The reduced dashboard must label nearby HTTP events as contextual and offer an exact trace-ID filter only when a record already carries that ID.

## Corrections and production policy proposal

Safe technical corrections to propose separately (not implemented here):

- Make sanitization aware of the OTLP structure. `apps/bridge/lib/faro.ts` stops at depth eight; all 19 attributes across the three selected spans become `[Maximum depth reached]` strings. A resource array is truncated too. Preserve OTLP key/value/AnyValue structure, apply credential filtering using the semantic attribute key, and bound application values. Merely raising the depth limit would not address semantic-key redaction. Re-capture before declaring fixed.
- Preserve independent wallet and swap session attributes: `setSwapContext` replaces attributes today. Merge explicit namespaces and clear stale account/swap fields on the corresponding lifecycle changes.
- Separate backend mode from deployment attribution and align version with build/source-map identity. Local errors were tagged mainnet, the test swap testnet, both version local. Neither tag proves the deployment environment or production data provenance.

| Concern | Current behavior | Risk | Recommended production behavior | Tradeoff | Required code/config change |
| --- | --- | --- | --- | --- | --- |
| Sampling | default 100% session sampling | volume and cost | sandbox/dev 100%; start production at 5% subject to operational approval | sampled sessions miss rare errors; no error bypass without explicit design | approved environment defaults in faro.ts; no required extra Faro env setting |
| Console levels | all levels | repeated noise and sensitive arguments | production warn/error; debug only in dev | fewer debug breadcrumbs | console instrumentation configuration |
| Duplicate suppression | Faro dedupe disabled; lifecycle dedupe separate | repeated signal bursts | enable SDK dedupe; retain meaningful repeated lifecycle attempts | repeats may be hidden | faro.ts configuration and controlled repeat test |
| Page URLs | full URLs in metadata and session/event context | query credentials and linkable IDs | strip query/fragment; use route templates; retain IDs in named fields | less literal URL context | page/meta and lifecycle sanitization |
| Request/resource URLs | full URLs | secret/path-ID leakage and cardinality | normalize API route paths, strip query/fragment; allowlist relevant hosts | less detail for third-party diagnosis | tracing/performance sanitization and filters |
| Resource timings | all supported resources | 307 resource events in one initial capture | disable all-resource capture initially in production; retain navigation and Web Vitals; later allowlist APIs | reduced asset-level diagnostics | performance instrumentation config |
| Wallet addresses | form address context exists; connected-wallet synchronization absent | linked account activity and stale context | approved direction: retain wallet_address/family/connector on session and relevant events, optional chain ID; restricted access, never labels | useful address-based investigation with access obligations | wallet connect/account/chain/disconnect synchronizer; merge session namespaces |
| Swap IDs / transaction hashes | eligible in structured lifecycle/session fields | high cardinality and linkability | retain for investigations as structured fields; no metric dimensions or stream labels | larger searchable records | approved field allowlist and receiver label policy |
| Requested amounts | exact amount in lifecycle/session context | financially sensitive context on unrelated signals | omit from broad session context; retain exact amount on targeted events only if approved, otherwise buckets | less precise comparison with swap state | field selection and product policy |
| Error/provider details | credential-oriented text redaction, large strings allowed | private details in arbitrary responses | bounded reason_code/type and sanitized message; exclude raw provider response bodies by default | may require restricted follow-up diagnostics | application-error allowlist and robust nested redaction |
| Consent/opt-out | no explicit handling found | collection may ignore product preferences/requirements | define product/legal requirements; support initialization gate, opt-out and persistence cleanup where required | missing telemetry for opted-out users | consent state integration and SDK pause/reset behavior |
| Retention/access | dev Editor token; backend policy unavailable | uncontrolled exposure and storage duration | proposed dev 7 days, production raw 14 days pending operational review; least privilege, restricted address access, short-lived tokens | shorter investigations; role maintenance | Loki retention/tenant/RBAC configuration |

The percentages and retention periods are proposed starting policies, not values derived from synthetic data or confirmed deployed configuration. Optional future improvements: controlled error grouping independent of unstable messages, targeted resource sampling, schema-aware regression capture automation and operation tracing when Tempo is restored.

## Direct correlation proposal, deferred implementation

| Operation span | Start | Finish |
| --- | --- | --- |
| quote request | one logical quote dispatch | response, failure or abort; identify retry attempt |
| swap creation | validated creation request dispatch | response supplying swap ID or failure |
| wallet connection | user starts connection attempt | connected, cancelled or rejected |
| network switch | switch request issued | observed chain change, rejection or bounded timeout |
| signature request | provider signing request | signed response or rejection; never include signature bytes |
| transaction submission | user-approved provider submission call | returned transaction hash or failure; not chain settlement |
| deposit detection wait | one bounded polling episode | detection, cancellation, suspension timeout or episode boundary |
| settlement tracking | one bounded tracking episode | terminal state or bounded episode end |

Bounded attributes: operation, outcome, normalized reason_code, wallet family/connector, source/destination network and token, deposit method, attempt and normalized HTTP route. Session/journey/swap/trace/span IDs and optional transaction hashes are searchable attributes only. Full wallet addresses and amounts should remain on approved session/event context rather than every span. Do not create a span for every UI lifecycle event.

Propagate W3C trace context to explicitly allowed Layerswap API origins, derived from the already configured API endpoint if no additional Faro environment variables are wanted. Cross-origin API CORS must allow the actual frontend origins and traceparent/tracestate; allow baggage only if an approved baggage contract is used. The backend must extract and continue context. None of this is proven by the three local fetch tests: they had no trace headers. Unsampled sessions omit trace context under the current setting, so correlation will be absent by design for them; document any future independent error sampling.

## Dashboard readiness and remaining gate

| Panel/workflow | Readiness | Evidence / remaining validation |
| --- | --- | --- |
| controlled error count and groups | Buildable provisionally from controlled telemetry | exception fields and count query verified; fingerprint stability unverified |
| error → affected session | Buildable provisionally from controlled telemetry | exact session filter verified; data link and variable propagation not built |
| session lifecycle timeline | Buildable provisionally from controlled telemetry | ten-step journey query verified; numeric ordering, multi-tab behavior and UI still to test |
| HTTP context / exact trace mirror lookup | Buildable provisionally from controlled telemetry | IDs preserved in Loki; no causal error link when ID absent |
| connected wallet session panel | Blocked by missing instrumentation | synchronization contract planned |
| resolved source-stack investigation | Blocked by missing instrumentation | configured upload/resolution path and minified test missing |
| production rates, vital distributions, alerts | Blocked until production telemetry exists | synthetic counts cannot establish thresholds or baselines |
| Tempo navigation | deferred by user decision | backend unavailable and payload span attributes damaged |

Proposed next authorized scope, after Checkpoint B approval: error signal → group → affected session → ordered timeline → Loki event, using this dev datasource, preserving application/environment/version and time range. Test missing fields, empty results, link encoding and variables in the browser. No full dashboard suite or operational thresholds.

Remaining verification gaps: two-route browser navigation, fuller Web Vitals coverage, a deliberately failed transport/XHR test, wallet connection cancellation, gasless rejection if safely reproducible, paired lifecycle browser payload, application-specific explicit-error wrapper, source maps, full Alloy configuration, retention and sampling effects. These are explicitly not marked complete.

## Post-deployment checklist

- Compare stored fields and types to the contract; inspect missing, added and transformed values.
- Verify actual environment/version attribution and source-map resolution for a deployed build.
- Measure session/journey matching and direct trace matching separately; account for sampling, retries and tabs.
- Reconcile grouped counts against raw records and distinguish pending-after-rejection from terminal failure.
- Measure event volume, stream-label cardinality and parsed-field cardinality at scale.
- Test realistic time ranges, query cost, ingestion delays, time semantics and retention requirements.
- Confirm URL/error redaction, wallet-context clearing, consent/opt-out and access controls.
- Establish production baselines and thresholds only after sufficient representative data; optimize queries before expanding dashboards.
