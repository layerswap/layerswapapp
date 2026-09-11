# Checkpoint C — provisional Loki-only investigation slice

## Current: type-first overview and focused investigation — 2026-09-09

The approved [type-first update](faro-dashboard-types.md) supersedes the visible type/hash table described below. New overview UID `layerswap-faro-dev-errors` version 1 shows one row per type; the existing investigation UID is now version 5 with readable message variants and a hidden hash selector. Published/read back at **11:43:25 UTC**. The broader verified window has 34 raw errors across six types, including 23 ContractFunctionExecutionError records across four recorded sessions. Query/API reconciliation and 88 local tests pass; browser rendering/clicks remain pending. No production-readiness or telemetry-contract state upgrade is implied. See the linked report for exact queries, scope, bounds, screenshots/visual limitations and post-deployment checks.

## Shared investigation clarity update — 2026-09-09

Published with approval at **10:41:14 UTC**, version **3 → 4**, UID `layerswap-faro-dev-slice`. A fresh GET exactly matched the intended panels, variables, links, title/description and preserved time/timezone/refresh. Publication used `overwrite: false`, checked the complete previously inspected dashboard and refused unexpected version changes. Existing saved variable defaults and folder placement were preserved. No GitHub push, frontend deployment, runtime instrumentation, FluxCD or datasource change.

The user explicitly rejected a dedicated RPC panel; the dedicated RPC diagnostics were removed from the code on 2026-09-11. Dedicated balance-fetch, gas-fee fetch/calculation and transaction-error panels are deferred; general rage-click/stuck-user detection and automatic friction scoring are not implied or implemented.

### Delivered behavior

- Error count now says **application scope**. Error groups and affected-session counts show **Error records**, including Grafana's `Value #A` variant. Counts still ignore wallet/selected-session filters and are not rates, distinct people or an outage verdict.
- New **Selected error · readable examples** (ID 8): newest 20 exceptions for the chosen type/hash and error-record filter, displayed chronologically. Read the message, click Session for all activity, or Client time for the stored error/stack. It stays empty before group selection.
- New **Journey activity · investigate without an exception** (ID 9): newest 1,000 recorded `swap_lifecycle` events in app/API-mode/version/time, displayed chronologically. It is not filtered by selected wallet/session/error and does not require an exception. Inspect actual attempts, outcomes and progress; no inferred blockage or abandonment.
- **Session timeline** now places **What happened** near the left: exception `value`, console `message`, event-local `event_data_reason`, then step/event/type fallback. It does not promote a session's last error/reason into a new event's causal explanation. Operation/outcome, journey, network and wallet-prompt attempt columns remain available.
- Timestamp links preserve scope, selected time, wallet/error filters and session, and now add hidden `event_ns`. The query-derived `stored_ns` is the original Loki tuple nanosecond timestamp, kept as a string rather than an imprecise JavaScript number. Exact stored time plus client time/kind/session distinguishes all 23 tested records, including five sharing one client timestamp. Identical-time duplicates can still match; no universal event ID is claimed.
- No threshold colors, dedicated operation panel, traces, dashboards outside this slice, or “confirmed stuck users” metric was introduced. The instruction panel is shorter; detailed scope/empty-state warnings live in panel descriptions and this report.

### Verification and remaining browser acceptance

[Sanitized API verification](fixtures/faro-dashboard-clarity-verification.json) records **21 checks**, including **19 panel-query + Grafana-dataframe cases**, the 23 individual stored-record equality checks and a real console-message display comparison. All succeeded. Original error window: two error records/two group totals, one affected-session error, nine session rows, one selected stored record, one readable error example. The Sep 9 harness window contains 23 session rows and 15 general lifecycle rows; these remain fake-provider/controller test data, not real swaps. Blank selections, absent session and wrong environment return zero rows. No telemetry was generated or replayed for these dashboard checks.

The browser skill found no connected browser. Thus browser interpolation, rendering/column widths, hidden-field data links, native Explore navigation and visual empty states are **not newly UI-verified**; API/JSON and modeled-link tests are not screenshots. Earlier version-3 screenshots remain historical, not proof of the new panels. No screenshot was fabricated.

Final local checks: **48 Faro + 26 widget + 11 dashboard tests = 85 passing tests**; `git diff --check` passes. The two new dashboard regressions cover shared-panel scope, friendly count labels, event-local message selection, stored-time string preservation and collision-safe modeled links. The existing Node module-type warning remains. No application type/build rerun was needed for this dashboard/test/documentation-only update.

