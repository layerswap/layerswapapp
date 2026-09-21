---
'@layerswap/wallet-core': minor
'@layerswap/wallet-evm': patch
---

Share wallet error classification through `@layerswap/wallet-core/errors`.

- `@layerswap/wallet-core/errors` is a new subpath exporting `isUserRejection`, `normalizeWalletErrorCode` and `walletErrorCode`, so the widget and wallet adapters classify wallet cancellations and failures the same way.
- `@layerswap/wallet-evm` resolves user rejections through the shared helper. The Hyperliquid and Polymarket transfer providers use the common `evmUtils/resolveError` instead of private copies, and the adapter keeps its legacy nested `-1` / `data.code` cancellation handling at the adapter boundary.
