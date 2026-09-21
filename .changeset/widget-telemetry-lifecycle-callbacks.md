---
'@layerswap/widget-types': minor
'@layerswap/widget': minor
---

Add `onSwapLifecycle` and `onTelemetry` host callbacks and share their event contracts.

- `onSwapLifecycle` reports swap journey steps (form submission, swap creation, wallet connection, wallet prompts, rejections and failures, submitted transactions, phase changes, flow close) as `SwapLifecycleEvent`, with `stage`, `outcome` and `reasonCode`.
- `onTelemetry` is an optional, vendor-neutral analytics sink. It receives versioned `WidgetTelemetryEvent` payloads (`widget_flow`, `widget_interaction`, `widget_operation`) with primitive-only attributes, including operation outcomes and durations for quotes, limits, swap creation, deposit actions, balance and gas lookups, wallet connection, wallet transfers and gasless authorization.
- `@layerswap/widget-types` exports the event contracts: `SwapLifecycleEvent`, `SwapLifecycleStep`, `SwapLifecycleStage`, `SwapLifecycleOutcome`, `SWAP_LIFECYCLE_PHASE_STEPS`, `TransferBlockedReasonCode`, `WalletErrorReasonCode`, `CallbackError`, `WidgetTelemetryEvent`, `WidgetTelemetryHandler`, `WidgetTelemetryAttributes`, `WidgetTelemetryData`, `WidgetFlowStep`, `WidgetOperation` and `WidgetOperationOutcome`.
- `WidgetCallbacks` is now typed against those contracts: `onError` receives `ErrorEventType` and `onSwapStatusChange` receives `SwapStatusEvent` instead of `unknown`. Hosts whose handlers declared an incompatible parameter type need to update the annotation.
- `setErrorLogger` wraps the host logger with `createSafeErrorLogger`: a throwing or recursive `onError` handler falls back to console logging instead of breaking the widget. `createSafeErrorLogger`, `defaultErrorLogger`, `reportErrorLoggerFailure` and the `ErrorLogger` type are exported.
- Error events carry an `occurrenceId` (`getErrorOccurrenceId`) so the same error reported through several paths can be correlated, and keep the non-enumerable `name`, `message`, `stack` and `cause` fields of native errors.
