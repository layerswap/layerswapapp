---
'@layerswap/wallet-core': minor
'@layerswap/wallet-evm': patch
---

Share wallet error classification through `@layerswap/wallet-core/errors`.

- `@layerswap/wallet-core/errors` is a new subpath exporting `isUserRejection`, `normalizeWalletErrorCode` and `walletErrorCode`, so the widget and wallet adapters classify wallet cancellations and failures the same way.
- `@layerswap/wallet-evm` resolves user rejections through the shared helper. The Hyperliquid and Polymarket transfer providers use the common `evmUtils/resolveError` instead of private copies, and the adapter keeps its legacy nested `-1` / `data.code` cancellation handling at the adapter boundary.
- Classification precedence is by evidence, not by which field a signal came from: a definitive code/name (4001, 5000, `ACTION_REJECTED`, `UserRejectedRequestError`, …) or descriptive message text (`user rejected`, `denied by the user`, `insufficient funds`, …) anywhere in the error tree beats the `-32603` / `SERVER_ERROR` / `InternalRpcError` / `internal error` buckets. viem bucket classes (`InternalRpcError`, `InvalidInputRpcError`, `UnknownRpcError`) contribute no text of their own, so a wrapper can never change what it wraps.
- `cause`, `data`, `originalError` and `error` are inspected (bounded), covering viem/ethers wrappers, JSON-RPC `data`, MetaMask's `-32603` serializer fallback and ethers v5 `SERVER_ERROR` bodies.
- Host-visible `reason_code` shifts: wrapped declines that were `internal_rpc_error` become `user_rejected` (Faro impact `expected` via `widget_diagnostic` instead of `user` via `captureException`; `onSwapLifecycle` emits `wallet_action_rejected` instead of `wallet_action_failed`), and viem-wrapped node `-32000` errors report the underlying reason (`insufficient_funds`, `nonce_or_replacement`, `contract_reverted`, `timeout`, `unknown_error`) instead of `invalid_parameters`.
