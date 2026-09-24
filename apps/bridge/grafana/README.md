# Frontend observability

This directory contains the [telemetry contract](faro-telemetry-contract.md),
Grafana dashboards, paused alert rules, generators and offline regression tests.
Records of the September development checks were retired on 2026-09-24 and
remain in git history; they were bounded development observations, not
production baselines.

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
identified build. The build does not upload source maps; runtime configuration
is documented in the [bridge README](../README.md#faro-browser-observability).

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
Datasource correlation and browser-to-API propagation instructions are in the
[infrastructure README](infra/README.md). Its proposed patch has not been
applied. Verify actual destination UIDs and API CORS/context extraction before
enabling propagation; verify an exact trace ID across browser and API spans.

## Rollout acceptance

Deploy the frontend and publish the generated resources as separate actions.
Verify a fresh session's deployment/release fields, current wallet context,
lifecycle progression, retries and cancellations at outgoing and stored
boundaries. Exercise restoration, multiple tabs, account/chain changes and
transport failures. Browser-test navigation, return links, quoted inputs,
missing IDs, no data, query errors and truncated results. Verify receiver-side
source maps, actual retention/access controls, ingestion volume and query cost.
Keep fixture verification states explicit when recording new evidence.
