# Type-first error investigation — development only

Published 2026-09-09T11:43:25.031Z: new overview version 1, existing investigation version 4 → 5. Readback matched all intended panels, variables, links, titles, descriptions, time/timezone and refresh. The existing dashboard was compared with the inspected version before publication; both saves used `overwrite: false`. Existing folder and saved investigation defaults were retained except the hidden variant selector now defaults to all variants.

## Navigation

1. Open [Error Overview](https://grafana-2.dev.lb.layerswap.cloud/d/layerswap-faro-dev-errors). It defaults to the last 24 hours, mainnet API mode, local version, and an empty text filter. For the verified 34-record example, use **September 1 00:00:00 through September 9 23:59:59 UTC, 2026**.
2. Click an **Error type**. The existing [Error & Session Investigation](https://grafana-2.dev.lb.layerswap.cloud/d/layerswap-faro-dev-slice) opens with that type, all message variants, and cleared session/event selections. Application, environment, release, wallet/text filters and absolute time are carried exactly once in links.
3. Read **Selected type · readable error variants**. Click an error message to narrow examples/matching sessions. The stored hash is retained invisibly for this selector; it is not a human-readable diagnosis. Use **All variants of selected type** to clear it.
4. Click a matching session, inspect its timeline, select a Client time for the exact stored record, then use the logs panel menu → Explore. The full session timeline ignores the selected error variant so surrounding activity stays visible.
5. Use **← Error overview** to return with the same time and scope. Wallet/session/journey investigation remains available without choosing an error. Dedicated RPC, balance, gas-fee and transaction dashboards remain deferred.

## Meaning and limits

The overview has one row per observed exception type, not per hash. Its columns are Error records, Recorded sessions and Latest stored occurrence. Missing type is displayed as `(unknown type)`; empty session IDs are excluded from session counts. Sessions are not people and can occur in several types, so do not sum that column across types. Latest is Loki's stored timestamp, not necessarily the client timestamp (especially for replay).

The detail variant table groups by the observed `hash` and exact `value` message within the selected type. Different stacks or messages can still produce similar-looking rows; no semantic root-cause deduplication is claimed. A message may contain provider/function/request details, but no unverified operation/network columns or classifications are invented. Read the example/raw record and surrounding session for context. Error type alone is not enough to distinguish an actionable regression from routine provider failures.

Type totals and variant rows ignore selected wallet/session/hash. Examples and matching sessions honor the optional hidden hash filter. Wallet search and journey activity ignore the error selection. Selected-session timeline and raw-record queries remain scoped to session/app/environment/release/time. Changing top-level filters does not automatically clear a previous type/message/session selection; use reset or return through the overview.

Empty type selection gives zero selected-type total and no variants/examples/matching sessions. Empty or absent session gives no timeline/raw record. No overview rows means no matching stored errors—not proof the app is healthy. Existing panel descriptions plus overview instructions explain these states; a custom dynamic no-data panel was not implemented.

**Bounds:** examples show newest 20; general journey activity newest 1,000; selected-session timeline oldest 1,000. The broad test timeline actually reached 1,000. Narrow the time range before interpreting missing activity. Metric aggregation is not bounded by `maxLines`; high-cardinality message/hash/session intermediate results may hit Loki series limits or become expensive. Do not add these to Loki ingestion labels, recording rules or persistent metric dimensions. No top-k silently hides other error types, and no baseline, alert threshold, severity ranking, affected-user rate or outage verdict is provided.

## Verification

[Sanitized report](fixtures/faro-dashboard-types-verification.json): 17 panel-query + Grafana-dataframe cases and two reconciliation/drilldown checks passed. Raw mainnet/local errors total **34**, collapsed to **6 type rows**. ContractFunctionExecutionError accounts for **23 records / 4 recorded sessions**, yielding 19 hash/message variants in the focused table. Every type's count, nonempty distinct session count and latest stored time matched the bounded raw query. Narrowing one message yielded two examples and an exact single stored record. The original controlled-marker window still has two errors; the controlled journey window still has 15 lifecycle rows. Unselected/absent/blank-filter checks return empty as intended. No new telemetry was generated.

Local tests: **14 dashboard + 48 Faro + 26 widget = 88 passing**. Dashboard tests cover hidden identifiers, type-to-message-to-session navigation, URL encoding, scope/time preservation, merge configuration, selection reset, empty sentinels, observed fields, and stored nanosecond strings. Browser discovery returned no browser. **API frames are before Grafana table transformations; modeled transformation/link tests do not verify actual rendering or clicks.** No screenshot is available for this version.

The overview uses `labelsToFields` with `valueLabel: statistic`, followed by explicit `merge` and `organize`. This matches Grafana's [labels-to-fields implementation](https://github.com/grafana/grafana/blob/v13.1.3/packages/grafana-data/src/transformations/transformers/labelsToFields.ts) and [merge implementation](https://github.com/grafana/grafana/blob/v13.1.3/packages/grafana-data/src/transformations/transformers/merge.ts). These query-only fields (`statistic`, `stored_ms`, and missing-type display fallback) are not emitted or stored schema changes. No telemetry contract verification state is upgraded by publication. Existing scalar `:doublequote` backslash/control-character and Go `printf "%q"` display JSON caveats remain.

## Browser acceptance and post-deployment checklist

- Confirm six visible type rows in the fixed example range; no fingerprint column or visible hash variable.
- Confirm counts/date columns merge into one table; check missing-session display when such data is available.
- Click a type → readable message → session → Client time → raw record → Explore. Check hidden hash/ns links actually resolve; test long multiline messages, narrow widths, and back/reset links.
- Confirm time/app/environment/release/text filters survive navigation and that changed filters do not leave confusing stale selections.
- Test missing type/absent session/zero-error states visually. Missing-type fallback and zero-session display currently have configuration/modeled coverage, not genuine boundary exemplars.
- After deployment, reconcile against raw records over representative windows, assess error-type/hash stability, noise and new failure contexts, sampling/missing-session effects, late/replayed timestamps, series limits and query cost. Establish health signals/baselines only with representative production evidence.
- Tempo, receiver/source-map resolution and infrastructure rollout remain outside this dashboard change. No GitHub commit/push, frontend deployment or FluxCD update was performed.

## Exact changed queries

Full dashboard JSON includes all existing wallet/journey/session/raw queries and link templates. The changed overview and error queries are reproduced below. All target the non-production Loki datasource `P8E80F9AEF21F6940`.

### Overview panel 2: Error records · application scope

```logql
sum(count_over_time({source="faro"} | logfmt | __error__="" | app_name=${application:doublequote} | app_environment=${environment:doublequote} | app_version=${release:doublequote} | kind="exception" |= ${error_marker:doublequote} | label_format type=`{{ if .type }}{{ .type }}{{ else }}(unknown type){{ end }}` [$__range])) or vector(0)
```

### Overview panel 3: Error types · click to investigate

```logql
label_replace(sum by (type) (count_over_time({source="faro"} | logfmt | __error__="" | app_name=${application:doublequote} | app_environment=${environment:doublequote} | app_version=${release:doublequote} | kind="exception" |= ${error_marker:doublequote} | label_format type=`{{ if .type }}{{ .type }}{{ else }}(unknown type){{ end }}` | keep type [$__range])), "statistic", "Error records", "type", ".*") or label_replace(count by (type) (sum by (type, session_id) (count_over_time({source="faro"} | logfmt | __error__="" | app_name=${application:doublequote} | app_environment=${environment:doublequote} | app_version=${release:doublequote} | kind="exception" |= ${error_marker:doublequote} | label_format type=`{{ if .type }}{{ .type }}{{ else }}(unknown type){{ end }}` | session_id!="" | keep type, session_id [$__range]))), "statistic", "Recorded sessions", "type", ".*") or label_replace(max by (type) (max_over_time({source="faro"} | logfmt | __error__="" | app_name=${application:doublequote} | app_environment=${environment:doublequote} | app_version=${release:doublequote} | kind="exception" |= ${error_marker:doublequote} | label_format type=`{{ if .type }}{{ .type }}{{ else }}(unknown type){{ end }}` | label_format stored_ms=`{{ __timestamp__ | unixEpochMillis }}` | keep type, stored_ms | unwrap stored_ms | __error__="" [$__range])), "statistic", "Latest stored occurrence", "type", ".*")
```

### Investigation panel 2: Error records · selected type

```logql
sum(count_over_time({source="faro"} | logfmt | __error__="" | app_name=${application:doublequote} | app_environment=${environment:doublequote} | app_version=${release:doublequote} | kind="exception" |= ${error_marker:doublequote} | label_format type=`{{ if .type }}{{ .type }}{{ else }}(unknown type){{ end }}` | type=${error_type:doublequote} | type!="__select_group__" [$__range])) or vector(0)
```

### Investigation panel 3: Selected type · readable error variants

```logql
sum by (hash, value) (count_over_time({source="faro"} | logfmt | __error__="" | app_name=${application:doublequote} | app_environment=${environment:doublequote} | app_version=${release:doublequote} | kind="exception" |= ${error_marker:doublequote} | label_format type=`{{ if .type }}{{ .type }}{{ else }}(unknown type){{ end }}` | type=${error_type:doublequote} | type!="__select_group__" | keep hash, value [$__range]))
```

### Investigation panel 4: Selected error · matching sessions

```logql
sum by (session_id) (count_over_time({source="faro"} | logfmt | __error__="" | app_name=${application:doublequote} | app_environment=${environment:doublequote} | app_version=${release:doublequote} | kind="exception" |= ${error_marker:doublequote} | label_format type=`{{ if .type }}{{ .type }}{{ else }}(unknown type){{ end }}` | type=${error_type:doublequote} | type!="__select_group__" | hash=~${error_hash:doublequote} | session_id!="" [$__range]))
```

### Investigation panel 8: Selected error · readable examples

```logql
{source="faro"} | logfmt | __error__="" | app_name=${application:doublequote} | app_environment=${environment:doublequote} | app_version=${release:doublequote} | kind="exception" |= ${error_marker:doublequote} | label_format type=`{{ if .type }}{{ .type }}{{ else }}(unknown type){{ end }}` | type=${error_type:doublequote} | type!="__select_group__" | hash=~${error_hash:doublequote} | label_format stored_ns=`{{ __timestamp__ | unixEpochNanos }}` | label_format message_summary=`{{ if .value }}{{ .value }}{{ else if .message }}{{ .message }}{{ else if .event_data_reason }}{{ .event_data_reason }}{{ else if .event_data_step }}{{ .event_data_step }}{{ else if .event_name }}{{ .event_name }}{{ else }}{{ .type }}{{ end }}` | line_format `{"timestamp":{{ printf "%q" .timestamp }},"kind":{{ printf "%q" .kind }},"type":{{ printf "%q" .type }},"message_summary":{{ printf "%q" .message_summary }},"session_id":{{ printf "%q" .session_id }},"stored_ns":{{ printf "%q" .stored_ns }}}` | keep app_name, app_environment, app_version, session_id
```
