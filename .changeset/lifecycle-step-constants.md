---
'@layerswap/widget-types': minor
'@layerswap/widget': minor
---

Share lifecycle step categories and bound telemetry dedup state.

- `@layerswap/widget-types` exports `SWAP_LIFECYCLE_TRANSACTION_STEPS` and `SWAP_LIFECYCLE_ATTEMPT_START_STEPS` alongside `SWAP_LIFECYCLE_PHASE_STEPS`, so consumers deduplicating `onSwapLifecycle` observations no longer keep private copies of these lists, and `createRandomId` for UUID generation with a fallback on platforms without `crypto.randomUUID`.
- `@layerswap/widget/internal` exports `useClientLayoutEffect`.
- `onTelemetry` widget flow events start a new journey on every `form_submitted`: the previous swap id and its transfer, deposit and completion flags are cleared instead of leaking into the next swap submitted from the same form.
- Host callback deduplication keeps state for at most 64 recently observed swaps.
- `flow_closed` derives its outcome from the resolved UI phase instead of the raw API status, so closing a swap the Processing panel already shows as complete reports `succeeded` rather than `abandoned`; the event now also carries `phase`.
