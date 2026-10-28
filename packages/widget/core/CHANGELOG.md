# @layerswap/widget

## 2.6.0

### Minor Changes

- Add atomic approve-and-swap support for compatible EVM wallets, including WalletConnect. Discover wallet capabilities, submit approval and swap calls together, and track accepted or uncertain submissions without duplicate wallet requests.

  Add shared atomic batch types and prevent read-only WalletConnect capability and status requests from opening the wallet on mobile.

### Patch Changes

- Improve EVM gas estimates using deposit calldata and exact transaction values. Account for Monad gas fees and delegated-account reserves in Max and Adjust amounts, and resolve Hyperliquid fees when native token metadata is missing.
- Improve swap and withdrawal progress, loading transitions, retry handling, and recovery of pending submissions in swap history. Keep gasless preferences consistent through submission and reset them after a successful withdrawal.

  Keep connected wallets selected for extended deposits with insufficient balance, showing balance validation at the amount step.

- Updated dependencies
- Updated dependencies
  - @layerswap/widget-types@2.6.0
  - @layerswap/wallet-core@2.6.0
  - @layerswap/utils@2.6.0
  - @layerswap/ui-kit@2.6.0

## 2.5.1

### Minor Changes

- 2463dd2: Switch the wallet to the source chain from the send button instead of a separate step.
  - The standalone "Switch network" button on the wallet withdrawal step is gone. When the connected wallet reports a chain other than the swap's source chain (EVM and Fuel wallets), tapping the send button now asks the wallet to switch and continues to swap creation and the transaction or gasless signature prompt without another tap. A switch the wallet completes without asking shows nothing; if the wallet is still waiting after a second, the button reads "Switching network" with a "confirm in your wallet" message. Already-approved WalletConnect chains switch locally with no wallet prompt. Rejections and failures keep the button as "Try again" with the "Network switch failed" message.
  - `ChangeNetworkButton` is no longer exported from `@layerswap/widget/internal`.
  - Preview snapshots (`@layerswap/widget/internal`): `Page2WalletState` drops `{ kind: 'network' }`; the send state gains `networkSwitch` (`'pending' | 'rejected' | 'still-waiting' | 'timeout'`) rendered through the send button, and `ChangeNetworkView` is removed.
  - `onSwapLifecycle` still emits `network_switch_started`, `network_switched`, `network_switch_rejected` and `network_switch_failed`; their `path` is now `SendTransactionButton`.
  - The switch waits at most 60 seconds for the wallet, so an in-app browser that never answers a dismissed prompt no longer leaves the send flow stuck; the attempt is reported with `reasonCode: timeout`.
  - New `WalletErrorReasonCode` `request_pending` (`@layerswap/widget-types`), recognised by `normalizeWalletErrorCode` from EIP-1193 `-32002` and "already pending" / "already processing" messages. A second tap while the wallet still shows the switch prompt is reported as `network_switch_failed` with `reasonCode: request_pending` and tells the user to confirm the pending request in the wallet.
  - `@layerswap/wallet-fuel`: `switchChain` now rethrows after logging instead of swallowing the failure, so the send flow stops rather than transferring on the wrong network.

- - Add frontend swap workflows and live Min, 50%, and Max amount presets.
  - Improve swap progress, previews, slow-route warnings, and amount validation.
  - Fix retry handling, Hyperliquid withdrawal precision, TON wallet connections, and Pocket Universe compatibility.
  - Improve transaction summaries and balance diagnostics.

### Patch Changes

- 17f4123: Preserve network fee reserves when using Max and keep preset previews stable during fee refreshes. Do not report nonblocking gas warnings as blocked transfers.
- 18fc71c: Estimate gas with the connected source account's selected token balance while the transfer amount is empty. Use the entered amount once available and pass it through the detailed gas fee view.

  When no source wallet is connected, use the route maximum for the Max shortcut once available rather than a disconnected account's cached balance. Keep Max unavailable until that route maximum is known.

  Pass the transfer amount to EVM and Tron gas providers when building transactions.

  Keep Max usable for oversized or fractional amounts without spending the fee reserve.

- 0dffcd2: Keep native-token Max usable from a zero amount and convert Starknet gas estimation amounts to base units. Keep exchange withdrawal details from displaying an unrelated connected wallet's gas fee.
- 7427883: Preserve pending WalletConnect switch errors instead of reporting them as user rejections. Only unknown-chain errors trigger an add-chain request, and only genuine declines are wrapped as rejections.

  Show network-switch errors during critical-price-impact confirmation while keeping Continue anyway available for retry.

  WalletConnect: after adding an unknown chain, ask the wallet to switch to it unless it already did. Adding a chain does not select it (EIP-3085), so a resolved switch no longer leaves the wallet on the previous chain.

