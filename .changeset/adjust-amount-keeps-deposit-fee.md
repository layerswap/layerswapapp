---
"@layerswap/widget": patch
---

Adjust amount now hands the fee of the swap's real deposit transaction back to the form as a scoped floor, so the live Max preset and the confirmation check never budget less than that fee again for the same route and funding account. Before a swap exists the preset can only price a plain transfer; for routes whose deposit is a contract call that estimate is far too small, and the live recalculation used to restore the amount that had just failed in the wallet.
