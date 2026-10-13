---
'@layerswap/wallet-starknet': patch
'@layerswap/wallet-core': patch
'@layerswap/widget-types': patch
'@layerswap/widget': patch
---

Show generic Starknet execution failures as wallet errors instead of user rejections. Preserve nested provider codes in lifecycle events and allowlisted RPC simulation/revert details in error reports, with bounded serialization. Expose the wallet-reported version when available for diagnostics.
