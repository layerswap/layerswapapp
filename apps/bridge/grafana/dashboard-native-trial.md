# Native Grafana usability trial

Date: 2026-09-10. Status: all four trial dashboards published and readback verified. Final design/platform acceptance remains open.

2026-09-11 update: the mainnet/testnet selector and query restriction were
removed from all four live dashboards and the generator. The separate
Deployment filter exists in the generated files but is not yet published.
See the [current checklist](README.md) and [browser verification](fixtures/faro-api-mode-removal-browser-verification.json).

The initial creation request omitted `metadata.annotations["grafana.app/grant-permissions"] = "default"`. Grafana's [native V2 save implementation](https://github.com/grafana/grafana/blob/main/public/app/features/dashboard/api/v2.ts) supplies this annotation. Without it, creation succeeded but the new resource did not receive the normal access grants: reading it returned HTTP 403 requiring `dashboards:read`. The token's existing edit permissions were not the underlying problem.

The builder now requests the normal default grants. The same unchanged token successfully created and read the corrected resources, including all layouts, queries, variables and links. Existing dashboards' resource versions remain unchanged. The first inaccessible draft, `layerswap-faro-trial-views`, still exists; its metadata repair returned 403, so the working entry uses `layerswap-faro-trial-home`. Removing the inaccessible first draft requires an administrator. No organization/service-account permissions were changed, and the earlier request to grant the token additional folder access is withdrawn.

## Open and try

Entry URL: https://grafana-2.dev.lb.layerswap.cloud/d/layerswap-faro-trial-home

The entry dashboard has native **Issues**, **Recent failures**, **Journeys**, **Session lookup**, and **Diagnostics** tabs. The generated version defaults to the last seven days, the `layerswap-frontend` application, both API modes and all deployments/releases (blank Deployment/Release). Data comes from the existing development Loki data source; no synthetic data was ingested for this trial.

Issues now defaults to **all unexpected errors**, including diagnostics. Use **Issues category** to focus the list and **Test errors** to include, exclude or show only known controlled errors. The category and test columns make those distinctions visible; Unclassified does not claim user impact. The verified sample has 7 groups (33 records), or 5 groups (31 records) with tests excluded. The compact status row describes data coverage within the selected range. Interpretation details are in panel tooltips.

1. In Issues, select a readable summary, then an occurrence. The shared session investigation opens around that occurrence.
2. Inspect Timeline, Failures, Requests and Context. Expand the selected occurrence, or select a timeline activity for the separate event-details view.
3. Use **Back to results** to restore the entry tab, original time range, search and filters. Use **Original session range** to expand the investigation to the original results range.
4. In Session lookup, enter a wallet address, swap ID, session ID or journey ID. It searches exact values and historical wallet associations independently of error selection.
5. In Journeys, select a journey to narrow the same investigation. Clear Journey, or use **All journeys in this session**, to include other journeys.
6. In Transfer step, read the journey counts left to right: reached the send button, wallet prompted, transaction submitted, blocked, failed, declined without submitting, declined twice or more, and no wallet-step activity. The reasons table groups blocked and failed journeys by normalized reason, source network and wallet; the newest-events and suspected-stall tables open the session timeline. Counts are journeys, not records, and a journey can appear in several columns. New `transfer_blocked` records and normalized reason codes require a frontend deployment before they appear.

The browser still requires normal Grafana sign-in. The service token authorizes API work; it does not create a browser login.

## Transfer step tab and alerts (2026-09-11)

The **Transfer step** tab answers whether users who reached the send button got a transaction out and, if not, what stopped them. It is built from journey identity over `awaiting_wallet_action`, `wallet_prompt_opened`, `transfer_blocked`, wallet-stage failed/rejected steps, `transaction_submitted`/`gasless_authorization_submitted` and `suspected_stall`; set differences (`unless`) isolate declined-only and quiet journeys. The Behavior funnel gained **Wallet prompted** and **Transaction submitted** stages from the new `transfer_prompted`/`transfer_submitted` flow flags; deposit-address visits skip them. Two paused rules were added to the alert file: blocked-or-failed share above 30% of journeys reaching the step in 30 minutes (evaluated only from five journeys), and journeys reaching the step for two hours with no submission at all. Generated locally and covered by `tests/native-trial.test.py`; not yet published or browser-verified.

## What changed from the previous dashboards

