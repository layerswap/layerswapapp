
<br />
<div align="left">
  <h1 align="left">UI for Layerswap web application</h1>
</div>
 
This repository contains implementation of Layerswap UI



### Run locally


  ```sh
  pnpm install
  pnpm dev
  ```

 
### Required environment variables

  ```yaml
  NEXT_PUBLIC_LS_API = https://api-dev.layerswap.cloud/
  NEXT_PUBLIC_API_KEY = mainnet #sandbox for testnets
  ```

### Faro browser observability

Set the collector URL and restart/rebuild the app. A sample rate of `1` sends
telemetry for every browser session.

```yaml
NEXT_PUBLIC_FARO_COLLECTOR_URL: https://your-faro-collector.example/collect
NEXT_PUBLIC_FARO_SAMPLE_RATE: 1
NEXT_PUBLIC_FARO_DEBUG: false # optional SDK diagnostics
```

`NEXT_PUBLIC_FARO_COLLECTOR_URL` is the only required Faro runtime variable.
The app identity matches the existing integration branch: app name
`layerswap-frontend`, API environment `testnet` when `NEXT_PUBLIC_API_VERSION`
is `testnet` and otherwise `mainnet` (matching the widget default), and version
and release from the build's resolved `NEXT_PUBLIC_FARO_RELEASE`. Deployment
identity is tracked separately; see [Grafana setup](grafana/README.md).
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

Swap callbacks (status and lifecycle) publish the dashboard-compatible
`swap_initiated`, `swap_pending`, `swap_completed`, and `swap_failed` events
once per swap and attach the active swap ID, route, tokens, and addresses to
the Faro session.

Every meaningful user or system transition is additionally published as one
`swap_lifecycle` event stream. Filter it in Loki with:

```logql
{source="faro"} | logfmt | app_name="layerswap-frontend" | event_name="swap_lifecycle"
```

Use `journey_id` and `sequence` to reconstruct the ordered journey, even for
events before the API creates a `swap_id`. `attempt`, `previous_step`,
`previous_step_duration_ms`, and `journey_duration_ms` make retries and slow
stages visible without reading the entire browser session. The main diagnostic
columns are `step`, `stage`, `outcome`, `reason_code`, `swap_id`, `session`,
the route fields, and the input/output/refund transaction hashes.
In raw Loki records Faro prefixes event attributes with `event_data_` (for
example `event_data_step`); dashboard transformations can rename those fields
to the shorter column labels above.

The stream covers form submission and confirmation cancellation, swap
creation, wallet connection and network switching, wallet prompts and user
rejections, transaction submission, input detection/confirmation, output
settlement, delays, failures, expiry/cancellation, refunds, retries, and flow
closure. A wallet rejection is recorded with `outcome="rejected"` and
`reason_code="user_rejected"`; it is not reported as an exception.

Pending steps also produce a non-terminal `suspected_stall` event after a
conservative stage-specific threshold. This is an investigation signal rather
than proof of failure: any later transition remains in the same journey.

### Importable Grafana dashboard

The repository includes a standalone lifecycle dashboard at
`grafana/swap-lifecycle-dashboard.json`. In Grafana, choose **Dashboards →
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

Cross-origin trace headers are opt-in because the destination must allow the
`traceparent` header in CORS. Supply comma-separated URL prefixes when the API
is ready for distributed trace correlation:

```yaml
NEXT_PUBLIC_FARO_TRACE_PROPAGATION_URLS: https://api.layerswap.io,https://api-dev.layerswap.cloud
```

Source maps are not uploaded by the build. The receiver is a self-hosted Alloy
`faro.receiver`, which resolves minified stacks from its own `sourcemaps`
configuration (downloaded from the site, or read from a filesystem `location`
keyed by release). Until that is configured, stored stacks refer to minified code.
