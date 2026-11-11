---
"@layerswap/wallet-evm": patch
---

Base mainnet and Base Sepolia now quote and submit explicit EIP-1559 fees with the same 20% gas-limit margin, so a native Max transfer no longer depends on the wallet's own fee defaults. Max budgets include the OP Stack L1 data fee and the oracle's operator fee. The L1 estimator now receives the quoted payload itself instead of an already serialized transaction, and an oracle or fee RPC failure aborts the quote instead of being treated as zero. Display amounts are parsed to base units through a shared helper that accepts sub-micro values.
