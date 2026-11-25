---
"@layerswap/wallet-evm": patch
---

Stop fallback RPC transports from retrying on top of each endpoint's own retries, so a failing request makes at most 4 attempts per endpoint by default instead of 16 while still honoring each endpoint's `Retry-After`.
