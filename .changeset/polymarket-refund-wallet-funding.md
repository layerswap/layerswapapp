---
"@layerswap/widget-types": patch
"@layerswap/wallet-evm": patch
"@layerswap/widget": patch
---

Polymarket swap creation now supplies the connected owner's Polygon address as
`refund_address`, allowing backend token-swap routes to pass refund validation.
`source_address` remains omitted because the Polymarket funder contract sends the
transfer. Refunds go to the owner's Polygon wallet as USDC.e.

Extended route funding now accepts only `wallet` or `deposit_address` (the default).
The `depository` mode and `usesDepository` export have been removed. Integrations
using regular wallet transfers should use `funding: 'wallet'` and
`usesWalletFunding`; deposit-address integrations can keep their existing mode.
