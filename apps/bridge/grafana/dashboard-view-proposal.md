# Dashboard views — proposal for approval

Status: **Design proposal; not approved or implemented in Grafana.**

This supersedes the implementation-first ordering in the logging review. Agree on a useful investigation experience first; then identify and implement the data and logging changes it needs.

## Purpose

An engineer or support operator should be able to find a recurring problem or a particular user's activity, understand the sequence of events, and distinguish a failed operation, an expected user decision, and a later recovery.

Proposed default: **Issues**. Journeys and Session lookup remain equally direct entry points. The landing view can change after reviewing the design; it does not change the shared investigation model.

## View hierarchy

```text
Issues
  Grouped issues
    Issue details: affected journeys + individual occurrences
      Shared investigation, focused on the selected occurrence
  Recent failures
    Shared investigation, focused on the selected occurrence

Journeys
  All
  Failure last observed
  Awaiting user
  Completion observed
    Shared investigation, focused on the selected journey

Session lookup
  Wallet / swap / session / journey search
    Matching sessions
      Shared investigation, initially showing all journeys in that session

Shared investigation
  Timeline
    Selected event details
      Raw record / stack where available
  Failures
  Requests
  Context
```

These are navigation destinations and subviews; the platform is not selected. Native Grafana tabs and linked dashboards, a Grafana app plugin, and a standalone application are implementation candidates. See [dashboard platform research](dashboard-platform-research.md) for the evidence and proposed usability trial. Exact provisioning/layout decisions follow view approval.

## 1. Issues

**Question:** What problems recur, and which sessions should I inspect?

Default table: readable issue summary, operation, affected recorded sessions, observation count, latest occurrence. Sort by affected sessions, then observations. An exception class/hash belongs in grouping details rather than being the primary title.

Two subviews:

- **Grouped issues:** scan recurring problems, select one, then see affected journeys and example occurrences.
- **Recent failures:** inspect chronological observations immediately, including a newly appearing failure whose grouping is not useful yet.

An issue detail should show whether affected journeys later progressed, while retaining the original failure occurrence. A recovered RPC problem remains discoverable. A retry is not automatically a new issue group. A user's explicit wallet decline is an expected outcome in the journey timeline, not automatically an application incident.

The prototype's readable grouping is a proposal, not a claim that the current exception type/hash implements semantic issue grouping. An occurrence must eventually have an explicit counting rule so a lifecycle event plus its exception do not silently count as two independent incidents. Approval of the view does not approve a particular grouping algorithm.

## 2. Journeys

**Question:** What happened to a particular swap attempt, even if there is no exception?

Default table: route and amount, journey ID, last observed activity, wallet/swap identity, last activity time. Provide outcome-oriented subviews for failures, waiting for user action, and observed completion.

Use “Last observed” consistently. Waiting without a subsequent record does not prove a user is stuck or has abandoned a swap. Closing the UI does not prove backend cancellation. A transaction failure does not imply the swap can never recover.

The same session can have multiple journeys; the same swap can be revisited in another browser journey. The journey list must make the unit visible. A future backend swap-history view can link to this investigation, but backend settlement monitoring is not implied by a browser journey list.

For the first version, show actual observed outcomes. Automatic friction scores, rage-click detection and inferred abandonment are outside this proposal.

## 3. Session lookup

**Question:** A user provided a wallet address or swap ID; what can we see about their experience?

One search input supports wallet, swap ID, session ID and journey ID. Return matching sessions with their wallet context, journey count, failure observations and last seen time. Include sessions with no exceptions. Historical wallet association should remain searchable after disconnect/account replacement.

Opening a session shows all its journeys first; selecting a journey narrows the investigation. A lookup must not inherit hidden issue filters. Preserve the original lookup when navigating back.

The prototype uses artificial identifiers such as `wallet-demo-c` and `swap-demo-103`. Search and navigation operate locally on example records.

## Shared investigation

**Question:** What happened before and after this observation, and what evidence supports that explanation?

Persistent context: session, selected journey or all journeys, relevant route/amount, wallet/connector and swap ID where known. Environment, API mode, release and time belong to the surrounding scope controls. Values may be unavailable; show that explicitly.

| Subview | Primary content | Selection behavior |
| --- | --- | --- |
| Timeline | Human-readable actions and outcomes in order, including attempts, declines and recoveries | Select an event for details; toggle all signals to include background records |
| Failures | Failure observations within the selected session/journey | Open the same event details; preserve access back to surrounding timeline |
| Requests | Recorded requests, status, duration and URL | Inspect a request; proximity to an error is context rather than proof of causality |
| Context | Wallet, route, swap, browser/build and available session metadata | Clearly distinguish current/latest context from the selected event's historical snapshot |

The clickable proposal demonstrates time, activity, operation and outcome directly on the timeline. Additional fields expand with the selected event, avoiding a wide table of usually empty identifiers. Request duration appears in request details; missing operation duration remains absent.

Opening an occurrence should land near it, with enough preceding and subsequent activity to understand the sequence. The implementation should query around its stored timestamp, highlight it and expose older/newer activity. Preserve the overview's original range when going back. Use an explicit visible bound/limit notice when records may be omitted.

## Example stories used to judge the design

All data in the clickable proposal is illustrative. These are design scenarios rather than captured production behavior.

1. **RPC failure followed by recovery:** issue → affected journey → unhealthy RPC warning → submitted transaction → observed completion.
2. **Repeated transaction failure:** issue → occurrence on attempt 2 → timeline containing attempts 1 and 2 → another journey in the same session that later completes.
3. **Failure before swap creation:** balance lookup issue → journey with no swap ID → provider request details.
4. **User declined the wallet prompt:** Journeys → awaiting user → declined request → pending action, with no fabricated exception.
5. **Support lookup:** search `swap-demo-103` or `wallet-demo-c` → matching session → both journeys → select a specific attempt.

## Usability acceptance before implementation expansion

- Find a recurring problem without interpreting a hash or exception class.
- Reach an occurrence's timeline in two selections from the grouped issue list.
- Find a session by wallet/swap without first selecting an error.
- Tell a repeat attempt from a duplicate record.
- See recovery after an error and another journey in the same session.
- Investigate an expected decline without labeling the session broken.
- Inspect exact event context and a stack/raw record where available.
- Return to the prior list with its filters and search preserved.
- Distinguish empty results, a query failure, incomplete coverage and missing context.
- Keep the view readable without exposing 19 columns at once.

## Scope of design approval

Approval should settle the top-level entry points, the shared investigation subviews, the default landing view, and whether these example stories are easy to follow. It does not authorize publication or claim the required data transformations already exist.

After that approval, map each visible field and behavior to existing telemetry, identify the minimum missing data/queries, and build the agreed views. Instrumentation changes should follow the approved experience rather than determine its navigation.
