# Step 1 — schema-aware Faro trace sanitization

Implemented in the frontend working tree on 2026-09-08. No FluxCD, datasource, dashboard, wallet-tracking or production-policy change is included.

## Change

`apps/bridge/lib/faro.ts` now imports its `beforeSend` hook and shared value sanitizer from `faro-sanitizer.ts`. SDK initialization and the existing collector setting are unchanged.

The trace path walks the SDK's resource/scope/span/event/link envelopes explicitly. Structural nesting no longer consumes the application-value depth budget. Every OTLP attribute remains a `{ key, value: AnyValue }` object. Resource arrays such as browser brands retain their `arrayValue.values` array.

Sensitive semantic keys (for example `http.request.header.authorization`, `provider.signature` and `client.secret`) replace the complete attribute value with `{ stringValue: "[REDACTED]" }`. This prevents credentials from hiding behind the protocol's generic `key`/`value` property names. Nested key/value lists receive the same treatment. String content still uses the existing credential redactor and 8,192-character bound.

Application AnyValue nesting remains limited to eight levels. Depth/cycle markers are typed `stringValue` objects, not strings substituted for structural arrays/KeyValue objects. Reused AnyValue objects are not misclassified as cycles. Attribute lists, counts, IDs, times, flags and status codes from valid SDK JSON exports are retained. Non-sensitive byte values retain their encoding (oversize values receive a typed truncation marker); opaque byte contents are not newly decoded/scanned.

Malformed trace envelopes/attribute variants are dropped by returning `null`; their raw contents are not recursively logged. This is a fail-closed guard, not sampling. Tests cover the current Faro 2.11.0 exporter; future serializer/schema changes must rerun these checks. Already-damaged historical attributes cannot be recovered by this fix.

Non-trace sanitization and ResizeObserver suppression are retained. Wallet addresses and requested amounts are deliberately unchanged. This is not general URL normalization, a new sensitive-data policy, or a fix for stale session context.

## Verification

- Nine regression tests cover the installed Faro exporter/OpenTelemetry transformer and the fresh sanitized browser excerpt. They reproduce the old generic depth truncation, check preserved protocol structure and trace/span correlation, semantic-key redaction across all attribute containers, nested scalar/array/key-value values, string bounds, cycles, batches, metadata, non-trace filtering, immutability and malformed-input dropping.
- The full bridge TypeScript check passes, as does the targeted check for `faro.ts` and `faro-sanitizer.ts`.
- Existing browser payload fixtures are unchanged. Test-generated spans are explicitly SDK-generated unit-test inputs, **not a real browser capture** and not backend evidence.

Run with the project's Node 24 runtime:

```sh
pnpm --filter @layerswap/bridge test:faro
```

Node can emit a harmless module-type warning when loading the TypeScript helper from the test. The application's package module type was not changed to suppress it.

## Fresh browser and Loki evidence — 2026-09-08

The user supplied a genuine DevTools screenshot and copied six attributes from one outgoing span, followed by the requested `browser.brands` resource attribute. The [sanitized excerpts and matching Loki projection](fixtures/faro-sanitizer-browser-span-excerpt.json) retain their types and correlation. This is **not a complete captured Faro body**: enclosing metadata/resources/scopes, span events/links, request headers and receiver response were not supplied.

The fresh `browser.brands.value.arrayValue.values` contains three intact `{ stringValue }` entries: `Chromium`, `Not?A_Brand`, `Google Chrome`. This verifies the sampled nested resource array in outgoing telemetry. Its resource-to-span association was user-reported, not independently captured in a full envelope. No stored mapping for this resource attribute was verified. The fixture regression test preserves this exact array as well as the six span attributes.

Observed outgoing: `http.request.method=POST`, `url.full`, `session.id`, integer `http.response.status_code=200`, `server.address` and integer `server.port=3000`. All six are valid key/AnyValue objects rather than depth-limit strings. A full URL query was still present before fixture sanitization; URL normalization remains a separate policy decision.

At 13:24:25 UTC, a dev Loki query returned HTTP 200 and exactly one `faro.tracing.fetch` record in the 13:05:32.573–13:25:32.573 UTC window. Its `session_id`, `event_data_session_id`, `traceID`, `spanID`, URL and server address exactly matched the original user evidence. Method/status/port also matched, stored as parsed strings. Stored attribution is application `layerswap-frontend`, environment `testnet`, version `local`. No telemetry was replayed for this check. An initial query miss was caused by screenshot trace-ID transcription; correcting it yielded the exact match.

Reproducible query template (substitute the original IDs locally; fixture placeholders do not locate live records):

```logql
{source="faro"} | logfmt | __error__="" | session_id="<session ID>" | traceID="<trace ID>" | spanID="<span ID>"
```

This verifies the sampled outgoing attribute structure and its own mirror-log correlation, not a causal relationship to an unrelated lifecycle/error record. Loki does not prove storage of the OTLP span. Tempo remains deferred.

## Remaining boundary verification

1. Reload the working-branch development app in a real browser with the existing collector setting; no new swap or financial action is necessary.
2. Generate one harmless same-origin GET (for example fetch `/favicon.ico`) and wait for the Faro trace batch.
3. Inspect the actual outgoing `collect` body: resource arrays and each span's `attributes` must contain typed objects, including `session.id` where emitted, with intact trace/span IDs. Check that no structural field contains `[Maximum depth reached]`.
4. Capture and sanitize that new body as a separate fixture. Do not overwrite the historical damaged fixture or paste raw session/wallet/error metadata into shared documentation.
5. Match its HTTP mirror in development Loki. Tempo remains deferred; do not claim stored-span verification from browser output alone.

The sampled six span attributes, browser-brands resource array and matching Loki mirror are verified at their stated boundaries. A full fresh envelope, other resource attributes, span events/links, request-header propagation and a browser sensitive-key challenge remain unverified after the correction. Unit tests cover those sanitizer structures, not live storage. The historical damaged fixture remains unchanged; no Tempo verification state is upgraded.
