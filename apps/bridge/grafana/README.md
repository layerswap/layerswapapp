# Frontend observability — current remaining work

Updated 2026-09-11. This is the current checklist; the checkpoint, audit and
proposal documents retain historical evidence and are not individually current
task lists. Replay and heatmaps are outside scope. Tempo is optional for the
requested speed, interaction, error and session monitoring.

| Order | Item | Current status / next acceptance check |
| --- | --- | --- |
| 1 | Deployment and release identity | Implemented locally; see below. Deploy the frontend and publish the generated dashboards, then verify the stored deployment field from a fresh session. |
| 2 | Lint | Resolve the missing ESLint plugin and run lint; the current Faro PR workflow does not run lint. |
| 3 | Total payload limits | Recommended hardening remains: choose and enforce total byte/field limits, preserve valid OTLP, expose truncation/drop counts, verify representative payloads. |
| 4 | CI and deployment | Run the workflow on GitHub and deploy the changes. Local test results do not establish either. |
| 5 | Browser acceptance | Verify new performance/behavior events, `transfer_blocked` reasons and normalized failure codes, and full swap flows; exercise navigation, restoration, multiple tabs, account/chain changes, cancellations, retries and transport failures. |
| 6 | Source-map resolution | Verify an error from the deployed minified build resolves to its original file and line at the receiver. |
| 7 | Dashboard acceptance | Publish the regenerated dashboards (new Transfer step tab and funnel stages are local only). Browser-test the latest layout, filter/navigation round trips, missing IDs, unusual text, query errors and record limits. Journey summary rows and older/newer cursor navigation are proposed additions, not completed features. |
| 8 | Alerts and production operation | Review thresholds/contact routing, provision and enable the paused rules; verify runtime retention/access and measure production ingestion volume and query cost. |
| Optional | Tempo correlation | The datasource-reference patch is prepared but unapplied. Verify production UIDs before applying it; verify browser/API trace propagation separately. |

## Item 1 — deployment and release identity

The build now derives `NEXT_PUBLIC_FARO_DEPLOYMENT` internally; no additional
manually configured Faro variable is required. It uses Vercel's target
environment (including custom targets), then Vercel's standard environment.
Both server and framework-prefixed platform variables are supported. A Next.js
development server is `local`; an optimized build with no platform identity is
`unknown`. API mode, a commit SHA, and `NODE_ENV=production` do not establish a
deployment environment.

Faro attaches this value to `meta.page.attributes.deployment_environment` using
the SDK's initial page metadata. Page ID/URL continue to follow navigation;
deployment metadata does not depend on persisted session, wallet or swap state.
Alloy's page-attribute mapping produces `page_attr_deployment_environment` in
Loki. The receiver mapping was checked in upstream source; this new field has
not yet been observed in the deployed receiver.

The native dashboards now have an independent **Deployment (blank = all)**
filter, carried through issue/session/event links and return navigation. Blank
includes old records; `unknown` includes records without deployment metadata.
The mainnet/testnet selector is removed from the native dashboards, including
its query restriction and links. They include both API modes; old bookmarked
`var-environment` values no longer silently restrict the results. API mode
remains in the raw telemetry records. The older dashboards and paused alert
definitions retain their existing API-mode scope until separately reviewed.
This API-mode removal was also saved on all four live development dashboards
through Grafana's code editor on September 11. The reported testnet swap's
selected failure and 235 session records were visible even with an old
`var-environment=mainnet` URL. See the [browser verification](fixtures/faro-api-mode-removal-browser-verification.json).
Tempo's standard deployment resource attribute has not been migrated; that is
part of optional tracing work, not a claim of this change.

Application `version` and `release` use the same resolved release identity as
the source-map uploader's default bundle ID. An explicit `FARO_BUNDLE_ID` still
works through the uploader's injected preamble, which the installed SDK reads.
Production acceptance still requires a real immutable build identity and the
receiver-side minified-error check; `unknown-release` is not a verified release.

Local checks: the workspace package build, bridge TypeScript check, 60 Faro
tests and 25 dashboard tests passed, including real SDK metadata snapshots and
source-map configuration wiring. These are deterministic
tests, not browser or live Loki verification. The four native dashboard JSON
files were regenerated locally. The Deployment-filter revision remains local;
only the subsequent API-mode removal was applied to the live dashboards. No
frontend deployment occurred.

Sources: [Vercel framework variables](https://vercel.com/docs/environment-variables/framework-environment-variables),
[Alloy metadata mapping](https://github.com/grafana/alloy/blob/main/internal/component/faro/receiver/internal/payload/payload.go).
For previously implemented capabilities and their limits, see
[performance and behavior status](performance-behavior-status.md) and
[native dashboard status](dashboard-native-trial.md).
