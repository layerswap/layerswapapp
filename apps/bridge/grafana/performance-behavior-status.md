Performance and behavior implementation, 2026-09-10

Current remaining work and subsequent changes: [rollout checklist](README.md).

The bridge now forwards optional widget telemetry to Faro. The development
dashboard has Performance and Behavior tabs alongside the existing issue and
session investigation views:

https://grafana-2.dev.lb.layerswap.cloud/d/layerswap-faro-trial-home

| Area | Coverage |
| --- | --- |
| Browser speed | LCP, INP, CLS, FCP, TTFB p75; independent sample counts; hourly LCP trend |
| Application timings | Quote, detailed quote, limits, swap creation, deposit actions, balances, gas estimation, wallet connection, wallet transfer, gasless authorization |
| Behavior | Named control activations, source/destination route selection, first form edit, validation transitions, form submission and subsequent observed lifecycle progress |
| Engagement | Page-template views and foreground focused time with a 30-second idle cutoff |
| Investigation | Operation examples and form visits link to sessions; recorded trace IDs link to Tempo |
| Automation | PR workflow runs telemetry tests, widget build/tests, bridge types, navigation tests and generated-dashboard consistency |

No new replay or heatmap instrumentation was added. Existing Vercel Speed
Insights, Analytics and optional PostHog initialization remain as configured.

Event contract

- `browser_experience`: `page_viewed` and disjoint `engagement` intervals;
  `page_view_id`, `route`, `active_ms`, sequence.
- `widget_interaction`: bounded action name and trigger. Only named controls
  and the first edit are tracked; no DOM text, typed input or keystroke stream.
  Explicit route selection also includes the selected network/token.
- `widget_flow`: one ID per mounted form, start time, elapsed time, form mode,
  route/token/deposit-method context, stage and cumulative progress flags.
- `widget_operation`: one completion record per actual execution; unique
  operation ID, elapsed milliseconds, outcome and the flow context captured
  when the operation began. Cache hits do not manufacture executions. Wallet
  operations include user waiting and are labelled accordingly.

The widget exposes `callbacks.onTelemetry` without depending on Faro. Callback
exceptions cannot interrupt the underlying operation. The implementation uses
the existing one-live-widget constraint; unmount/replacement suppresses late
delivery to an old host. Event IDs prevent SDK deduplication from merging real
separate operations. Existing sanitization still applies at the bridge boundary.
Identifiers remain payload fields, not Loki stream labels.

Interpretation

- Funnel unit is a mounted form visit, potentially including retries/multiple
  submissions. Stages use the same cohort and cumulative prerequisites. A visit
  must start in the selected time range, and progress must be recorded in range
  and within 24 hours. Recent cohorts are incomplete. Automatic deposit-form
  submission without interaction does not count as an interactive start.
- Missing completion is not proof of abandonment or backend failure. Browser
  events cannot report progress after the browser closes. Backend-authoritative
  swap conversion requires joining backend outcomes in a separate data model.
- These are sessions and form visits, not deduplicated people across devices.
- Web Vitals use the latest stored sample per session/metric ID. Grafana's p75
  selects the nearest observed index; small samples can move sharply. INP may
  be missing until interaction or exit. Older records without a view template
  appear under `(unknown)`; no raw URL grouping is introduced.
- Operation timings represent execution time, not full perceived quote latency
  including debounce. Balance failures can return fallback results and remain
  distinguishable as failed/partial telemetry.
- The latest form activity table scans the newest 1,000 records and states that
  cap. Operation examples use the newest 100 records. Neither is an exhaustive
  aggregate. Loki/Tempo retention and query series limits still apply.
- Active intervals flush every minute, on visibility/focus changes and on exit.
  Abrupt process termination can lose the final interval. This is a foreground
  activity estimate, not proof that a person was paying attention.

Verification

Passed locally: bridge TypeScript, widget compilation and 35 widget tests,
57 Faro tests, 10 native dashboard navigation tests and 14 existing dashboard
regression tests. Seven additional checks
executed Grafana 13.1.3 transformations against retained measurement responses
and synthetic form records, checking percentile values, timeseries output,
session boundaries and all form drilldown fields.

All 48 new dashboard queries passed against development Loki across mainnet and
testnet. New behavior/operation queries had no deployed records; a valid empty
query is not proof of browser instrumentation delivery. Existing Web Vitals
returned retained samples. Four v2 schemas passed server dry-run validation.
Publication/readback evidence is in
`fixtures/faro-experience-verification.json`.

The frontend changes are **not deployed**. The new browser events, page-template
metadata and latest dashboard layout are **not browser-verified**. CI was added
but has not run on GitHub. Before rollout acceptance, exercise a fresh deployed
session through route selection, validation, quote, wallet cancellation and a
test swap; match its exact events and trace IDs in Grafana. Compare volume under
representative traffic before relying on the queries at production scale.

Tempo and infrastructure

Tempo's development health check succeeded and backend trace search returned
traces. A separate search for `layerswap-frontend` returned zero traces. This
does not establish browser ingest or end-to-end API tracing.

The existing Alloy routing already supports Faro logs and spans. The necessary
Grafana datasource-reference correction is prepared in
[`infra/tempo-datasource-links.patch`](infra/tempo-datasource-links.patch), with
scope and application notes in [`infra/README.md`](infra/README.md). It has not
been applied. Browser → API propagation is already configurable in frontend
code; confirm API CORS and context extraction before enabling it for an origin.
