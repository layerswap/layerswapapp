---
"@layerswap/widget-types": patch
"@layerswap/wallet-stellar": patch
---

Recover from failed lazy loads instead of failing for the rest of the session. `LazyBalanceProvider` and `LazyGasProvider` now retry a failed provider import on the next call, and the Stellar wallet kit retries a failed initialization on the next wallet call.
