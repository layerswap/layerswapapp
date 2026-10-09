---
"@layerswap/widget": patch
"@layerswap/wallet-evm": patch
"@layerswap/wallet-tron": patch
---

Estimate gas with the connected source account's selected token balance while the transfer amount is empty. Use the entered amount once available and pass it through the detailed gas fee view.

Keep Max enabled when no source wallet is connected, including before route limits are available or while a disconnected account's balance remains cached. Use the route maximum once available.

Pass the transfer amount to EVM and Tron gas providers when building transactions.
