---
'@layerswap/wallet-evm': patch
'@layerswap/widget': patch
---

Preserve pending WalletConnect switch errors instead of reporting them as user rejections. Only unknown-chain errors trigger an add-chain request, and only genuine declines are wrapped as rejections.

Show network-switch errors during critical-price-impact confirmation while keeping Continue anyway available for retry.

WalletConnect: after adding an unknown chain, ask the wallet to switch to it unless it already did. Adding a chain does not select it (EIP-3085), so a resolved switch no longer leaves the wallet on the previous chain.
