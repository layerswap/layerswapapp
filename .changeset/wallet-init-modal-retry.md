---
"@layerswap/wallet-core": patch
"@layerswap/wallet-tron": patch
"@layerswap/wallet-starknet": patch
"@layerswap/wallet-svm": patch
"@layerswap/widget": patch
---

Retry a failed Tron, Starknet, or Solana wallet initialization when the user opens the connect modal, so a failed SDK load no longer needs a page reload to recover. Within one modal opening, a chunk-load failure is retried automatically at most once; other failures wait for the user. Successful or in-flight initialization is never repeated. Chunk-load recovery helpers are exported from `@layerswap/wallet-core/chunkLoadRecovery`.

Wallet provider `init` hooks now run once per provider instance: hydrating or adding another provider no longer disposes and re-initializes the providers that stayed.
