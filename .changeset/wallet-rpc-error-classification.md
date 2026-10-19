---
'@layerswap/wallet-core': patch
'@layerswap/wallet-evm': patch
'@layerswap/widget': patch
---

Keep RPC failures distinct from user cancellations when Viem wraps transaction
errors with its unknown-error code (-1). Require actual user-rejection evidence
and classify wallet RPC HTTP failures as network errors while preserving their
original cause and diagnostic code.

Show recovery guidance for network failures, RPC errors, disconnected wallets,
pending requests, and timeouts before falling back to a generic swap error.
For EVM network failures, direct users to check the source network's RPC settings
in their wallet. Keep raw provider diagnostics in telemetry.
