---
"@layerswap/wallet-evm": patch
---

Stop rejecting Ethereum and BSC transfers before the wallet prompt when the native balance does not cover value plus the prepared fee. Wallets that pay gas in tokens or through a paymaster can complete those transfers, so fee funding is left to the wallet.
