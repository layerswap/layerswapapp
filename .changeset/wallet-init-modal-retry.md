---
"@layerswap/wallet-tron": patch
"@layerswap/wallet-starknet": patch
"@layerswap/wallet-svm": patch
---

Retry a failed Tron, Starknet, or Solana wallet initialization when the user opens the connect modal, so a failed SDK load no longer needs a page reload to recover. Successful or in-flight initialization is never repeated.
