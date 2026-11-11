---
"@layerswap/wallet-evm": patch
"@layerswap/widget-types": patch
---

Read the EVM BalanceViewer address from network metadata instead of a hardcoded network list. Networks without a configured viewer, or whose viewer call fails, use the existing token and native balance fallback.

Reuse the shared network and token types for refuel data so network metadata has a single definition.
