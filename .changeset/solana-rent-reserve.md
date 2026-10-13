---
"@layerswap/widget": patch
"@layerswap/widget-types": patch
"@layerswap/wallet-svm": patch
---

Keep Solana's rent-exempt minimum when Max or Adjust amount is used on native SOL, so the transfer no longer leaves a sub-rent balance that fails wallet simulation. Gas estimates may now report a `reserve` that must stay in the account.
