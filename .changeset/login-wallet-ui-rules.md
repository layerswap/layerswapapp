---
"@layerswap/widget-types": minor
"@layerswap/wallet-core": minor
"@layerswap/widget": minor
---

Add `config.loginWallet` (`{ address, providerId }`) for hosts whose users log in with an embedded wallet. The wallet registry publishes the matching connected wallet with `isLoginWallet: true`; it can't be disconnected from either widget. In the deposit widget, wallet methods are bound to it regardless of balance, and its wallet family is excluded from new connections so it's never replaced.