New `stored_ns` and `message_summary` are query-time display fields, not Faro attributes, stored log schema additions, ingestion labels or recording-rule dimensions. The identity uses Loki's [timestamp/template functions](https://grafana.com/docs/loki/latest/query/template_functions/); their availability was tested against this dev backend. Existing `:doublequote` limitations for literal backslashes/control characters remain. Display JSON still uses Go `printf "%q"`; the captured strings parse successfully, but arbitrary control-character/Go-escape edge cases are not established as universal JSON support.

### How to use this version

1. Refresh the [same development dashboard](https://grafana-2.dev.lb.layerswap.cloud/d/layerswap-faro-dev-slice). Saved defaults retain the Sept 8 07:50–08:30 UTC/mainnet/local controlled-error view.
2. Select a type/fingerprint in **Error groups**. Read the error in **Selected error · readable examples**; choose its session or one in **matching sessions**.
3. In **Session timeline**, inspect messages, actions/outcomes and surrounding activity. Click a Client time → scroll to **Selected stored record** → panel menu → Explore.
4. For behavior without an exception, choose the relevant app/API mode/version/time and start from **Journey activity**. Click Session for the full sequence of all signals. For existing Sep 9 controlled lifecycle data, use `testnet`, `local`, **09:25:24.693–09:29:39.351 UTC**. This demonstrates the generic entry using test data.
5. Confirm time/scope and selected session remain unchanged through links. Test empty selections/absent session and reset. Old bookmarked event links without `event_ns` fail closed; select a timestamp again.
6. Treat a full 1,000-row result as possibly truncated. Activity shows the newest rows; selected-session timeline retrieves the oldest rows in range. Narrow the range before interpreting missing start/result/recovery. Missing later progress can also reflect sampling, loss, navigation or range boundaries.

### Current panel readiness

| Component | Readiness | Required post-deployment / remaining validation |
| --- | --- | --- |
| error count/groups and readable examples | Buildable provisionally from controlled telemetry | visual message/count rendering, fingerprint stability, noise/context separation and realistic query cost |
| general journey activity → session | Buildable provisionally from controlled telemetry | browser click-through, diverse real operations, window completeness and cardinality |
| readable session timeline → stored record | Buildable provisionally from controlled telemetry | hidden string-ID link/render behavior; duplicate stored timestamps, Unicode/control text, multi-tab timing |
| automatic stuck-user/rage-click detection | Blocked by missing instrumentation | define/approve behavior signals, capture and verify them; no absence-based health inference |
| operational thresholds and baselines | Blocked until production telemetry exists | representative sampled population, raw-event reconciliation, volume and distributions |

Specialized balance, gas-fee and transaction panels are **deferred by user choice**, not a claim that every required field is missing. Reassess their own instrumentation/contracts before building them.

### Exact revised / new queries

Queries for panels 2/3/4/7 are unchanged from the earlier sections. The following are the current exact templates for the changed/new panels; earlier panel-5/6 templates below are historical and superseded.

#### Panel 5: Session timeline · what happened before and after

forward range query, maximum 1000 records.

```logql
{source="faro"} | logfmt | __error__="" | app_name=${application:doublequote} | app_environment=${environment:doublequote} | app_version=${release:doublequote} | session_id=${session_id:doublequote} | session_id!="" | session_id!="__select_session__" | label_format stored_ns=`{{ __timestamp__ | unixEpochNanos }}` | label_format message_summary=`{{ if .value }}{{ .value }}{{ else if .message }}{{ .message }}{{ else if .event_data_reason }}{{ .event_data_reason }}{{ else if .event_data_step }}{{ .event_data_step }}{{ else if .event_name }}{{ .event_name }}{{ else }}{{ .type }}{{ end }}` | line_format `{"timestamp":{{ printf "%q" .timestamp }},"kind":{{ printf "%q" .kind }},"type":{{ printf "%q" .type }},"message_summary":{{ printf "%q" .message_summary }},"event_data_step":{{ printf "%q" .event_data_step }},"event_data_outcome":{{ printf "%q" .event_data_outcome }},"event_data_action":{{ printf "%q" .event_data_action }},"event_data_reason_code":{{ printf "%q" .event_data_reason_code }},"session_id":{{ printf "%q" .session_id }},"event_data_journey_id":{{ printf "%q" .event_data_journey_id }},"event_data_sequence":{{ printf "%q" .event_data_sequence }},"event_data_attempt":{{ printf "%q" .event_data_attempt }},"event_data_source_network":{{ printf "%q" .event_data_source_network }},"event_data_destination_network":{{ printf "%q" .event_data_destination_network }},"traceID":{{ printf "%q" .traceID }},"spanID":{{ printf "%q" .spanID }},"event_name":{{ printf "%q" .event_name }},"stored_ns":{{ printf "%q" .stored_ns }}}` | keep app_name, app_environment, app_version, session_id
```

#### Panel 6: Selected stored record · open Explore for full inspection

forward range query, maximum 1000 records.

```logql
{source="faro"} | logfmt | __error__="" | app_name=${application:doublequote} | app_environment=${environment:doublequote} | app_version=${release:doublequote} | session_id=${session_id:doublequote} | session_id!="" | session_id!="__select_session__" | timestamp=${event_time:doublequote} | kind=${event_kind:doublequote} | label_format stored_ns=`{{ __timestamp__ | unixEpochNanos }}` | stored_ns=${event_ns:doublequote} | stored_ns!="__select_event__"
```

#### Panel 8: Selected error · readable examples

backward range query, maximum 20 records.

```logql
{source="faro"} | logfmt | __error__="" | app_name=${application:doublequote} | app_environment=${environment:doublequote} | app_version=${release:doublequote} | kind="exception" |= ${error_marker:doublequote} | type=${error_type:doublequote} | hash=${error_hash:doublequote} | hash!="__select_group__" | label_format stored_ns=`{{ __timestamp__ | unixEpochNanos }}` | label_format message_summary=`{{ if .value }}{{ .value }}{{ else if .message }}{{ .message }}{{ else if .event_data_reason }}{{ .event_data_reason }}{{ else if .event_data_step }}{{ .event_data_step }}{{ else if .event_name }}{{ .event_name }}{{ else }}{{ .type }}{{ end }}` | line_format `{"timestamp":{{ printf "%q" .timestamp }},"kind":{{ printf "%q" .kind }},"type":{{ printf "%q" .type }},"message_summary":{{ printf "%q" .message_summary }},"session_id":{{ printf "%q" .session_id }},"stored_ns":{{ printf "%q" .stored_ns }}}` | keep app_name, app_environment, app_version, session_id
```

#### Panel 9: Journey activity · investigate without an exception

backward range query, maximum 1000 records.

```logql
{source="faro"} | logfmt | __error__="" | app_name=${application:doublequote} | app_environment=${environment:doublequote} | app_version=${release:doublequote} | event_name="swap_lifecycle" | session_id!="" | label_format stored_ns=`{{ __timestamp__ | unixEpochNanos }}` | label_format message_summary=`{{ if .value }}{{ .value }}{{ else if .message }}{{ .message }}{{ else if .event_data_reason }}{{ .event_data_reason }}{{ else if .event_data_step }}{{ .event_data_step }}{{ else if .event_name }}{{ .event_name }}{{ else }}{{ .type }}{{ end }}` | line_format `{"timestamp":{{ printf "%q" .timestamp }},"kind":{{ printf "%q" .kind }},"type":{{ printf "%q" .type }},"message_summary":{{ printf "%q" .message_summary }},"event_data_step":{{ printf "%q" .event_data_step }},"event_data_outcome":{{ printf "%q" .event_data_outcome }},"event_data_action":{{ printf "%q" .event_data_action }},"event_data_reason_code":{{ printf "%q" .event_data_reason_code }},"session_id":{{ printf "%q" .session_id }},"event_data_journey_id":{{ printf "%q" .event_data_journey_id }},"event_data_sequence":{{ printf "%q" .event_data_sequence }},"event_data_attempt":{{ printf "%q" .event_data_attempt }},"event_data_source_network":{{ printf "%q" .event_data_source_network }},"event_data_destination_network":{{ printf "%q" .event_data_destination_network }},"traceID":{{ printf "%q" .traceID }},"spanID":{{ printf "%q" .spanID }},"event_name":{{ printf "%q" .event_name }},"stored_ns":{{ printf "%q" .stored_ns }}}` | keep app_name, app_environment, app_version, session_id
```

### Post-deployment validation remains required

Reconcile stored schema and active receiver configuration; verify deployment/release and source maps; measure volume, sampling and label/query cardinality; compare aggregates with raw records; test realistic ranges, capped results, exact links and missing context. Establish thresholds only after sufficient representative telemetry. General friction inference and specialized error panels require their own evidence. Tempo remains deferred.

---


## Wallet search extension — 2026-09-08

Published with user approval at **14:23:14 UTC**, live dashboard version **2 → 3**, UID `layerswap-faro-dev-slice`. Seven panels now include the existing six plus **Wallet search · Matching sessions** (ID 7). Added scalar textbox `wallet_address`, initially blank. Existing error/session queries are unchanged; their panels moved down eight grid rows. No GitHub push, frontend deployment, datasource or FluxCD changes.

The publication used `overwrite: false` with the inspected version and refused unexpected version/query changes. A fresh GET exactly matched saved panels, variables, links, description and time configuration. The existing saved error-test time/environment defaults remain unchanged; use the link below for the wallet-test window.

[Open the wallet-test view](https://grafana-2.dev.lb.layerswap.cloud/d/layerswap-faro-dev-slice?from=1788875100000&to=1788876900000&var-application=layerswap-frontend&var-environment=testnet&var-release=local&var-error_marker=)

1. Enter either test wallet address into **Wallet address (exact)** and apply the textbox value.
2. The matching-sessions table should show the recorded session. Click its `session_id` → **Open full session timeline (including after disconnect)**.
3. The timeline is filtered by session/scope/time, **not by wallet address**. It can therefore include connected, disconnected and reconnected records. It remains capped at 1,000 rows; narrow the time window when capped.
4. Click a timestamp to inspect the stored event, then use the raw panel's **Explore** action.
5. Try blank and absent addresses: the wallet table should be empty. An old selected timeline may remain until reset; empty search is not a command to clear session selection.

All links preserve wallet search, application, environment, version, error marker and absolute time. Selecting a wallet session clears stale error-group/event selections. Wallet search is independent of the error marker/groups. Search is exact and case-sensitive, with the existing scalar-string quoting limitations; input normal wallet addresses, not backslashes/control characters. Addresses and session IDs can appear in URL history and must not be shared publicly.

### Exact new panel query

Instant query at the selected time-range end. `$__range` is the range duration. `wallet_needle` and `wallet_match` are query-time fields; `keep session_id` removes other query-result dimensions before aggregation. No wallet/session values are promoted to ingestion labels or recording rules. The count is matching stored records, not distinct users/wallets or an error rate.

```logql
sum by (session_id) (count_over_time({source="faro"} | logfmt | __error__="" | app_name=${application:doublequote} | app_environment=${environment:doublequote} | app_version=${release:doublequote} | session_id!="" | session_attr_connected_wallets!="" | label_format wallet_needle=${wallet_address:doublequote} | wallet_needle!="" | label_format wallet_match=`{{ $found := false }}{{ $needle := .wallet_needle }}{{ range $wallet := fromJson .session_attr_connected_wallets }}{{ if eq $wallet.wallet_address $needle }}{{ $found = true }}{{ end }}{{ end }}{{ $found }}` | __error__="" | wallet_match="true" | keep session_id [$__range]))
```

The query iterates the JSON array with [Loki template functions](https://grafana.com/docs/loki/latest/query/template_functions/), instead of extracting only index zero. Existing exact queries below remain unchanged.

### Verification and limitations

- **9 offline dashboard tests pass**: preserved scope/time/links, blank selections, all-element query structure, unchanged session timeline filtering and original query regressions.
- At **14:22:04 UTC**, both actual old/new wallet addresses produced one matching session via the new aggregate query. Grafana `/api/ds/query` returned a numeric `Value` frame labeled by `session_id`; blank/absent searches returned no frames. Wrong environment returned no rows.
- A session-timeline query using the old address selection still retrieved the exact stored disconnected exemplar in a narrow window. This verifies absence of a wallet filter on the timeline, not completeness of a capped 30-minute timeline.
- All five existing data-panel queries passed again in the original error-test range with prior expected results (2 errors, 2 group totals, 1 selected-session error, 9 timeline rows, 1 raw error).
- The earlier **14:15:56 UTC** all-element query test passed eight cases: first/second/third array positions, absent address, empty array, blank search, duplicate address and missing-address entry. Multiple-wallet cases were **synthetic query-time overrides on one existing row**, not fabricated browser fixtures or newly ingested telemetry. Real multi-wallet collection remains unverified.
- Browser skill discovery returned no available browsers. The nine offline link/format tests model interpolation; they do not execute Grafana's browser runtime. Subsequent user-operated screenshots provide the limited rendered acceptance recorded below, not an automated browser test.
- No production thresholds, baselines, retention conclusions or production-scale query-performance claims. The aggregate query can still be expensive at large time ranges/session cardinality. Tempo remains deferred.

### Wallet-search manual visual acceptance — 2026-09-08

Two user-supplied screenshots show one wallet-matching session with **267 Matching records**, the same session selected in dashboard variables, and its populated timeline. The application `layerswap-frontend`, environment `testnet`, version `local`, wallet search and **13:45–14:15 UTC** range remain visibly consistent between screenshots. The friendly count-column title renders correctly. Timeline rows include exceptions, `swap_lifecycle` (`flow_error` / `failed`), Web Vitals, logs, resource events and fetch mirrors, in ascending visible timestamp order. No query warning is visible.

The **267** is matching telemetry records, not errors or users. The separate **36** error count and error-group table remain scoped to application/environment/version/time/error marker, **not the wallet search or selected session**. The empty affected-sessions panel is expected while no error group is selected; wallet entry does not require a group.

This accepts the rendered wallet-result → selected-session timeline path. The cropped rows do not independently verify post-disconnect inclusion, timeline completeness, raw-event drilldown for this wallet path, or exact URL parameters. Post-disconnect inclusion has the separate API-query evidence above. Screenshots were inspected in the conversation, not copied into Git, because they contain a real address and session/journey identifiers. No production or Tempo validation is implied.


Created in development Grafana on 2026-09-08 at 09:09 UTC, after Checkpoint B approval. Tempo remains explicitly deferred. This is not production-ready and does not complete the original Tempo-ended workflow.

### Browser-reported query correction — 2026-09-08

The user's screenshot exposed `parse error at line 1, col 89: syntax error: unexpected IDENTIFIER`. The initial tests incorrectly modeled Grafana `:json` formatting as `JSON.stringify` for textbox strings. Grafana actually returns scalar strings unchanged, producing unquoted `app_name=layerswap-frontend`. The exact HTTP 400/error was reproduced against Loki. All five panel queries now use `:doublequote`, matching the observed scalar names/IDs/timestamps. The live dashboard was updated from version 1 to 2 at 12:13 UTC, preserving all other live settings; saved expressions were read back and verified. Reloading the browser is required to use the correction.

Corrected live queries/dataframe checks passed at 12:09 UTC with the same counts below. Seven offline checks now pass, including the scalar-format/column-89 regression. Subsequent user-operated browser screenshots confirmed the happy-path navigation below. `:doublequote` escapes quotation marks but is not arbitrary LogQL string serialization: literal backslashes/control characters are not supported input for this provisional slice. URL encoding tests are separate from query-string escaping tests. Source: [Grafana formatter implementation](https://github.com/grafana/scenes/blob/main/packages/scenes/src/variables/interpolation/formatRegistry.ts).

## Delivered

- [Live development dashboard](https://grafana-2.dev.lb.layerswap.cloud/d/layerswap-faro-dev-slice/faro-dev-c2b7-error-e28692-session-provisional)
- [Dashboard JSON](faro-dev-vertical-slice.json), UID `layerswap-faro-dev-slice`, six panels including the instructions panel.
- [Offline regression checks](tests/faro-dev-vertical-slice.test.mjs), using the sanitized [stored-record fixture](fixtures/faro-loki-observed-records.json).
- [Checkpoint B evidence and policy proposal](faro-checkpoint-b.md) and [provisional field contract](faro-telemetry-contract.md).

Created with `POST /api/dashboards/db`, `overwrite: false`, after confirming the UID was absent. Grafana returned success/version 1. A fresh GET verified all saved queries, datasource references, field configuration/data links, transformations, variables, dashboard links and default time range against the local JSON. No existing dashboard, datasource, ingestion configuration or frontend instrumentation was changed. The earlier `swap-lifecycle-dashboard.json` remains untouched and is not part of this validated slice.

Grafana version: 13.1.3. Non-production Loki datasource: `P8E80F9AEF21F6940`. No Tempo datasource is referenced.

## Navigation and manual visual acceptance

1. Open the live dashboard. Keep its saved **2026-09-08 07:50–08:30 UTC** range, application `layerswap-frontend`, environment `mainnet`, version `local`, and marker `FARO_CONTROLLED_`.
2. The count should be **2**, with two error-group rows. Click a group's `hash` (or its data-link menu → **Show affected sessions**).
3. Scroll to **Affected sessions**. The selected group should show one session with one error. Click its `session_id` → **Open this session timeline**.
4. Scroll to **Session timeline**. Expect nine replay records, ordered by client timestamp: initialization/view/measurement, HTTP context and errors. These are older client timestamps inside a later Loki ingestion window.
5. Click a row's `timestamp` → **Open matching raw Loki event**, then scroll to **Selected Loki event**. The controlled error example returns one logfmt record.
6. Use that raw panel's native **Explore** action to carry the interpolated query, datasource and time range into Loki Explore. This intentionally uses Grafana's native handoff, not a manually assembled nested Explore URL.
7. Return to the timeline and select an HTTP mirror. Its raw record carries `traceID`/`spanID`; an error row does not. There is no Tempo link and no claimed causal relationship between nearby HTTP and an error.
8. Check the URL/time picker after each data link: `from`, `to`, `var-application`, `var-environment` and `var-release` must be unchanged. Group selection clears session/event selection; session selection clears event selection.
9. Test absent session, wrong environment, an empty time range, and **Reset group and session**. The count uses zero for no matches; tables/logs have no rows with persistent instructions explaining what to select/check. Missing event fields remain empty, not invented.
10. Optionally inspect the existing Sepolia test without another transaction: set environment `testnet` and paste its known session ID. The timeline does not require an error group. The observed journey contains ten lifecycle steps; rejection of `send_transaction` is followed by pending wallet action, not terminal swap failure.

Browser automation discovery returned no connected browsers. The user subsequently performed the happy-path steps and supplied screenshots; these are manual visual evidence, not an automated browser test. Rendered empty states, reset behavior, the HTTP-mirror drilldown and exact Explore time bounds still require acceptance. If rows do not appear, inspect the panel query before changing fields or broadening scope.

### User-operated visual evidence — 2026-09-08

| Step | Screenshot observation | Verification limit |
| --- | --- | --- |
| error signal/groups | count 2, two groups with count 1 each, no visible query warnings | controlled records only; count column displays `Value #A` rather than the intended friendly `Errors` title |
| group → affected session | selected type `controlled_test`, matching selected hash, one session/count 1 | the visible application/environment/version and 07:50–08:30 UTC range were preserved at this transition |
| session → timeline | nine rows rendered in ascending client-timestamp order, including three fetch mirrors and two exceptions | numeric lifecycle-sequence tie-breaking is not exercised by this error-session screenshot |
| timestamp → raw record | selected `controlled_test` exception returned `FARO_CONTROLLED_EXPLICIT` with matching client timestamp, hash and session | raw session attributes include independent balance-error context; that does not establish causal ownership |
| raw panel → Explore | Loki query fully interpolated application/environment/version/session/client timestamp/kind; one matching log returned | native query/datasource handoff confirmed; Explore time picker/URL bounds were cropped out |

Explore displays the stored event at 11:52:29.049, versus 07:52:29.049 UTC in the dashboard. This is consistent with UTC+4 display, not evidence of a changed record. The graph spans approximately 11:50–12:30, also consistent with the original window; exact epoch-bound preservation still needs the time picker or URL. Do not confuse either stored time with the original September 7 client timestamp.

Screenshot contents were inspected in the conversation but not copied into Git: they contain live session/journey identifiers and raw session context. Sanitized fixtures remain the shareable regression artifacts. No production-readiness or Tempo verification state is implied by this visual acceptance.

The dashboard uses one page, with links between selections; navigation does not require a full suite. The slider/time picker range selects **Loki time**, not original client time. Error marker only restricts error count/groups/affected sessions; the selected-session timeline intentionally includes all signal kinds in the selected range.

## Tested evidence

Read-only live checks executed at 09:03 UTC through Grafana's datasource proxy and `/api/ds/query`. All requests succeeded with HTTP 200, no LogQL parsing error or Grafana result error.

| Check | Observed result |
| --- | --- |
| error count | 2 |
| error groups | 2 series; counts sum to 2 |
| affected sessions for one exact type/hash | 1 session, count 1 |
| selected error-session timeline | 9 rows; valid query-projected JSON |
| selected error by session/client timestamp/kind | 1 raw record |
| Grafana panel data for all five data panels | all returned successfully |
| unselected group/session/event | no rows in panels 4/5/6 |
| absent session | no timeline rows |
| wrong environment | no timeline rows |
| initial manually JSON-escaped session with backslash/newline | valid API query only; not evidence of real Grafana textbox behavior (see correction above) |
| corrected doublequote session containing quote, ampersand, question mark and Unicode | valid API query; no rows |
| Sepolia session/journey | all ten lifecycle records; numeric sequence 1–10 in client-time order |
| saved dashboard readback | exact query, variable, transformation and link configuration preserved |

Observed Grafana dataframe shapes:

- Count: `Time:time`, `Value:number`.
- Groups: two frames with `Time`, `Value`; `Value` has `hash` and `type` labels.
- Affected sessions: `Time`, `Value`; `Value` has `session_id`.
- Timeline and raw event: `labels:other`, `Time:time`, `Line:string`, `tsNs:string`, `labelTypes:other`, `id:string`. Timeline had nine rows, raw event one.

These **Grafana response fields** are not additional Faro payload fields or Loki ingestion labels. The timeline's `line_format` creates display JSON from observed logfmt fields. It does not establish a stored JSON schema. The `keep` stage only reduces query-result labels, not ingestion labels.

Offline tests after the quoting correction: **7 passed** using Node's built-in test runner:

```sh
node --test apps/bridge/grafana/tests/faro-dev-vertical-slice.test.mjs
```

They check dev-only scope, field provenance, sentinel filtering, numeric sequence configuration, preserved context/time through the three link templates, special-character URL round trips, the corrected scalar formatter behavior, and the absence of error trace IDs in the fixture. Interpolation remains a source-checked model; it does not execute Grafana's browser interpolation/transform engine. Corrected live queries used double-quoted scalar values and expanded range duration. Saved query text retains Grafana variables for actual dashboard use.

## Exact panel queries

Variables are scalar textboxes. `:doublequote` quotes the value and escapes quotation marks; use the observed simple names/IDs/timestamps, not arbitrary backslash/control-character input. URL data links use `:percentencode`; they enumerate every variable once and preserve absolute `${__from}`/`${__to}`. No `label_values` query pretends parsed application/session fields are ingestion labels.

### Panel 2: 1 · Frontend errors in selected range

Instant query at the selected range end; `$__range` is the selected duration.

```logql
sum(count_over_time({source="faro"} | logfmt | __error__="" | app_name=${application:doublequote} | app_environment=${environment:doublequote} | app_version=${release:doublequote} | kind="exception" |= ${error_marker:doublequote} [$__range])) or vector(0)
```

### Panel 3: 2 · Error groups — click hash

Instant query at the selected range end; `$__range` is the selected duration.

```logql
sum by (type, hash) (count_over_time({source="faro"} | logfmt | __error__="" | app_name=${application:doublequote} | app_environment=${environment:doublequote} | app_version=${release:doublequote} | kind="exception" |= ${error_marker:doublequote} [$__range]))
```

### Panel 4: 3 · Affected sessions — select a group, then click session_id

Instant query at the selected range end; `$__range` is the selected duration.

```logql
sum by (session_id) (count_over_time({source="faro"} | logfmt | __error__="" | app_name=${application:doublequote} | app_environment=${environment:doublequote} | app_version=${release:doublequote} | kind="exception" |= ${error_marker:doublequote} | type=${error_type:doublequote} | hash=${error_hash:doublequote} | session_id!="" [$__range]))
```

### Panel 5: 4 · Session timeline — click timestamp for stored event

Forward range query; maximum 1,000 lines.

```logql
{source="faro"} | logfmt | __error__="" | app_name=${application:doublequote} | app_environment=${environment:doublequote} | app_version=${release:doublequote} | session_id=${session_id:doublequote} | session_id!="" | session_id!="__select_session__" | line_format `{"timestamp":{{ printf "%q" .timestamp }},"kind":{{ printf "%q" .kind }},"type":{{ printf "%q" .type }},"value":{{ printf "%q" .value }},"event_name":{{ printf "%q" .event_name }},"event_data_step":{{ printf "%q" .event_data_step }},"event_data_outcome":{{ printf "%q" .event_data_outcome }},"event_data_journey_id":{{ printf "%q" .event_data_journey_id }},"event_data_sequence":{{ printf "%q" .event_data_sequence }},"traceID":{{ printf "%q" .traceID }},"spanID":{{ printf "%q" .spanID }}}` | keep app_name, app_environment, app_version, session_id
```

### Panel 6: 5 · Selected Loki event — panel menu → Explore

Forward range query; maximum 1,000 lines.

```logql
{source="faro"} | logfmt | __error__="" | app_name=${application:doublequote} | app_environment=${environment:doublequote} | app_version=${release:doublequote} | session_id=${session_id:doublequote} | session_id!="" | session_id!="__select_session__" | timestamp=${event_time:doublequote} | kind=${event_kind:doublequote}
```

Transformations: groups/sessions use `labelsToFields` then `organize`. Timeline extracts JSON from `Line`, converts `event_data_sequence` to number, sorts by `timestamp`, journey ID and sequence, then organizes columns. Subsequent screenshots confirm rendered group/session tables and the nine-row timestamp-ordered timeline. Sequence conversion/tie-breaking remains configuration/API-tested only; the cosmetic count-column rename did not take effect (`Value #A` is displayed).

## Readiness and query limitations

| Component | Readiness | Remaining validation |
| --- | --- | --- |
| error count / groups | Buildable provisionally from controlled telemetry; API and manual screenshot evidence | cosmetic count title; production hash stability, volume and query cost |
| group → affected session | Buildable provisionally from controlled telemetry; manual navigation confirmed | empty states/reset and missing sessions at realistic scale |
| ordered session timeline | Buildable provisionally from controlled telemetry; nine-row error-session UI confirmed; ten lifecycle rows API-tested | numeric tie-breaking, missing/unequal timezone timestamps, clock skew, multi-tab ordering |
| selected raw Loki record | Buildable provisionally from controlled telemetry; raw record and native Explore query handoff visually confirmed | exact Explore time bounds, HTTP-mirror drilldown and rendered empty states |
| Tempo trace | deferred by user | restore backend, fix malformed span attributes, verify stored spans and causal context |
| broader production dashboards / thresholds | Blocked until production telemetry exists | post-deployment checks below |

- `source="faro"` is the only ingestion label selector. Application, environment, version, session, error and trace values are parsed fields. Query-time error/session count dimensions are not persisted metrics or new stream labels; do not turn these into recording rules.
- Counts describe matching stored events, not distinct people or error rates. A session can contain several errors and journeys.
- `mainnet`/`testnet` currently describe API-mode attribution. `local` is not a deployed release identifier.
- The default marker deliberately excludes unrelated errors. Clearing it broadens the query only within this non-production datasource.
- Range queries stop at 1,000 lines; no automatic pagination. Treat a full result as potentially truncated and narrow the time range. Instant aggregate queries are not capped by this line limit and can hit backend series limits.
- Current count queries parse event fields before aggregation; large ranges/high field cardinality can be costly. No production-scale performance claim is made.
- Type/hash stability and the hash algorithm remain unknown. Missing fields can create incomplete groups; a missing session cannot support drilldown.
- The selected raw event uses session + client timestamp + kind, not a globally unique event ID. Same-time collisions can return multiple records; inspect event/trace fields before drawing conclusions.
- Sorting client timestamps assumes comparable formatting/offsets, as observed in the UTC controlled records. There is no verified global ordering across devices/tabs.
- Changing application/environment/version manually does not automatically reset existing group/session choices. Use the reset link if the old selection no longer matches.
- Defaults intentionally save the historic controlled ingestion window with refresh off. Retention may eventually remove these rows; do not interpret expiration as instrumentation failure.
- No real IDs, wallet addresses or token are embedded in dashboard defaults. Investigation URLs can acquire real session IDs after a click; restrict sharing and access.
- Errors have no verified direct trace ID. Nearby HTTP mirrors are contextual, not proof that a request caused an exception.
- No receiver-config attribution, minified source-map test, full Web Vitals coverage, consent/retention decision or production-safety fix is claimed complete.

## After deployment, before expanding the suite

1. Reconcile the [now-located FluxCD manifests](faro-infrastructure-audit.md) with the active Helm releases/rendered configuration; then reconcile the final stored schema with the contract.
2. Implement approved privacy/volume decisions and verify the schema-aware span sanitizer correction separately. Recheck redaction with a real capture.
3. Verify deployed application/environment/release attribution, source-map resolution and URL normalization.
4. Measure event volume, labels and query-time cardinality, retention, ingestion delay and timestamp semantics over representative production windows.
5. Measure session/journey/direct-trace coverage separately, accounting for sampling, retries and tabs.
6. Reconcile aggregates against raw events; test missing IDs, timestamp collisions and capped timelines.
7. Test query cost and browser navigation over realistic ranges. Optimize before broader rollout.
8. Establish baselines, distributions and operational thresholds only from sufficient representative production telemetry.
9. Resume Tempo and complete the end-to-end trace link only when the backend and payload schema are verified.

Implementation references: Grafana's [data-link variables](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-data-links/), [variable formatting](https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/variable-syntax/), [field transformations](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/query-transform-data/transform-data/), and Loki's [template functions](https://grafana.com/docs/loki/latest/query/template_functions/).
