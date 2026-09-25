# @layerswap/widget

## 2.3.0

### Minor Changes

- 544d0d8: Deduplicate host callbacks and report wallet prompts on retry.
  - `onSwapStatusChange` reports actual backend transitions into `ls_transfer_pending`, `completed`, `failed`, and `expired`. Every status is observed before filtering. Existing swaps establish a silent baseline, including swaps opened during input processing; explicitly created swaps may report their first status. Wallet attempts, modal resets, component remounts, StrictMode replay and callback replacement do not repeat an unchanged backend status. UI phase changes and wallet retries remain on `onSwapLifecycle`. Backend history is bounded to the 64 most recently observed swaps per widget provider.
  - `onSwapLifecycle` deduplicates repeated phase and transaction observations caused by polling or effect replay. Actual retries, wallet prompts, new transactions, and phase recovery transitions remain observable.
  - Effect-driven phase and transaction observations are keyed on their observation fingerprint; the swap id, source address and confirmation counts arriving later no longer re-emit `awaiting_wallet_action`, `awaiting_user_deposit` or Processing phase steps.
  - Wallet transfer cancellations recognised by `isUserRejection` from `@layerswap/wallet-core/errors` (a decline the adapter declared with `userRejectedError`, or a definitive wallet decline code or message such as 4001, `ACTION_REJECTED`, viem `UserRejectedRequestError` or `USER_REFUSED_OP` anywhere in the error tree) are reported through `onSwapLifecycle` as `wallet_action_rejected` (`outcome: rejected`, `reasonCode: user_rejected`). A custom `TransferProvider` that only sets `name = 'TransactionRejected'` is reported as a failure through `onError` and `wallet_action_failed` (`reasonCode: unknown_error`), matching the `@layerswap/wallet-core` rule that labels never classify.
  - **Migration:** wallet cancellations no longer invoke `onError`; they arrive on `onSwapLifecycle` as `wallet_action_rejected`. Hosts that counted or displayed cancellations from `onError` should subscribe to `onSwapLifecycle` and filter on that step.
  - Stellar transaction-expiry retries emit a wallet prompt event for each wallet request; a failed refresh of the expired deposit action between the two requests is not reported as a wallet prompt or wallet action failure. `transfer_blocked` is reported only while the send button is replaced (`rpc_unhealthy`, `gasless_unavailable` at the transfer step), and `input_transaction_detected` once per input transaction hash. Unsupported-wallet telemetry waits for provider restoration.

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

### Patch Changes

- Updated dependencies [95d95a1]
- Updated dependencies [31d0d1f]
- Updated dependencies [5bd03c7]
- Updated dependencies [bdf46a0]
- Updated dependencies [f26c1e7]
- Updated dependencies [bdf46a0]
  - @layerswap/widget-types@2.3.0
  - @layerswap/wallet-core@2.3.0
  - @layerswap/utils@2.3.0
  - @layerswap/ui-kit@2.3.0

## 2.2.0

### Minor Changes

- Global improvements and bug fixes

### Patch Changes

- Updated dependencies
  - @layerswap/ui-kit@2.2.0
  - @layerswap/utils@2.2.0
  - @layerswap/wallet-core@2.2.0
  - @layerswap/widget-types@2.2.0

## 2.1.0

### Minor Changes

- Global fixes and improvements

### Patch Changes

- Updated dependencies
  - @layerswap/ui-kit@2.1.0
  - @layerswap/utils@2.1.0
  - @layerswap/wallet-core@2.1.0
  - @layerswap/widget-types@2.1.0

## 2.0.1

### Patch Changes

- Wallet connection readiness fixes
- Updated dependencies
  - @layerswap/ui-kit@2.0.1
  - @layerswap/utils@2.0.1
  - @layerswap/wallet-core@2.0.1
  - @layerswap/widget-types@1.0.1

## 2.0.0

### Major Changes

