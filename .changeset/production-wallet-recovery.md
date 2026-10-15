---
'@layerswap/wallet-evm': patch
'@layerswap/wallet-starknet': patch
'@layerswap/wallet-core': patch
'@layerswap/widget': patch
---

Keep transaction gas estimation in gas units, resolve the selected wallet account precisely, and validate Starknet signing accounts and prepared calls while preserving diagnostic causes. Avoid misleading balance blocks after submission and gasless fallback for route validation failures. Share active connector chain switches across accounts, allow recovery after timeouts, and classify Bitget authorization revocation without masking contract reverts.