- a9c35f8: RPC health checks are now opt-in and scoped to the network being asked about.
  - `createEVMProvider` no longer adds the wallet RPC health check by default. Pass `rpcHealthCheckProviders: [new EVMRpcHealthCheckProvider()]` (now exported from `@layerswap/wallet-evm`) to keep the probe and the "add RPC" prompt.
  - The probe measures the wallet's active chain; its verdict now carries that `chainId`. `useRpcHealth(network)` reports unknown health while the wallet is on another chain, so an unhealthy RPC on the chain being left no longer replaces the send button that switches away from it.
  - `suggestRpcForCurrentChain` from `useRpcHealth(network)` now adds the RPC for `network`'s chain rather than the wallet's current chain.

- 419387b: Keep Solana's rent-exempt minimum when Max or Adjust amount is used on native SOL, so the transfer no longer leaves a sub-rent balance that fails wallet simulation. Gas estimates may now report a `reserve` that must stay in the account.
- 34da257: Show generic Starknet execution failures as wallet errors instead of user rejections. Preserve nested provider codes in lifecycle events and allowlisted RPC simulation/revert details in error reports, with bounded serialization. Expose the wallet-reported version when available for diagnostics.
- a2136b6: Match mobile wallet-request recovery to the WalletConnect session that received
  the request. Recorded requests now carry their session `topic`, and EVM and
  Solana WalletConnect wallets expose theirs as `Wallet.metadata.walletConnectTopic`.
  Wallets connected through the generic WalletConnect connector recover their
  requests, and another wallet app using the same account no longer does.

  Let users reopen the wallet's pending request without submitting it again.

  Show reconnect guidance when the wallet disconnects during source-network
  readiness, and report readiness failures that happen before a network switch.

- 78fa843: Keep RPC failures distinct from user cancellations when Viem wraps transaction
  errors with its unknown-error code (-1). Require actual user-rejection evidence
  and classify wallet RPC HTTP failures as network errors while preserving their
  original cause and diagnostic code.

  Show recovery guidance for network failures, RPC errors, disconnected wallets,
  pending requests, and timeouts before falling back to a generic swap error.
  For EVM network failures, direct users to check the source network's RPC settings
  in their wallet. Keep raw provider diagnostics in telemetry.

- a2136b6: Stop reporting wallet RPC failures relayed over WalletConnect as user rejections.
  MetaMask Mobile answers a failed request with CAIP-25 code 5000 and the failure
  as the message; when that text names a non-decline failure, classify by it.
  EVM network failures now tell users to select a working RPC URL in their
  wallet's network settings and remove the others.
- Updated dependencies [2463dd2]
- Updated dependencies
- Updated dependencies [a9c35f8]
- Updated dependencies [419387b]
- Updated dependencies [34da257]
- Updated dependencies [a2136b6]
- Updated dependencies [78fa843]
- Updated dependencies [a2136b6]
  - @layerswap/widget-types@2.5.1
  - @layerswap/wallet-core@2.5.1
  - @layerswap/ui-kit@2.5.1
  - @layerswap/utils@2.5.1

## 2.4.0

### Patch Changes

- Reduce repeated balance requests and report API failures consistently.
  - Keep failed EVM multicall results instead of immediately repeating each failed token balance request against the same RPC.
  - Report balance failures once per fetch through the balance resolver instead of emitting an additional error for every failed token.
  - Report unauthenticated API failures through the widget's `APIError` handler, matching authenticated requests. Expected transaction-status 404 responses and ignored API error codes remain excluded from reporting; request rejection and polling behavior are preserved.

- Keep Fuel account permissions current and send transactions through the selected connector.
  - Reconcile accounts on account, connection, and network changes; remove stale authorized addresses and prevent older synchronization results from overwriting newer wallet state.
  - Preserve the last known wallet during transient account queries. When only network resolution fails, retain cached network metadata while applying the confirmed account permissions.
  - Use the selected source address and connector, and check sender authorization before preparing and before sending the transaction.
  - Classify unauthorized senders as account mismatches with `reasonCode: 'unauthorized'`, and display the supplied authorization details in the widget.

- Expose shared Layerswap API contracts from `@layerswap/widget-types`.
  - Export `ApiError`, `LSAPIKnownErrorCode`, `ApiResponse`, and `EmptyApiResponse` so consumers can use API contracts without importing the widget runtime.
  - Update the widget to consume the shared contracts and retain its model re-exports.

- Fix the backdrop flash after wallet drawer exit animations by pinning Framer Motion to `12.34.5` in the UI kit and widget.
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @layerswap/widget-types@2.4.0
  - @layerswap/wallet-core@2.4.0
  - @layerswap/ui-kit@2.4.0
  - @layerswap/utils@2.4.0

## 2.3.1

### Patch Changes

- Fix widget loading failures when the host and CDN use different React versions by removing the React DOM server renderer from the browser bundle. Copy logo and symbol SVGs using browser serialization instead.
  - @layerswap/wallet-core@2.3.1
  - @layerswap/utils@2.3.1
  - @layerswap/ui-kit@2.3.1

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
