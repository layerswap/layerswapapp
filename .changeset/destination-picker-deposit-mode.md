---
"@layerswap/widget": patch
---

Keep destination picker options when the form is in deposit-address mode: destinations stay bound to the selected source and unreachable ones are shown as unavailable instead of disappearing. A deposit-address method that was forced because the source had no wallet is now lifted once a wallet-capable source is selected, so the picker no longer stays stuck until a page refresh.
