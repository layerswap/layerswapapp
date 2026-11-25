---
"@layerswap/wallet-evm": patch
---

Retry fallback RPC requests once per round instead of also retrying each endpoint, so a failing request no longer makes up to 16 attempts per node and a healthy fallback node responds without waiting on the failing one.
