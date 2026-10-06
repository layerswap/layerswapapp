# Frontend atomic approval and swap contract

BAB-386 uses the allowance-funded wallet-batch API introduced in [backend PR #5400](https://github.com/layerswap/monorepo/pull/5400), commit `0a05ca0f93f2ad8f44384db98681f589b6085a63`. The frontend consumes server-built calls; it does not build approvals, intake calldata, delegated-wallet detection, or wallet self-calls.

## Swap creation

The optional `use_atomic_batch: true` flag is requested only after the selected wallet connector reports `atomic.status = "supported"` for the source account and chain. It is omitted for native tokens, gasless swaps, deposit-address swaps, exchanges, extended sources, unsupported wallets, and wallets reporting `"ready"`. Existing creation fields and quote confirmation remain in use. An existing swap keeps its original backend execution rail; testing the new rail requires a fresh eligible swap.

## Backend responses

Creation, swap reads, and `GET /swaps/{id}/deposit_actions?source_address=...` expose the complete ordered calls as ordinary transfers:

```typescript
[
  {
    type: "transfer", step: "approve", status: "action_required", order: 0,
    network: sourceNetwork, token: sourceToken,
    to_address: tokenAddress, call_data: "0x095ea7b3...",
    amount_in_base_units: "0", valid_before: unixSeconds, expires_at: isoTimestamp
  },
  {
    type: "transfer", step: "publish", status: "action_required", order: 1,
    network: sourceNetwork, token: sourceToken,
    to_address: splitIntake, call_data: "0x...",
    amount_in_base_units: "0", valid_before: unixSeconds, expires_at: isoTimestamp
  }
]
```

The backend includes a zero-first reset before approval when necessary and omits both approval calls when allowance suffices. All calls are actionable together. The frontend groups this flat list into one internal `send_calls` action. Standalone `approve` items cannot enter ordinary transfer execution or transaction-hash tracking.

A sufficient allowance leaves a single publish transfer, which resembles a legacy transaction. The frontend queries `GET /swaps/{id}/next_action?source_address=...` to identify its persisted execution rail, including after reload:

```typescript
{
  step: "publish", status: "action_required", expires_at: isoTimestamp,
  action: {
    type: "send_calls", amount_in_base_units: "0",
    calls: [{ to: splitIntake, data: "0x...", value: "0x0" }]
  }
}
```

This endpoint always returns `send_calls` for the allowance rail, even with one call. Its current complete call list takes precedence if allowance changed between reads. A legacy transfer response retains ordinary execution. Unavailable, inconsistent, or malformed batch responses cannot trigger sequential fallback.

Flat `amount_in_base_units` values are decimal wei strings; `send_calls` values are hex wei strings. Both represent native transaction value, not the ERC-20 amount, and are converted directly to `bigint`. Calls retain server order. The current backend does not include a sender or chain in `next_action`; submission validates the selected account against the created swap's `source_address` and uses the source network from the swap/flat response. Expiry comes from `valid_before` or the ISO envelope. Addresses, calldata, chain, sender, expiry, and unsigned integer values are validated before opening the wallet.

No permit signature or `/authorize` request is used for this rail. The backend builds the allowance-funded `intakeWithPermit` call with empty permit fields and locks its quote before returning executable calldata. Legacy, native-token, gasless, and deposit-address workflows retain their existing behavior.

## Fixtures

[Contract fixtures](../packages/widget/core/tests/fixtures/atomic-batch.json) include both API response shapes and their normalized actions for zero allowance, zero-first reset, sufficient allowance, and precision above JavaScript's safe integer range. Targets are deterministic test addresses. Approval calldata uses the ERC-20 encoding; intake calldata is a test placeholder. The nonzero native value is a serialization test, whereas the backend's ERC-20 rail currently supplies zero native value. These fixtures must not be broadcast.

## Wallet submission and tracking

The EVM adapter uses viem `sendCalls` with `forceAtomic: true`, version `2.0.0`, sequential fallback disabled and request retries disabled. In [EIP-5792](https://eips.ethereum.org/EIPS/eip-5792), this sends `atomicRequired: true`. Capability caching is scoped to connector, account, source chain and current wallet chain; submission performs a fresh check.

The frontend persists a recovery record before opening the wallet and saves the returned batch ID even after screen closure or an account change. The swap provider polls the original wallet's ID every two seconds, with error backoff capped at thirty seconds. Batch IDs stay separate from transaction hashes. Only an atomic result on the expected chain with valid successful receipt hashes reaches transaction tracking, explorer links or `SwapCatchup`; the final receipt supplies the hash.

Rejections and proven non-submission allow an explicit retry. Status 400 with no receipts proves non-submission; status 500 with only reverted receipts proves complete atomic failure. Pending, malformed, partial or non-atomic results, lost submission responses and status outages retain the lock. Reconnect the original wallet for ID tracking. A valid backend input transaction reconciles submission when the wallet response was lost; absence of an input transaction does not establish non-submission.

## Live acceptance checks

Against a deployment containing PR #5400, verify ARB to AAVE on Arbitrum with MetaMask already reporting `supported`, and a second compatible EVM wallet. Check the zero-allowance, zero-first reset and sufficient-allowance cases; exact values; one approve-and-swap prompt; quote confirmation; rejection; account and chain changes before and during submission; concurrent clicks; screen closure and reload; disconnected original wallet; lost responses; status outages; multiple receipts; malformed status; partial execution; non-atomic execution; complete atomic failure; and explicit retry boundaries.

Confirm that only the final successful receipt hash reaches backend transaction-status queries, the explorer link and `SwapCatchup`, then verify normal output-swap progress. Repeat the legacy, native-token, gasless and deposit-address flows. Live wallet acceptance has not been performed here; fixture tests cannot establish deployed contract or wallet behavior.
