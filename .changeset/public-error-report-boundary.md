---
'@layerswap/widget-types': minor
'@layerswap/widget': minor
---

Separate internal errors from public reports and backend observation from UI state.

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
