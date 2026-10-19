---
'@layerswap/wallet-core': patch
'@layerswap/wallet-evm': patch
'@layerswap/widget': patch
---

Stop reporting wallet RPC failures relayed over WalletConnect as user rejections.
MetaMask Mobile answers a failed request with CAIP-25 code 5000 and the failure
as the message; when that text names a non-decline failure, classify by it.
EVM network failures now tell users to select a working RPC URL in their
wallet's network settings and remove the others.
