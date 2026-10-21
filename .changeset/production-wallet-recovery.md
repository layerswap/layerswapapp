---
'@layerswap/wallet-starknet': patch
'@layerswap/wallet-core': patch
'@layerswap/widget': patch
---

Resolve the exact selected wallet account, validate Starknet signing accounts and prepared calls, and reconcile restored Starknet accounts. Preserve actionable gasless route errors and Bitget authorization failures. Keep the withdrawal flow mounted during execution and suppress misleading post-send balance warnings while retaining live chain readiness, cancellation, and amount preset handling.
