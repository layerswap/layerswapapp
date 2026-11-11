# EVM gas policies

`evmGasPolicies.ts` is the single source for chain-specific gas behavior. Policies
are keyed by numeric chain ID; network display names and internal names do not
select gas behavior. Every entry includes its chain name for maintenance.

## Settings

- `baseFeeMultiplier`: price headroom used by viem's fee estimator. On EIP-1559
  chains it scales the base-fee component; on explicit legacy chains it scales
  the RPC gas price. It does not change the number of gas units.
- `minPriorityFeePerGasGwei`: optional minimum EIP-1559 priority fee. Raising the
  priority fee also raises the cap by the same amount to retain base-fee room.
- `gasLimitMarginBps`: execution headroom in gas units, with ceiling division.
  `12_000` means 120% of estimated gas. Quotes and submission use the same margin.
- `transactionGasMode`: wallet-controlled, explicit legacy, or explicit EIP-1559.
  Explicit modes require complete fee data for both quotes and submission.
- `reserveMaximumFee`: expose the maximum fee separately for Max budgeting.
- Fee funding is never asserted before the wallet request. A policy must not
  compare the native balance against value plus fee: smart accounts and
  paymasters pay fees in tokens or have them sponsored, so such a check rejects
  transfers the wallet would have completed. The widget shows an advisory gas
  warning instead, and the wallet reports a real shortfall.
- `accountBalanceReserve`: chain-specific balance that must remain in the account.
- `opStack`: OP Stack fee configuration. `gasPriceOracle` is the canonical oracle
  used when network metadata omits `evm_oracle_contract`; `operatorFee` asks the
  oracle's `getOperatorFee(gasLimit)` in addition to the L1 data fee. Both fees
  are budgeted into Max quotes only; the wallet shows them at submission. The L1
  estimator receives the quoted payload (the exact transaction when the caller
  supplies one, otherwise the generic placeholder) rather than an already
  serialized transaction, so viem serializes it once. An oracle RPC failure
  aborts the quote; a chain with neither metadata nor policy oracle gets no L1
  fee. It needs viem 2.31 or later, where `estimateL1Fee` serializes locally
  instead of preparing the request against the account.

`NetworkSettings.ts` retains ordering and fee-unit conversion overrides. Those are
not transaction fee policies.

## Adding or updating a network

1. Verify its numeric chain ID and fee model. Identify additional charges such as
   L1 data fees and protocol account reserves before selecting explicit fees.
2. Reuse a matching policy or add an entry with a chain-name comment. Add testnet
   entries separately when needed. A newly configured backend network does not
   automatically receive an explicit-submission policy.
3. Preserve price multipliers and priority floors unless intentionally changing
   them. Cover the effective fees with real viem and a mocked RPC transport.
4. Test native Max, manual amounts, token gas funding, unavailable fee estimates,
   and quotes followed by changed fees. Compare quote budgets with the parameters
   sent to the wallet. Verify the supported wallet preserves those parameters.

Unknown IDs retain the default: 1.2 price multiplier, no gas-limit margin beyond
100%, and wallet-controlled submission. This preserves existing behavior; it is
not a claim that every new chain's Max budget matches wallet defaults. OP Stack
chains with oracle metadata but no `opStack` policy still quote the L1 data fee;
opting one into explicit submission requires validating its complete fee budget,
as Base's policy does.

BSC deliberately retains a 1.2 legacy gas-price multiplier. The prepared price is
used in both quoting and submission rather than relying on a wallet's price floor.
The existing 2% widget Max fee buffer remains separate from both this price margin
and the gas-limit margin. Quotes and submission are fresh estimates at different
times; a later fee increase can require recalculating a fixed transfer amount.
