# Dashboard platform research

Date: 2026-09-09. Status: user accepted the staged evaluation approach. Native Grafana trial is next; final platform and view implementation remain subject to usability review.

## Evidence and boundaries

The local [checkpoint](faro-checkpoint-c.md) records Grafana 13.1.3. The [infrastructure audit](faro-infrastructure-audit.md) documents Faro → Alloy → Loki, with Grafana querying Loki. This research has not independently rechecked the current deployment, installed plugins, query performance, or access policies. The audience and any need for restricted support/customer access remain open.

The HTML view proposal uses synthetic data. Its usability does not establish that native Grafana can reproduce its interactions or that current telemetry can supply every field.

## Options and documented use cases

| Approach | Strongest fit for our proposed workflows | Engineering responsibility |
| --- | --- | --- |
| Native Grafana dashboards | Curated issue lists, filters, linked session investigations and raw-record inspection | Queries, transformations, layouts, navigation and validation |
| Custom Grafana app using Scenes | A guided investigation experience with domain-specific pages and interactions, within Grafana | React/plugin code, deployment, signing, compatibility and query behavior |
| Standalone application | A broader support portal combining telemetry with authoritative swap data, business permissions or operational actions | Application/backend, authentication and authorization, query handling and UI maintenance |
| Grafana Cloud Frontend Observability | Managed frontend monitoring with packaged session exploration | Evaluate product fit, data ingestion, access, cost and migration |

The fit and maintenance comparisons above are engineering judgments, not vendor performance guarantees.

Grafana's dashboard guidance recommends answering clear questions, reducing cognitive load and directing users from general views to specific investigations. It does not prescribe one large page. [Dashboard best practices](https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/best-practices/).

Version 13.1 supports tabs, rows and conditional visibility. Conditional visibility requires Auto grid, which constrains manual positioning. These features make native subviews plausible; they do not prove equivalence to a custom application. [Version-matched layout documentation](https://grafana.com/docs/grafana/v13.1/visualizations/dashboards/build-dashboards/create-dashboard/).

Native tables support cell inspection and links. Their pagination changes displayed rows, not the underlying query: it will not repair the existing bounded session query's omission of later records. [Table documentation](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/table/).

Scenes supports app pages and drilldowns. Grafana publishes a concrete Loki logs-app example using its query infrastructure, time controls and panels. This is a supported alternative when dashboard configuration cannot deliver the agreed workflow. It still requires a maintained plugin; private production deployment has signing requirements. [Scenes apps](https://grafana.com/developers/scenes/scene-app/), [Loki app tutorial](https://grafana.com/blog/create-a-logs-app-plugin-with-grafana-scenes-and-grafana-loki/), [plugin signing](https://grafana.com/developers/plugin-tools/publish-a-plugin/sign-a-plugin).

Grafana Cloud Frontend Observability already offers session lists, filters and session details containing events and errors. It is a relevant product benchmark; collecting with the open-source Faro SDK does not install that packaged Cloud experience in self-hosted Grafana. [Session workflow](https://grafana.com/docs/grafana-cloud/observe-and-act/monitor-applications/frontend-observability/visualize-data/sessions/), [OSS and Cloud comparison](https://grafana.com/docs/learning-hub/is-grafana-cloud-right-for-me/00-introduction/03-oss-compared-to-cloud/).

## Data access for a standalone UI

Recommended starting architecture for a Loki-focused standalone application:

```text
Browser → authenticated application backend → Loki query API
                                         ↘ swap API, if needed
Investigation → Grafana Explore link for deeper log analysis
```

Loki exposes supported range-query APIs. Grafana also exposes data-source query/proxy APIs, so querying through Grafana is possible when deliberately reusing that layer. It introduces Grafana API/data-source coupling and does not return the complete rendered dashboard experience. Choose the integration deliberately; do not scrape panels. [Loki API](https://grafana.com/docs/loki/latest/reference/loki-http-api/), [Grafana data-source API](https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/data_source/).

Keep service credentials on the server and enforce allowed scope, bounded queries and explicit incomplete-result handling there. Loki needs an authentication layer. Grafana dashboard visibility also is not a data-access boundary: by default, organization Viewers can query data sources beyond the queries shown on a dashboard. Restricted customer/support access requires a separate authorization assessment for either platform. [Loki authentication](https://grafana.com/docs/loki/latest/operations/authentication/), [Grafana data-source permissions](https://grafana.com/docs/grafana/latest/administration/data-source-management/).

## Recommendation and decision test

For internal, read-only investigation, first evaluate one native Grafana flow: issue → occurrence → journey timeline → event details → back. Include a separate wallet/swap lookup into the same investigation. Native tabs should be evaluated before assuming the existing long page is a platform limitation.

Accept native Grafana only if the agreed experience works: readable summaries, preserved search/filter context, selected-event focus, repeat attempts and recovery visible, useful raw details, and clear loading/empty/error/incomplete states. Measure actual query behavior with representative data before expanding.

If core interactions remain awkward, prefer a Grafana app with Scenes for an internal observability tool. Prefer a standalone app when broader support workflows, business access rules, external users, or product-specific actions justify owning an application. Consider the Cloud product if managed service adoption is acceptable.

All choices still require reliable occurrence grouping, journey reconstruction and complete enough queries. A new UI alone does not fix those data issues. Platform evaluation should follow approval of the required views, with usability as the acceptance criterion.

## Trial preparation and access

The user accepted this approach after reviewing the research. This acceptance is not a claim that native Grafana reproduces the HTML mockup.

Prepare a development trial with the following path and evidence:

| Step | Required visible behavior | Pass condition |
| --- | --- | --- |
| Issues → occurrence | Readable issue summary and matching occurrences | A reviewer can choose an occurrence without interpreting a hash |
| Occurrence → investigation | Selected session/journey with the chosen event in context | Earlier attempts and subsequent recovery remain discoverable |
| Investigation subviews | Timeline, Failures, Requests, Context | Tabs change the content without losing the selected investigation |
| Event details | Historical fields and raw record/stack when available | Missing context is explicit; exact evidence is accessible |
| Back to list | Original search, filters and time range | No manual reconstruction of the previous scope |
| Wallet/swap lookup | Matching sessions → same investigation | Lookup works independently of issue selection |
| Query boundaries | Loading, empty, failed and incomplete results | Empty results and omitted records cannot be mistaken for a complete healthy session |

Use representative existing telemetry where available. Label fixture-only behavior explicitly and record missing data separately from UI limitations. The trial should not imply semantic issue grouping or latest-journey reconstruction already exists.

Live browser access attempted on 2026-09-09: Grafana redirected to Microsoft account selection; the available work account was rejected as not belonging to the required organization. No dashboard was edited or saved. The alternative in-app browser was unavailable. Live layout and interaction verification require the user to sign in with an authorized account.

Subsequent API access using the user-provided token confirmed Grafana 13.1.3 and enabled native layouts. Four trial resources were prepared and their schema/data checks passed. The initial create request omitted Grafana's normal `grafana.app/grant-permissions: default` annotation, causing a 403 on reading the new entry. After correcting the request, the same unchanged token published all four working resources and verified their contents. See [native trial status and verification](dashboard-native-trial.md), including the inaccessible first draft. Browser acceptance remains pending; no additional token/folder permissions are required to use the corrected publication workflow.
