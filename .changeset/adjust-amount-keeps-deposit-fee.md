---
"@layerswap/widget": patch
---

The swap context now remembers what a route's real deposit transaction costs, recorded by the withdrawal view from its deposit action, and the Max preset and the confirmation check never budget less than that fee again for the same route and funding account. Before a swap exists the preset can only price a plain transfer; for routes whose deposit is a contract call that estimate is far too small, and Adjust amount or Try again used to recalculate the amount that had just failed in the wallet.
