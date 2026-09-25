# @layerswap/widget-types

## 2.3.0

### Minor Changes

- 95d95a1: Report gasless authorization API failures as their own lifecycle step.
  - New repeatable `onSwapLifecycle` step `gasless_authorization_failed` (stage `input_transfer`, outcome `failed`, action `authorize_deposit`). It is emitted when Layerswap's API refuses a signed gasless authorization, or when refreshing an expired authorization fails (`reasonCode: 'deposit_action_refresh_failed'`). These were previously reported as `wallet_action_failed`, which is now reserved for wallet signing failures. An exhaustive `switch` over `SwapLifecycleStep` needs a case for it.
  - The re-sign after an expired gasless authorization now emits its own `wallet_prompt_opened`, so every wallet request has one.
  - When gasless is marked unavailable (and the retry or switch-to-standard options are offered) is unchanged.

- 31d0d1f: Share lifecycle step categories and bound telemetry dedup state.
  - `@layerswap/widget-types` exports `SWAP_LIFECYCLE_TRANSACTION_STEPS`, `SWAP_LIFECYCLE_REPEATABLE_STEPS`, `SWAP_LIFECYCLE_ATTEMPT_START_STEPS` and `SWAP_LIFECYCLE_TRACKING_STEPS` (steps that show a swap being watched before its outcome, as opposed to opened from a URL or history) alongside `SWAP_LIFECYCLE_PHASE_STEPS`, so consumers deduplicating `onSwapLifecycle` observations no longer keep private copies of these lists, and `createRandomId` for UUID generation with a fallback on platforms without `crypto.randomUUID`.
  - The three category tuples are the source of truth for `SwapLifecycleStep`: the union is derived from `SwapLifecyclePhaseStep | SwapLifecycleTransactionStep | SwapLifecycleRepeatableStep` (each also exported), so a new step must be placed in exactly one category or the build fails. `SWAP_LIFECYCLE_ATTEMPT_START_STEPS` is typed as a subset of the repeatable steps.
  - `@layerswap/widget-types` exports the shared dedupe primitive every consumer applies: `lifecycleObservationKey(event)` returns the per-swap slot an observation occupies (`'phase'` for phase steps, the step itself for transaction steps, `undefined` for repeatable steps, which are always delivered; type `SwapLifecycleObservationKey`) and `lifecycleObservationFingerprint(event)` returns what makes a slotted observation new (step, outcome, status, phase, reasonCode, occurrenceId and the four transaction hashes; never the swap id or enrichment such as addresses and confirmation counts). The host callback dedupe and `onTelemetry` in `@layerswap/widget` use them, as does the bridge's Faro recorder, so no consumer is stricter than the public `onSwapLifecycle` contract. The contract is specified by `packages/widget/types/tests/fixtures/lifecycle-sequences.json`, which every consumer's test suite replays.
  - `@layerswap/widget/internal` exports `useClientLayoutEffect`.
  - `onTelemetry` widget flow events start a new journey on every `form_submitted`: the previous swap id and its transfer, deposit and completion flags are cleared instead of leaking into the next swap submitted from the same form.
  - Host callback deduplication keeps state for at most 64 recently observed swaps.
  - `flow_closed` derives its outcome from the same resolved status the Processing panel renders instead of the raw API status, including client-detected input failures (gasless authorization expired/insufficient/rejected, or a failed input transaction), so closing after "Transfer complete" reports `succeeded` and closing after "Transfer failed" reports `failed` with the failure reason code (the same `reasonCode` as the preceding `swap_failed` row) rather than `abandoned`; closing after a completed refund reports the new `SwapLifecycleOutcome` `refunded` (reason code: the swap's fail reason, else `refunded_flow_closed`) instead of `succeeded`; the event now also carries `phase`. The resolved status is computed once in `SwapDataProvider` and read by every consumer through the parameterless `useResolvedSwapStatus()`, so the panel, the retry controls and the lifecycle report cannot disagree.

- 5bd03c7: Separate internal errors from public reports and backend observation from UI state.

  **Migration:** `onError` and `setErrorLogger` receive allowlisted data. `cause` is an
  `ErrorSummary`, and response payloads expose only server error codes/messages.
  Hosts reading arbitrary response properties or Axios/provider internals must use
  the summary fields. Internal producers use `ErrorReportInput` and can still pass
  original errors to `ErrorHandler`; thrown errors and retry classification are unchanged.
  Provider/RPC URLs are reduced to scheme and host; Layerswap API routes keep their path.

  `setErrorLogger(logger)` only replaces the destination. Reason classification on the
  original error is registered separately with `setErrorClassifier`, so replacing the
  logger cannot drop it. Engine-owned error getters (`DOMException` name/message/code,
  prototype `stack` accessors) are read; other accessors are never invoked.

  Backend status callbacks now come from the swap provider and observe every status
  before notification filtering. Existing swaps establish a silent baseline. Wallet
  retries and modal resets never repeat an unchanged API status; use `onSwapLifecycle`
  for wallet attempts. Notification `path` is now `SwapDataProvider`.

  Polling uses backend status and settlement data, independently of local transfer
  failure or gasless expiry. Completed swaps keep polling until output/refuel details
  arrive. Early UI completion cannot suppress the final backend status transition.

- bdf46a0: Add `onSwapLifecycle` and `onTelemetry` host callbacks and share their event contracts.
  - `onSwapLifecycle` reports swap journey steps (form submission, swap creation, wallet connection, wallet prompts, rejections and failures, submitted transactions, phase changes, flow close) as `SwapLifecycleEvent`, with `stage`, `outcome` and `reasonCode`.
  - `onTelemetry` is an optional, vendor-neutral analytics sink. It receives versioned `WidgetTelemetryEvent` payloads (`widget_flow`, `widget_interaction`, `widget_operation`) with primitive-only attributes, including operation outcomes and durations for quotes, limits, swap creation, deposit actions, balance and gas lookups, wallet connection, wallet transfers and gasless authorization.
  - The deposit widget (`LayerswapDepositWidget` / `mountDepositWidget`) now reports its journeys too: `form_submitted` on `onSwapLifecycle` (`action: 'auto'` for the deposit-address method, including a prefetched swap handed over at mount with `path: 'DepositPrefetchProvider'`; `action: 'continue'` for the wallet method) and `widget_flow` events with `form_mode` `deposit-widget-address` / `deposit-widget-wallet`. Every `widget_flow` event carries `form_mode` (also `cross-chain`, `exchange`, `deposit-address` for the swap widget tabs). The `form_edited` interaction is no longer emitted without a mounted form, so it can never fire once per keystroke.
  - `@layerswap/widget-types` exports the event contracts: `SwapLifecycleEvent`, `SwapLifecycleStep`, `SwapLifecycleStage`, `SwapLifecycleOutcome`, `SWAP_LIFECYCLE_PHASE_STEPS`, `TransferBlockedReasonCode`, `WalletErrorReasonCode`, `CallbackError`, `SideEffectError`, `WidgetTelemetryEvent`, `WidgetTelemetryHandler`, `WidgetTelemetryAttributes`, `WidgetTelemetryData`, `WidgetFlowStep`, `WidgetOperation` and `WidgetOperationOutcome`.
  - `swap_created` and `swap_creation_failed` are mutually exclusive per creation attempt; `swap_creation_failed` means no swap id was obtained. Failures of post-creation side effects (extended-route record, recent-routes persistence, `onSwapCreate`) are reported to `onError` as the new `SideEffectError` (`operation`, `swapId`) and do not reject swap creation. `CallbackError` and `SideEffectError` are new members of `ErrorEventType`; an exhaustive `switch (event.type)` over it needs cases for them. The in-widget gasless-unavailable prompt after creation is set only when the API refused a `use_gasless` request, not for pre-request failures or an id-less response.
  - `WidgetCallbacks` is now typed against those contracts: `onError` receives `ErrorEventType` and `onSwapStatusChange` receives `SwapStatusEvent` instead of `unknown`. Existing handlers keep compiling (a handler that accepted `unknown` accepts the narrower event) and can now drop their casts.
  - `setErrorLogger` wraps the host logger with `createSafeErrorLogger`: a throwing or recursive `onError` handler falls back to console logging instead of breaking the widget. `createSafeErrorLogger`, `defaultErrorLogger`, `reportErrorLoggerFailure` and the `ErrorLogger` type are exported.
  - Error events carry an `occurrenceId` (`getErrorOccurrenceId`) so the same error reported through several paths can be correlated, and retain diagnostic name, message and stack as data. Every error passes through the shared reporting boundary: `cause` becomes an allowlisted, bounded summary and response bodies contribute only error codes/messages. URLs omit query, fragment and userinfo, and provider/RPC URLs (including those inside messages) are reduced to scheme and host; raw HTTP/provider errors, request headers and bodies never reach host loggers; its `occurrenceId` matches the `swap_creation_failed` lifecycle event of the same failure.

## 2.2.0

### Minor Changes

- Global improvements and bug fixes

## 2.1.0

### Minor Changes

- Global fixes and improvements

## 2.0.1

### Major Changes

- Wallet connection readiness fixes

## 1.0.0

### Major Changes

- 3e34e07: Initial public release — shared TypeScript contracts for the Layerswap widget and wallet packages, extracted from `@layerswap/widget` and `@layerswap/utils`.

  Includes the integrator-facing config contracts (`WidgetConfig`, `WidgetCallbacks`, `WidgetProps`, `WalletDefaults`, `WalletProviderId`), network and route models (`NetworkType`, `Network`, `NetworkWithTokens`, `Token`, `NetworkRoute`), wallet models (`Wallet`, `InternalConnector`, `WalletConnectConfig`), theme types (`ThemeData`, `ThemeColor`, `StatusColor`), `SwapStatus`, error/event types, and the balance/gas/contract resolver contracts. Framework-agnostic by construction — the package carries no dependency on React.
