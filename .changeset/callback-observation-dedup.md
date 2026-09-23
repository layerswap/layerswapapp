---
'@layerswap/widget': minor
---

Deduplicate host callbacks and report wallet prompts on retry.

- `onSwapStatusChange` deduplicates unchanged `(swapId, type, phase)` observations within an attempt, including late address data. The UI `phase` can complete or fail before the API `type` becomes terminal; a subsequent API status change or new wallet attempt is a separate notification.
- `onSwapLifecycle` deduplicates repeated phase and transaction observations caused by polling or effect replay. Actual retries, wallet prompts, new transactions, and phase recovery transitions remain observable.
- Effect-driven phase and transaction observations are keyed on their observation fingerprint; the swap id, source address and confirmation counts arriving later no longer re-emit `awaiting_wallet_action`, `awaiting_user_deposit` or Processing phase steps.
- Wallet transfer cancellations declared by the adapter (`userRejectedError` from `@layerswap/wallet-core/errors`) are reported through `onSwapLifecycle` as `wallet_action_rejected` (`outcome: rejected`, `reasonCode: user_rejected`) and no longer invoke `onError`. Hosts that track cancellations through `onError` should subscribe to `onSwapLifecycle`. A custom `TransferProvider` that only sets `name = 'TransactionRejected'` is reported as a failure through `onError` and `wallet_action_failed`.
- Stellar transaction-expiry retries emit a wallet prompt event for each wallet request; unsupported-wallet telemetry waits for provider restoration.
