# Optimized non-production build verification

2026-09-08, local build of the working tree. No deployment, Grafana publication, FluxCD change or source-map upload was performed. Tempo remains deferred.

## Verified locally

- `pnpm --filter @layerswap/bridge build` completed with exit 0. Next.js 15.5.22 generated build `Fcy8g7u1mzXfqitbf6dKe`.
- The build reported a missing ESLint plugin (`eslint-plugin-no-conditional-literals-in-jsx`), optional wallet dependency warnings (`@react-native-async-storage/async-storage`, `pino-pretty`), and multiple lockfiles. **Build completion does not mean lint passed.**
- `pnpm --filter @layerswap/bridge start` serves the optimized app on `http://localhost:3000`. The earlier development server was stopped first because both use `.next`.
- The build uses the approved development collector and `testnet` API mode. Release attribution is still `local`; API mode and build mode do not establish deployment identity.
- The compiled policy is invoked with `production`, selecting SDK dedupe, warn/error console collection and `trackResources: false`. This is artifact evidence, not browser-runtime verification.
- At **15:32:59 UTC**, the root page, `/_next/static/chunks/main-988ef4f4dd89be57.js`, and its `.map` each returned HTTP 200 locally.
- The main chunk contains a source-map reference. Its version-3 map includes the Faro policy, initialization, sanitizer and session-context source content. Decoding generated line 11, column 9918 resolves to `webpack://_N_E/lib/faro-policy.ts`, line 7, column 8 (`dedupe`). Source URI normalization accounts for `/./` in the map's source list.

No telemetry-contract field is upgraded by compilation, local HTTP availability or source-map decoding.

## Source-map delivery remains unverified

`next.config.js` enables `productionBrowserSourceMaps`. The optional Faro uploader requires `FARO_SOURCEMAP_ENDPOINT`, `FARO_SOURCEMAP_APP_ID` (or `FARO_APP_ID`), `FARO_SOURCEMAP_API_KEY` (or `FARO_API_KEY`), and `FARO_SOURCEMAP_STACK_ID` (or `FARO_STACK_ID`). Those settings are absent in this local environment, so the uploader was not enabled. The PostHog uploader is also missing its API key. No Grafana service-account token was substituted for an upload credential.

An uploader is not the only possible delivery mechanism: [Alloy's Faro receiver documentation](https://grafana.com/docs/alloy/latest/reference/components/faro/faro.receiver/) describes downloading maps from application URLs and explicit source-map locations. The audited receiver source has no explicit source-map block; that does **not** prove source maps are disabled. Runtime configuration, receiver version, network access and actual error resolution still need verification.

The remote development receiver cannot use this Mac's `localhost` URL to reach its build. A receiver-reachable non-production build/map location or an explicitly configured matching map location is needed before the receiver-side test. Do not expose or upload source content without operational approval. A controlled error must originate from the matching minified application build; a DevTools-evaluated error does not prove minified application source-map resolution.

## Browser-operated test observed in dev Loki

At **15:36:30 UTC**, the [sanitized stored evidence](fixtures/faro-optimized-policy-loki-observed.json) contains exactly two records for `FARO_BUILD_CHECK_1788881719370`: one warning (`kind=log`, `level=warn`, `message`) and one console error (`kind=exception`, `type=Error`, `value`). Both share the same session. The supplied snippet invokes each twice using identical warning text and the same Error object; it also invokes debug/log/info once each, with no corresponding marker records returned. This verifies the expected filtering/deduplication outcome in dev Loki for this user-operated test. TRACE was not exercised, and the outgoing transport body/config snapshot was not captured.

The bounded nearby-session query returned 86 records (limit 1000): navigation, view change, session resume, five measurements, fetch/XHR mirrors and application errors/lifecycle events remain present; no resource-performance event was returned. This supports the approved resource suppression but is not an indefinite absence guarantee. Specific measurement types were not projected. `local` does not independently identify the optimized build, and the same session can span earlier SDK instances. No minified-source resolution is demonstrated by a DevTools-created Error.

## Reproduction and remaining outgoing checks

1. Hard-refresh `http://localhost:3000` to replace any earlier development SDK instance.
2. Emit a uniquely marked debug/log/info message, two identical warnings, and two reports of the same Error object. This requires no wallet or swap action.
3. Capture outgoing `collect` requests and independently query dev Loki for the marker. Check one warning and one exception, with debug/log/info absent in the bounded test. Inspect actual SDK configuration as supporting evidence; absence alone is insufficient.
4. Check a fresh load for suppressed resource-performance events while navigation, Web Vitals and HTTP instrumentation remain available. A Web Vital may require interaction or leaving the tab to finalize.
5. Keep payload and stored-schema verification separate. Store sanitized evidence only after observation; do not fabricate a fixture from expected policy settings.

Remaining independent gates: stale-session restoration and cross-tab behavior, receiver-side minified-error resolution, stable release/deployment attribution, approved retention/access/consent posture, and production-scale validation after rollout.
