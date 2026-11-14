---
"@layerswap/wallet-evm": patch
---

Avoid multiplying RPC retries across HTTP and fallback transports, use slower exponential backoff, share concurrent fee quotes, and stop additional fee fallbacks after rate limiting.
