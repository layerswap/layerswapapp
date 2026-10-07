---
"@layerswap/wallet-bitcoin": patch
"@layerswap/wallet-starknet": patch
---

Allow gas estimation without an entered amount: Bitcoin budgets all available inputs and transfer outputs, while Starknet simulates a fixed transfer probe. The widget continues calculating Max from the balance minus its existing gas reserve.