- Navigation separates entry lists, occurrences, investigation and raw details instead of placing every panel on one long page.
- Issues use type plus a normalized message heading (version 2). Changing provider argument blocks, common address formats and amounts no longer create an exact-message group each. The full original message remains in the occurrence/detail views. Rows distinguish release, category and test status; diagnostic groups appear in the main list as well as their focused tab.
- Occurrence links open a ten-minute **stored-time** window and retain the original range separately for return navigation. Browser event timestamps are shown in the rows; replay and delayed delivery can make these clocks differ.
- Timeline returns the newest 1,000 records and displays them chronologically. A separate aggregate count exposes whether older records may be omitted. The selected occurrence also has its own query/panel.
- Native tables extract the parsed `labels` objects returned by Loki. They do not generate display JSON with Go `printf %q`.
- Text query inputs are percent-encoded, then decoded inside a LogQL template. Quotes, backslashes, backticks and control characters cannot terminate the template literal.
- The original dashboards remain unchanged. The subsequent issue-quality fixes also change frontend logging; those code changes require an application deployment.

## Issue-quality improvements

See [the eight-point implementation report](issue-improvements.md) and [updated verification](fixtures/faro-issue-improvements-verification.json). Issues and Diagnostics now show release, affected sessions, first/last stored time within the selected range and observation counts. The issue detail view adds an hourly trend. A group row selects its release; Back to results restores the original release filter. Issues also shows the latest stored telemetry timestamp and observed session volume independently of the error search. No-data is not rendered as healthy.

Recent failures and session Failures show explicit failed lifecycle outcomes, excluding generic flow errors. New linked observations collapse by session plus occurrence ID; the timeline retains the supporting exception/API/diagnostic records. Counts do not claim failed swaps. The checked legacy sample contains no qualifying explicit operation failures, so these tables are empty while Issues and Diagnostics remain populated.

## Verification and limits

The **original** [sanitized verification report](fixtures/faro-native-trial-verification.json) records schema dry runs and live queries. The checked range returned 34 exceptions, 29 candidate groups and 36 lifecycle events. One selected occurrence returned one raw record; the sampled session returned 643 records, matching its independent aggregate count. Its focused window retained the selected marker. Wallet, swap, journey and session lookups found their sampled sessions; blank/missing and adversarially quoted search inputs returned empty as expected. A request sample returned three recorded HTTP mirrors.

Eight local tests verify original-range restoration, encoded values, resetting stale lookup selections, exact nanosecond event links, retaining readable cell text and requesting Grafana's default creation grants:

```bash
python3 apps/bridge/grafana/tests/native-trial.test.py
```

**September 9 signed-in browser verification is available** in the issue-improvement report. It caught and corrected native Loki metric-table handling, the hidden-field property, wide columns, overly tall provider-message rows, rounded nanosecond selectors and tab-return names. The September 10 compact layout and visibility/filter revision has [separate API verification](fixtures/faro-overview-visibility-verification.json); browser setup currently fails, so it has no new visual/click-through acceptance. These checks do not establish production-scale performance.

Remaining design/data questions:

- Grouping is a normalized-message heuristic, not verified source-frame/root-cause attribution. Explicit occurrence IDs collapse linked failure observations after the frontend changes are deployed; historical records cannot be reliably reconstructed into incidents.
- Journeys currently shows lifecycle events, not an authoritative latest-state row per journey. Outcome-oriented journey subviews remain outside this bounded trial.
- Timeline pagination operates only on the returned 1,000 records. There is no older/newer cursor control; narrow the range and inspect the visible count.
- Context shows the newest 20 historical snapshots. Requests shows recorded mirrors, not all network activity or proven error causes.
- Query aggregation and latency still need representative production-scale testing. The verification range is development evidence.
- Empty/error/partial-result presentation still needs visual review. No conditional-panel behavior is claimed as verified.
- Changing scope controls can leave a selected identity with no matching data; automatic selection reset on every scope change is not implemented.

## Files and regeneration

`build-native-trial.py` builds four standalone V2 dashboard resources without accessing the network or reading credentials:

```bash
python3 apps/bridge/grafana/build-native-trial.py
```

Resources: `layerswap-faro-trial-home.json`, `layerswap-faro-trial-issue.json`, `layerswap-faro-trial-session.json`, and `layerswap-faro-trial-event.json`. They target the development Loki data source and have separate UIDs from the previous dashboards.

The live instance confirmed Grafana 13.1.3, the V2 dashboard API and native-layout feature support. The exact schema was read from its OpenAPI endpoint. Native parsed-label extraction follows Grafana's own [Explore table implementation](https://github.com/grafana/grafana/blob/main/public/app/features/explore/Logs/LogsTable.tsx); static tab links use the `dtab` mechanism illustrated in Grafana's [tab-link issue](https://github.com/grafana/grafana/issues/120022).