- 3e34e07: Widget 2.0 — the widget is now a family of packages with a hardened embedding story.

  **Breaking changes**
  - `NetworkType` and `NetworkWithTokens` are no longer exported from the package root — import them from the new `@layerswap/widget-types` package. Shared models (`Wallet`, `InternalConnector`, network/route models, theme types, `SwapStatus`, `WidgetConfig`) now live in `@layerswap/widget-types`; the `@layerswap/widget/types` subpath keeps re-exporting wallet contracts for backward compatibility.
  - `Wallet.icon` and `InternalConnector.icon` are now URL / `data:` URI strings instead of React components.
  - The `MultiStepTransfer` types were removed from the `./types` subpath.
  - `LayerswapWidgetConfig` is now a refinement of the public `WidgetConfig` contract from `@layerswap/widget-types`. `walletProviders` accepts lazy `WalletProviderDescriptor`s alongside eager providers — descriptors defer each chain SDK until the connect modal opens.
  - `config.walletConnect`, `config.imtblPassport`, and `config.tonConfigs` are deprecated — pass them to the wallet provider factories (or `walletDefaults` in the loader packages) instead.
  - Only one live `LayerswapProvider` per page is supported; a second concurrent instance renders an explicit failure instead of silently sharing global state.

  **New**
  - New sibling packages: `@layerswap/widget-react` (CDN-delivered widget runtime via Module Federation — signed manifest, kill switch, per-chunk SRI verification, channel releases; the widget and its dependencies never enter the host bundle), `@layerswap/widget-js` (framework-agnostic loader that mounts the widget into any DOM element), and `@layerswap/widget-types` (shared TypeScript contracts).
  - `walletProvidersConfig.include` / `walletProvidersConfig.exclude` — allowlist or blocklist wallet ecosystems by `WalletProviderId`.
  - `config.apiUri` for pointing the widget at a custom API endpoint.
  - Gasless routes are reflected in quote and limits calculations; the destination address is now passed to quote and limits fetching.
  - Adaptive burst-and-decay polling for swap status.
  - Layered extended-route feature flags (Hyperliquid, Polymarket) with an explicit per-provider fail direction; Polymarket relay submissions are validated before spending builder auth.
  - Collapsible multi-account wallet list, wallet icons for saved-address picks, and swap-history filtering (capped at 6 wallet addresses).
  - Theme overrides for the portal, wide version, and "Powered by" visibility.
  - `PRICE_IMPACT_TOO_HIGH` is surfaced as its own error instead of "Rate not available".

  **Fixed**
  - The wallet list is gated behind a skeleton until providers hydrate, and persisted wallet sessions hydrate lazy providers on startup — no more refresh flicker or premature "no wallet" states.
  - The deposit flow starts on the correct step from first render, and the deposit-method default waits for wallet-provider readiness.
  - Popovers and modals default to the `#widget` container, making portal-based embedding safe.
  - Fixed a crash when selecting a manually-added destination address, refund transaction details display, rejected QR connection attempts, and async init failures being swallowed.

### Patch Changes

- Updated dependencies [3e34e07]
- Updated dependencies [3e34e07]
- Updated dependencies [3e34e07]
  - @layerswap/utils@2.0.0
  - @layerswap/wallet-core@2.0.0
  - @layerswap/ui-kit@2.0.0
  - @layerswap/widget-types@1.0.0

## 1.7.0

### Minor Changes

- Add Polymarket withdrawal

### Patch Changes

- Updated dependencies
  - @layerswap/utils@1.7.0

## 1.6.0

### Minor Changes

- Added gasless transactions

### Patch Changes

- Updated dependencies
  - @layerswap/utils@1.6.0

## 1.5.0

### Minor Changes

- Add Deposit from Hyperliquid option

### Patch Changes

- Updated dependencies
  - @layerswap/utils@1.5.0

## 1.4.0

### Minor Changes

- Add Deposit widget

### Patch Changes

- Updated dependencies
  - @layerswap/utils@1.4.0

## 1.2.2

### Patch Changes

- Minor bug fixes and improvements

## 1.2.0

### Minor Changes

- Fix issues related to React 19, and implement global UX improvements

## 1.1.5

### Patch Changes

- Minor bug fixes and improvements

## 1.1.4

### Patch Changes

- Minor bug fixes and improvements

## 1.1.3

### Patch Changes

- Fix modal overlay

## 1.1.2

### Patch Changes

- Modal and loading minor style fixes

## 1.1.1

### Patch Changes

- Minor bug fixes and improvements
