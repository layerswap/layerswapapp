---
'@layerswap/wallet-evm': minor
'@layerswap/widget': patch
'@layerswap/widget-types': patch
---

RPC health checks are now opt-in and scoped to the network being asked about.

- `createEVMProvider` no longer adds the wallet RPC health check by default. Pass `rpcHealthCheckProviders: [new EVMRpcHealthCheckProvider()]` (now exported from `@layerswap/wallet-evm`) to keep the probe and the "add RPC" prompt.
- The probe measures the wallet's active chain; its verdict now carries that `chainId`. `useRpcHealth(network)` reports unknown health while the wallet is on another chain, so an unhealthy RPC on the chain being left no longer replaces the send button that switches away from it.
- `suggestRpcForCurrentChain` from `useRpcHealth(network)` now adds the RPC for `network`'s chain rather than the wallet's current chain.
