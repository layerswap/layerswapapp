# Frontend atomic approval and swap contract

BAB-386 uses the allowance-funded wallet-batch API introduced in [backend PR #5400](https://github.com/layerswap/monorepo/pull/5400), commit `0a05ca0f93f2ad8f44384db98681f589b6085a63`. The frontend consumes server-built calls; it does not build approvals, intake calldata, delegated-wallet detection, or wallet self-calls.

## Swap creation

The optional `use_atomic_batch: true` flag is requested only after the selected wallet connector reports `atomic.status = "supported"` for the source account and chain. It is omitted for native tokens, gasless swaps, deposit-address swaps, exchanges, extended sources, unsupported wallets, and wallets reporting `"ready"`. Existing creation fields and quote confirmation remain in use. An existing swap keeps its original backend execution rail; testing the new rail requires a fresh eligible swap.

Before creation, an eligible wallet with confirmed batch support shows “Approve and swap”. One click prepares the swap and continues to wallet confirmation; there is no second idle preparation screen. Once the server returns the calls, their contents determine the exact action label, including “Confirm swap” when allowance already suffices.

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

A sufficient allowance leaves a single publish transfer, which resembles a legacy transaction. The frontend labels that batch “Confirm swap”; batches that include approval use “Approve and swap”. Wallet capabilities alone do not determine whether approval is needed. The frontend queries `GET /swaps/{id}/next_action?source_address=...` to identify its persisted execution rail, including after reload:

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

Action resolution runs explicitly in `CreateSwapAsync`, `GetSwapAsync` and `GetDepositActionsAsync`. Deposit-action SWR subscribers call the dedicated method. The authenticated transport and generic fetcher return server responses unchanged and perform only the requested HTTP call; they never detect swap routes or resolve atomic actions.

Flat `amount_in_base_units` values are decimal wei strings; `send_calls` values are hex wei strings. Both represent native transaction value, not the ERC-20 amount, and are converted directly to `bigint`. Calls retain server order. The current backend does not include a sender or chain in `next_action`; submission validates the selected account against the created swap's `source_address` and uses the source network from the swap/flat response. Expiry comes from `valid_before` or the ISO envelope. Addresses, calldata, chain, sender, expiry, and unsigned integer values are validated before opening the wallet.

No permit signature or `/authorize` request is used for this rail. The backend builds the allowance-funded `intakeWithPermit` call with empty permit fields and locks its quote before returning executable calldata. Legacy, native-token, gasless, and deposit-address workflows retain their existing behavior.

## Fixtures

[Contract fixtures](../packages/widget/core/tests/fixtures/atomic-batch.json) include both API response shapes and their normalized actions for zero allowance, zero-first reset, sufficient allowance, and precision above JavaScript's safe integer range. Targets are deterministic test addresses. Approval calldata uses the ERC-20 encoding; intake calldata is a test placeholder. The nonzero native value is a serialization test, whereas the backend's ERC-20 rail currently supplies zero native value. These fixtures must not be broadcast.

## Wallet submission and tracking

The EVM adapter uses viem `sendCalls` with `forceAtomic: true`, version `2.0.0`, sequential fallback disabled and request retries disabled. In [EIP-5792](https://eips.ethereum.org/EIPS/eip-5792), this sends `atomicRequired: true`. Capability caching is scoped to connector, account, source chain and current wallet chain; submission performs a fresh check.

The existing swap transaction store saves execution kind (`wallet-transfer`, `frontend-swap`, `gasless-deposit` or `atomic-batch`) and receipt hash/timestamp, keyed by swap ID. Definitive backend responses can save the kind before submission through `setSwapTransactionKind`; a kind-only record has no hash or submission timestamp and does not block the first wallet request. Older receipts retain `kind: 'transaction'` until backend evidence identifies their flow. All execution kinds save receipts through the synchronous `setSwapTransaction` setter and standard Zustand persistence. Hydration discards legacy lifecycle and batch recovery metadata.

Atomic execution keeps the returned wallet batch ID inside its active submission call and polls the original wallet every two seconds for up to two minutes. Batch IDs are never stored as transaction hashes. Only an atomic result on the expected chain with valid successful receipt hashes reaches transaction history, explorer links or `SwapCatchup`; the final receipt supplies the hash. Execution records that hash with `kind: 'atomic-batch'` and its publish-step explorer link, invokes the success callback, then sends an optional catchup request. A catchup failure does not repeat submission or receipt polling.

The existing wallet button's in-flight guard covers repeated clicks during execution. Atomic submission uses no persistent pending-request record, Web Lock, storage retry queue or cross-tab coordination. Receipt waiting can finish after the initiating view closes, but a page reload ends the active wait. After a reload or lost response, the fetched swap and its backend transactions supply the current progress; the frontend does not resume a saved wallet batch ID. Atomic creation requires wallet capability support and the existing route eligibility checks, independently of Web Locks availability.

All swap phases, terminal outcomes, history status badges and execution progress derive from fetched swap, deposit-action, transaction-status and authorization responses. Transaction records store their kind and receipt hash/timestamp; step history stores receipt hashes, timestamps and explorer links. Accepted signature receipts retain their deadline/kind solely to recover the action. Gasless outcomes remain in the shared SWR response cache; the client's clock cannot declare authorization failure. Explicit gasless workflows and completed/pending ambiguous sign steps recover through the authorization endpoint even on a browser with no local receipt.

Recorded user actions are separate deduplication hints. A late submitted hash or accepted signature prevents starting a replacement before reconciliation. Only a fetched failure for that exact hash or a fetched terminal authorization without a live transaction can release the relevant guard. These helpers never manufacture swap completion, failure or a progress phase.

## Execution identity

The shared flow resolver identifies this rail as `atomic-batch`, separate from the regular `frontend-swap` approval/sign/publication workflow. `send_calls`, flat `approve` steps, and a transaction record with `kind: 'atomic-batch'` identify it. The resolver receives the current swap's typed transaction directly, without a separate batch flag or duplicated swap ID. Creation, deposit-action and authorization responses persist confirmed execution identity in that store. The provider reads it through status-only responses and reloads, with no ref or layout effect retaining a second copy; a fresh swap cannot inherit another swap's record.

A sufficient-allowance batch can later expose only a publish status placeholder. On another device, or after a reload without a stored execution kind, that response cannot identify the rail and resolves to `unresolved`. Exact classification in that case requires a durable execution-rail discriminator from the backend. Wallet capabilities, a gasless preference and matching networks cannot supply it.

## Live acceptance checks

Against a deployment containing PR #5400, verify ARB to AAVE on Arbitrum with MetaMask already reporting `supported`, and a second compatible EVM wallet. Check the zero-allowance, zero-first reset and sufficient-allowance cases; exact values; one wallet confirmation with approval wording only when approval is required; quote confirmation; rejection; account and chain changes before and during submission; repeated clicks in the active widget; screen closure and reload; disconnected original wallet; lost responses; status outages; multiple receipts; malformed status; partial execution; non-atomic execution; complete atomic failure; and explicit retry boundaries.

Confirm that only the final successful receipt hash reaches backend transaction-status queries, the explorer link and `SwapCatchup`, then verify normal output-swap progress. Repeat the legacy, native-token, gasless and deposit-address flows. Live wallet acceptance has not been performed here; fixture tests cannot establish deployed contract or wallet behavior.
