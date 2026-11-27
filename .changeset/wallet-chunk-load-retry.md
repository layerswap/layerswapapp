---
"@layerswap/wallet-core": patch
"@layerswap/wallet-starknet": patch
"@layerswap/wallet-svm": patch
"@layerswap/wallet-tron": patch
---

Retry transient chunk-loading failures once when loading wallet providers and the Starknet, Solana, and Tron SDK modules. Keep existing failure handling after the retry and propagate unrelated initialization errors immediately.
