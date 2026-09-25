# Frontend observability

This directory contains the [telemetry contract](faro-telemetry-contract.md),
Grafana dashboards, paused alert rules, generators and offline regression tests.
Records of the September development checks were retired on 2026-09-24 and
remain in git history; they were bounded development observations, not
production baselines.

## Browser configuration

Set `NEXT_PUBLIC_FARO_COLLECTOR_URL` and restart/rebuild the app. It is the
only required Faro runtime variable.

```yaml
NEXT_PUBLIC_FARO_COLLECTOR_URL: https://your-faro-collector.example/collect
NEXT_PUBLIC_FARO_SAMPLE_RATE: 1 # optional; defaults to all sessions
NEXT_PUBLIC_FARO_DEBUG: false # optional SDK diagnostics
```

The app name is `layerswap-frontend`. API environment is `testnet` when
`NEXT_PUBLIC_API_VERSION` is `testnet`, otherwise `mainnet` (matching the
widget default). Version and release use the build's resolved
`NEXT_PUBLIC_FARO_RELEASE`; deployment identity is tracked separately (see
[Deployment identity and source maps](#deployment-identity-and-source-maps)).

`NEXT_PUBLIC_FARO_SAMPLE_RATE` is optional and defaults to
`1`. At values below `1` the decision is made once per page-load chain when a
fresh session starts, is inherited when the SDK rotates the session in-page
after inactivity/expiry (`previousSession` chains share one decision), and is
never re-rolled by swap/wallet context updates. Known SDK limitation
(faro-web-sdk 2.11.0): every context update rewrites the stored session's
`started`, so the 4-hour max session lifetime is effectively disabled while
context is being written; sessions rotate after 15 minutes of inactivity.

Faro starts in `instrumentation-client.ts` before hydration. Optimized
(`NODE_ENV=production`) builds capture console warnings as logs and console
errors as exceptions; other build modes capture all console levels. Faro also
captures uncaught errors and rejected promises, widget errors, sessions/views,
CSP and performance events, web vitals, and browser traces.
Full page and request URLs retain their query strings for diagnosis; only
credential values are redacted.

## Dashboards and investigation

The native dashboard set consists of four Grafana V2 resources:

| File | Purpose |
| --- | --- |
| [layerswap-faro-trial-home.json](layerswap-faro-trial-home.json) | Issues, recent failures, journeys, session lookup, diagnostics, performance, behavior and transfer-step views |
| [layerswap-faro-trial-issue.json](layerswap-faro-trial-issue.json) | Issue occurrences and hourly trend |
| [layerswap-faro-trial-session.json](layerswap-faro-trial-session.json) | Shared timeline, failures, recorded requests and wallet/swap context |
| [layerswap-faro-trial-event.json](layerswap-faro-trial-event.json) | Exact selected event and raw details |

They use native layouts validated against Grafana 13.1.3. Confirm V2 resource
and native-layout support on the target instance before importing or publishing.
Publish all four resources together and retain their UIDs so links resolve.
For API creation, preserve the generated
`grafana.app/grant-permissions: default` annotation, which requests normal access
grants. Read back each resource and test it through a signed-in browser.

The native generator uses Loki UID `P8E80F9AEF21F6940` and Tempo UID
`P214B5B846CF3925F`. These are development datasource IDs, not portable names.
Before targeting another instance, update the datasource references in
`build-native-trial.py` and regenerate. Dashboard navigation uses relative paths;
open `/d/layerswap-faro-trial-home` on your own Grafana instance.

Start in **Issues**, select a summary, then an occurrence to open its session.
Use **Back to results** to restore the original tab, range and filters, or
**Original session range** to widen the investigation. **Session lookup** accepts
exact wallet, swap, session and journey IDs independently of error selection.
**Transfer step** shows journey counts for wallet prompts, submissions,
blocking conditions, failures and declines; a journey can appear in several
columns.

The native views include both mainnet and testnet. **Deployment** and **Release**
are independent filters; blank includes all values. The default range is seven
days. The older [error overview](faro-dev-error-overview.json),
[investigation slice](faro-dev-vertical-slice.json), and
[standalone lifecycle dashboard](swap-lifecycle-dashboard.json) remain available
with their existing API-mode scope. Their counters describe recorded events;
they do not establish unique people, incidents or backend swap conversion.

### Standalone lifecycle dashboard

The repository includes a standalone lifecycle dashboard at
[swap-lifecycle-dashboard.json](swap-lifecycle-dashboard.json). In Grafana, choose **Dashboards →
New → Import**, upload that file, and select the Loki datasource receiving Faro
events. It adds journey health counters, outcome trends, a per-step funnel,
p95 transition timings, problem reasons, and an ordered journey timeline.

The dashboard's **Journey ID**, **Swap ID**, and **Lifecycle Step** filters
accept regular expressions and default to `.*`. For a complete investigation,
copy a journey ID from **Problem Journeys** into **Journey ID**; this retains
form events that happened before the API assigned a swap ID.

For a one-journey drilldown, use **Journey Index — click an ID to inspect**.
Its link sets the exact Journey ID while resetting the Swap ID and step filters,
so the **Selected Journey Summary** and chronological **Journey Timeline** show
the entire flow. Start at the first rejected, failed, stalled, or abandoned row
and inspect the preceding successful row, timing, reason code, route, provider,
swap ID, transaction hashes, and emitting code path.

### Lifecycle queries

Filter the `swap_lifecycle` event stream in Loki with:

```logql
{source="faro"} | logfmt | app_name="layerswap-frontend" | event_name="swap_lifecycle"
```

Use the journey ID to retain form events emitted before a swap ID exists.
See the [field dictionary](faro-telemetry-contract.md#field-dictionary) and
[lifecycle emission contract](faro-telemetry-contract.md#layerswap-lifecycle-emission-contract)
for attributes, event behavior and verification status.

## Regeneration and local checks

Both generators are offline and use Python's standard library. Run these from
the repository root after changing a generator, and commit its generated JSON:

```sh
python3 apps/bridge/grafana/build-native-trial.py
python3 apps/bridge/grafana/build-issue-alerts.py
node --test apps/bridge/grafana/tests/faro-dev-vertical-slice.test.mjs
python3 apps/bridge/grafana/tests/native-trial.test.py
git diff --exit-code -- apps/bridge/grafana/layerswap-faro-trial-*.json apps/bridge/grafana/faro-issue-alerts.paused.json
```

The final command detects uncommitted generated changes. Navigation tests cover
scope restoration, encoded inputs, exact nanosecond selectors and datasource
links. They do not replace Grafana query or browser checks. The scoped
[dashboard workflow](../../../.github/workflows/grafana-dashboards-pr.yml) runs
these checks independently of the
[bridge/widget workflow](../../../.github/workflows/bridge-widget-pr.yml).

## Deployment identity and source maps

The build derives `NEXT_PUBLIC_FARO_DEPLOYMENT` from Vercel's target environment,
then its standard environment, including framework-prefixed variants. A Next.js
development server is `local`; an optimized build without platform identity is
`unknown`. API mode, a commit SHA and `NODE_ENV=production` do not identify a
deployment environment. No additional manually configured Faro variable is
required. Faro stores this in `meta.page.attributes.deployment_environment`;
the native queries expect `page_attr_deployment_environment` in Loki.

Application `version` and `release` share one resolved release identity (the
CI commit unless `NEXT_PUBLIC_FARO_RELEASE` is set), which is also the key a
receiver-side source-map `location` should use. `unknown-release` is not an
identified build. The build does not upload source maps. The receiver is a
self-hosted Alloy `faro.receiver`, which resolves minified stacks from its own
`sourcemaps` configuration: downloaded from the site or read from a filesystem
`location` keyed by release. Until that is configured, stored stacks refer to
minified code.

To accept source-map delivery, trigger a controlled error at a known location
in a deployed minified build. Match its outgoing application version, bundle
URL, line and column to the stored exception; verify the mapped original file,
line and function against that exact build. Confirm the receiver can reach the
matching artifacts. A successful build alone does not establish receiver-side
resolution.

## Interpretation and operating limits

- Issue grouping uses a versioned normalized-message heuristic, not confirmed
  root-cause attribution. Linked failure observations use explicit occurrence
  IDs; historical failures cannot be reconstructed from nearby timestamps.
- Timeline queries return the newest 1,000 records, displayed chronologically.
  Compare the independent aggregate count and narrow the range when truncated;
  table pagination does not fetch older records. Context uses 20 snapshots and
  operation examples use 100 records. Requests show recorded HTTP mirrors,
  which do not establish the cause of a nearby error.
- Funnel units are mounted form visits, with progress recorded in the selected
  range and within 24 hours of the visit. Recent cohorts are incomplete. Missing
  completion is not proof of abandonment or backend failure. Operation timings
  include actual execution and, for wallet operations, user waiting.
- Web Vitals use the latest stored sample per session/metric ID. Small samples
  can move percentiles sharply; INP can remain absent until interaction or exit.
  Engagement estimates foreground activity with a 30-second idle cutoff; abrupt
  process termination can lose the last interval.
- IDs, addresses, transaction hashes, URLs and raw messages remain searchable
  record fields. Do not promote them to ingestion labels or metric dimensions.
  Full ordinary URLs and wallet/form context are retained with credential
  redaction. Deployed builds capture warn/error console records and suppress
  resource-performance events; local development is more verbose. Sampling
  defaults to all sessions. Validate ingestion volume and query cost with
  representative traffic before selecting operational budgets.

## Alerts and optional tracing

[faro-issue-alerts.paused.json](faro-issue-alerts.paused.json) is an alert
file-provisioning artifact, not a dashboard. All five rules are paused and no
contact points or notification policies are created. Review datasource IDs,
API-mode scope, thresholds, traffic and contact routing before enabling them.
The generated `__dashboardUid__` and `__panelId__` annotations let Grafana resolve
its own dashboard and panel URLs without a committed hostname.
[Grafana annotations](https://grafana.com/docs/grafana/latest/alerting/fundamentals/alert-rules/annotation-label/)
describe this link field.

The rules cover issue bursts, groups absent from the preceding retained 24
hours, missing telemetry, blocked/failed transfer share, and no submissions.
Absence from the prior window does not mean first-ever occurrence or regression.
Quiet traffic, sampling and broken collection can all produce missing telemetry.
Alert recovery is not durable issue resolution or assignment state.

Tempo is optional for the Loki-based speed, interaction, error and session views.
Grafana's log/trace/metric cross-navigation depends on datasource UIDs in
`layerswap/layerswap-fluxcd`, not on this repo.

For browser → API → backend traces, set `NEXT_PUBLIC_FARO_TRACE_PROPAGATION_URLS`
to comma-separated URL prefixes for APIs that accept W3C context, then rebuild:

```yaml
NEXT_PUBLIC_FARO_TRACE_PROPAGATION_URLS: https://api.layerswap.io,https://api-dev.layerswap.cloud
```

The API CORS response must allow `traceparent` (and `tracestate` if sent), and the backend
must extract the incoming context. Verify one fresh request by its exact trace
ID across browser and API spans before claiming end-to-end tracing.

## Rollout acceptance

Deploy the frontend and publish the generated resources as separate actions.
Verify a fresh session's deployment/release fields, current wallet context,
lifecycle progression, retries and cancellations at outgoing and stored
boundaries. Exercise restoration, multiple tabs, account/chain changes and
transport failures. Browser-test navigation, return links, quoted inputs,
missing IDs, no data, query errors and truncated results. Verify receiver-side
source maps, actual retention/access controls, ingestion volume and query cost.
Keep fixture verification states explicit when recording new evidence.
