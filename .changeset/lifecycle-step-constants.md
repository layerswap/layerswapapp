---
'@layerswap/widget-types': minor
'@layerswap/widget': minor
---

Share lifecycle step categories and bound telemetry dedup state.

- `@layerswap/widget-types` exports `SWAP_LIFECYCLE_TRANSACTION_STEPS`, `SWAP_LIFECYCLE_REPEATABLE_STEPS` and `SWAP_LIFECYCLE_ATTEMPT_START_STEPS` alongside `SWAP_LIFECYCLE_PHASE_STEPS`, so consumers deduplicating `onSwapLifecycle` observations no longer keep private copies of these lists, and `createRandomId` for UUID generation with a fallback on platforms without `crypto.randomUUID`.
- The three category tuples are the source of truth for `SwapLifecycleStep`: the union is derived from `SwapLifecyclePhaseStep | SwapLifecycleTransactionStep | SwapLifecycleRepeatableStep` (each also exported), so a new step must be placed in exactly one category or the build fails. `SWAP_LIFECYCLE_ATTEMPT_START_STEPS` is typed as a subset of the repeatable steps.
- `@layerswap/widget-types` exports the shared dedupe primitive every consumer applies: `lifecycleObservationKey(event)` returns the per-swap slot an observation occupies (`'phase'` for phase steps, the step itself for transaction steps, `undefined` for repeatable steps, which are always delivered; type `SwapLifecycleObservationKey`) and `lifecycleObservationFingerprint(event)` returns what makes a slotted observation new (step, outcome, status, phase, reasonCode, occurrenceId and the four transaction hashes; never the swap id or enrichment such as addresses and confirmation counts). The host callback dedupe and `onTelemetry` in `@layerswap/widget` use them, as does the bridge's Faro recorder, so no consumer is stricter than the public `onSwapLifecycle` contract. The contract is specified by `packages/widget/types/tests/fixtures/lifecycle-sequences.json`, which every consumer's test suite replays.
- `@layerswap/widget/internal` exports `useClientLayoutEffect`.
- `onTelemetry` widget flow events start a new journey on every `form_submitted`: the previous swap id and its transfer, deposit and completion flags are cleared instead of leaking into the next swap submitted from the same form.
- Host callback deduplication keeps state for at most 64 recently observed swaps.
- `flow_closed` derives its outcome from the resolved UI phase instead of the raw API status, so closing a swap the Processing panel already shows as complete reports `succeeded` rather than `abandoned`; the event now also carries `phase`.
