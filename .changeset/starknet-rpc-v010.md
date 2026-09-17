---
"@layerswap/wallet-starknet": minor
"@layerswap/wallet-paradex": patch
---

Support Starknet RPC v0.10 for balances, NFTs, fee estimation, and connected wallet
accounts using Starknet.js 10 via the `starknet-rpc` alias. Keep the shared
`starknet` catalog on v8 for wallet connectors and Paradex. RPC v0.9
remains supported; configured RPC v0.8 endpoints must be upgraded.

Reuse the connected Starknet account's configured RPC during Paradex
authorization instead of falling back to the Paradex SDK's shared public nodes.
