---
"@layerswap/wallet-evm": patch
---

Base mainnet and Base Sepolia now quote and submit explicit EIP-1559 fees with the same 20% gas-limit margin, so a native Max transfer no longer depends on the wallet's own fee defaults. Max budgets include the OP Stack L1 data fee and the oracle's operator fee, the L1 estimator receives the original calldata, recipient and value, and missing fee or oracle data aborts the quote instead of being treated as zero. Display amounts are parsed to base units through a shared helper that accepts sub-micro values.
