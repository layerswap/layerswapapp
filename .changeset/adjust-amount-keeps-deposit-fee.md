---
"@layerswap/widget": patch
---

The swap context now remembers what a route's real deposit transaction costs, recorded by the withdrawal view from its deposit action, and the Max preset and the confirmation check never budget less than that fee again for the same route and funding account. Before a swap exists the preset can only price a plain transfer; for routes whose deposit is a contract call that estimate is far too small, and Adjust amount or Try again used to recalculate the amount that had just failed in the wallet.

Confirming a Max or Half amount now also prices the created swap's own deposit transaction before the wallet opens. When that fee no longer fits beside the reviewed amount, the swap is replaced with one for the amount the account can fund and the wallet opens for it in the same click. A reduction of more than one percent that is also worth more than a cent, or a replacement that still falls short, keeps the reviewed amount on screen and offers Adjust amount in place of the confirm button; adjusting applies the amount, and Confirm then sends it.

Provisional fee-check swaps notify the host and enter route history only after acceptance. Pending proposals freeze live amount updates while the review is open, and provider withdrawals share the same adjustment action. Provider withdrawals require Adjust amount and a new confirmation for every reduction, including small ones, so their transfer callback receives the accepted source amount. Min presets also validate affordability against the actual deposit fee before opening the wallet.

Creation telemetry starts before confirmation preparation and covers fee checks and any replacement request as one attempt. Acceptance emits `swap_created`; a proposal or failed check ends the attempt with `swap_creation_failed` without exposing a provisional swap ID, so creation stall detection and elapsed time remain accurate.
