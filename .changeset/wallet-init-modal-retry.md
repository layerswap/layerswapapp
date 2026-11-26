---
"@layerswap/wallet-core": patch
"@layerswap/wallet-tron": patch
"@layerswap/wallet-starknet": patch
"@layerswap/wallet-svm": patch
---

Retry a failed Tron, Starknet, or Solana wallet initialization when the user opens the connect modal, so a failed SDK load no longer needs a page reload to recover. A chunk-load failure during an open modal is retried once automatically; other failures wait for the user. Successful or in-flight initialization is never repeated. Chunk-load recovery helpers are exported from `@layerswap/wallet-core/chunkLoadRecovery`.
