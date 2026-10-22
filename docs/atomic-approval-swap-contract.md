# Frontend atomic approval and swap contract

BAB-386 uses the allowance-funded wallet-batch API introduced in [backend PR #5400](https://github.com/layerswap/monorepo/pull/5400), commit `0a05ca0f93f2ad8f44384db98681f589b6085a63`. The frontend consumes server-built calls; it does not build approvals, intake calldata, delegated-wallet detection, or wallet self-calls.

## Swap creation

The optional `use_atomic_batch: true` flag is requested only after the selected wallet connector reports `atomic.status = "supported"` for the source account and chain. It is omitted for native tokens, gasless swaps, deposit-address swaps, exchanges, extended sources, unsupported wallets, and wallets reporting `"ready"`. Existing creation fields and quote confirmation remain in use. An existing swap keeps its original backend execution rail; testing the new rail requires a fresh eligible swap.

Opening or reopening the confirmation screen only reviews the quote. Swap creation starts on the user’s confirmation click, including after amount, account, or gasless preference changes. Before creation, a single-hop frontend quote (0X, FLY or UNISWAP) plus supported wallet batching shows “Approve and swap”; regular bridge quotes show “Send from wallet”. Read-only capability discovery is limited to eligible, self-paid frontend drafts and shares the adapter cache with creation. It never creates a swap, signs, submits or polls wallet status. After creation, the shared resolver uses the returned deposit-action plan for execution and progress: a regular bridge uses a transfer, a batch with approval uses “Approve and swap”, an allowance-funded single transaction uses “Confirm swap”, and signing flows use their current signing/approval action. Missing data on an existing swap stays in preparation; unknown actions cannot execute. Draft preferences and current wallet capabilities cannot replace the returned execution plan. The same confirmation click creates the swap and follows its returned actions; retries refresh existing actions before sending.

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

The backend includes a zero-first reset before approval when necessary and omits both approval calls when allowance suffices. All calls are actionable together. The frontend groups multiple calls into one internal `send_calls` action. A single publish call remains a regular transaction. Standalone `approve` items cannot enter ordinary transfer execution or transaction-hash tracking.

Sufficient allowance leaves one publish transfer, labeled “Confirm swap”. The backend returns a regular `transfer` in `next_action` for that case; approval plus intake returns `send_calls`. The frontend also accepts a one-call `send_calls` from older deployments and normalizes it into one transfer, preserving its exact target, calldata, expiry and integer native value. It never splits a multi-call batch or falls back to sequential approvals.

The current complete `next_action` list takes precedence if allowance changed between reads. Missing or malformed action responses block submission. A single-call transfer uses the ordinary wallet transfer path and returns a real transaction hash immediately; that hash drives existing receipt/status checks and `SwapCatchup`.

Action resolution runs explicitly in `CreateSwapAsync`, `GetSwapAsync` and `GetDepositActionsAsync`. Deposit-action SWR subscribers call the dedicated method. The authenticated transport and generic fetcher return server responses unchanged and perform only the requested HTTP call; they never detect swap routes or resolve atomic actions.

Flat `amount_in_base_units` values are decimal wei strings; `send_calls` values are hex wei strings. Both represent native transaction value, not the ERC-20 amount, and are converted directly to `bigint`. Calls retain server order. The current backend does not include a sender or chain in `next_action`; submission validates the selected account against the created swap's `source_address` and uses the source network from the swap/flat response. Expiry comes from `valid_before` or the ISO envelope. Addresses, calldata, chain, sender, expiry, and unsigned integer values are validated before opening the wallet.

No permit signature or `/authorize` request is used for this rail. The backend builds the allowance-funded `intakeWithPermit` call with empty permit fields and locks its quote before returning executable calldata. Legacy, native-token, gasless, and deposit-address workflows retain their existing behavior.

## Fixtures

[Contract fixtures](../packages/widget/core/tests/fixtures/atomic-batch.json) include both API response shapes and their normalized actions for zero allowance, zero-first reset, sufficient allowance, and precision above JavaScript's safe integer range. Targets are deterministic test addresses. Approval calldata uses the ERC-20 encoding; intake calldata is a test placeholder. The nonzero native value is a serialization test, whereas the backend's ERC-20 rail currently supplies zero native value. These fixtures must not be broadcast.

## Wallet submission and tracking

The EVM adapter uses viem `sendCalls` with `forceAtomic: true`, version `2.0.0`, sequential fallback disabled and request retries disabled. In [EIP-5792](https://eips.ethereum.org/EIPS/eip-5792), this sends `atomicRequired: true`. Capability caching is scoped to connector, account, source chain and current wallet chain; submission performs a fresh check.

Shared capability discovery has a ten-second deadline. A timeout leaves creation on the existing workflow without atomic opt-in; a timed-out fresh submission check refuses the batch before opening a wallet prompt. Late discovery responses cannot overwrite a newer result or retain the pending lookup.

The existing swap transaction store saves execution kind, transaction hash/timestamp, and submission guards keyed by swap ID. An accepted multi-call batch stores only its opaque batch ID and acceptance timestamp. It has no transaction hash until the backend supplies an indexed input. Batch IDs never become explorer links, transaction-status arguments or catchup hashes.

After acceptance, the existing backend swap poller owns tracking. The frontend makes no `wallet_getCallsStatus` request, opens no wallet for status, and exposes no manual status button. The wallet request returns immediately after acceptance. Background detection, backend failure, and completion update the existing progress surface. A disconnected wallet, spent source balance or unhealthy wallet RPC cannot replace that progress with another submission prompt.

If no input has been detected after 150 seconds, the progress displays “Transaction not detected yet” and explains that tracking continues automatically. This is an unconfirmed outcome, not a declaration that funds failed to move. Backend polling continues, a later indexed input replaces the accepted marker with its hash, and the persisted guard prevents another wallet submission or replacement. Closing and reopening preserves that guard and the accepted timestamp. Lost responses also remain guarded; reopening starts a fresh observation window if no acceptance timestamp was available.

Uncertain submissions remain visible in history while their persisted guard is unresolved, including when there is no receipt timestamp or the backend's history list omits the swap. History recovery respects selected account and network filters and never clears the submission guard.

Wallet rejection and proven non-submission release the submission guard. Missing inputs, quote expiry, status outages and elapsed time do not. Legacy saved wallet failure receipts remain readable, but this flow no longer obtains new failure receipts from wallet status calls.

For a regular single-call transaction, its returned hash allows the existing backend transaction-status endpoint to detect a revert. For a multi-call batch, the backend currently discovers successful frontend deposits through settlement logs. An outer revert emits no such logs, and the opaque wallet batch ID cannot identify that transaction through ordinary chain RPC. Automatic attribution of those reverts still requires a backend indexer/submission-tracking extension; this change keeps that case explicitly unconfirmed instead of labelling a timeout as a failed transaction.

MetaMask estimates gas for the entire batch. The frontend does not inject unsupported gas overrides or patch the wallet SDK.

Swap phases derive from fetched swap, deposit-action, transaction-status and authorization responses. The observation timeout only changes the waiting copy; it never manufactures completion, failure or a new backend phase. Accepted signatures and gasless outcomes retain their existing cache and persistence behavior.

Recorded user actions are separate deduplication hints. A late submitted hash or accepted signature prevents starting a replacement before reconciliation. Only a fetched failure for that exact hash or a fetched terminal authorization without a live transaction can release the relevant guard. These helpers never manufacture swap completion, failure or a progress phase.

## Execution identity

The shared flow resolver identifies this rail as `atomic-batch`, separate from the regular `frontend-swap` approval/sign/publication workflow. `send_calls`, flat `approve` steps, and a transaction record with `kind: 'atomic-batch'` identify it. The resolver receives the current swap's typed transaction directly, without a separate batch flag or duplicated swap ID. Creation, deposit-action and authorization responses persist confirmed execution identity in that store. The provider reads it through status-only responses and reloads, with no ref or layout effect retaining a second copy; a fresh swap cannot inherit another swap's record.

The backend's complete allowance-rail history retains `approve` and `publish` placeholders after submission/completion, so it identifies atomic execution after reload without local storage. A saved atomic kind also covers a partial publish-only snapshot. A legacy/native frontend publication can be identified by the existing positive `quote_revision`, which is present only for a persisted frontend settlement leg. That same field distinguishes gasless frontend settlement from an ordinary gasless depository transfer on the same network; matching networks alone cannot establish a shared transaction. A completed ordinary transfer returns an empty plan, while signing and frontend plans retain their history.

The resolver exposes explicit pending, resolved and unsupported states. Canonical plans identify manual deposits, exchange deposits, specialized wallets, wallet transfers, gasless deposits, self-paid frontend swaps and atomic batches. Older signature-only responses without a semantic standard retain their known signing action while awaiting further backend evidence; they cannot invent atomic execution or settlement progress. Reopening a swap keeps its original backend mode regardless of the form's default gasless preference. Only a preference changed in the current view can request a fresh unsubmitted swap.

## Provider withdrawals

Transfer adapters can expose an optional `withdrawal` capability from `@layerswap/widget-types`. Each adapter owns its identifier, display labels, amount precision and conversion of backend deposit instructions into transfer parameters. Hyperliquid and Polymarket declare these beside their transfer implementations. Adding another adapter uses the existing transfer-provider registration; Page 2, withdrawal controls and flow resolution discover the capability without provider-name branches.

The shared provider controller owns lazy swap creation, reviewed-draft identity, retries, submission reconciliation, progress, errors and success handoff. The ordinary wallet workflow shares selection cancellation, execution leases, form-value construction and error reporting. Its approval, signing, gasless and atomic execution steps remain in the ordinary workflow.

## Live acceptance checks

Against a deployment containing PR #5400, verify ARB to AAVE on Arbitrum with MetaMask already reporting `supported`, and a second compatible EVM wallet. Check the zero-allowance and zero-first reset batches plus the sufficient-allowance regular transaction; exact values; one wallet confirmation with approval wording only when approval is required; quote confirmation; rejection; account and chain changes before and during submission; repeated clicks in the active widget; screen closure and reload; disconnected original wallet; lost responses; status outages; automatic unconfirmed timeout; late backend detection after that timeout; and retry boundaries after a known failed transaction.

Confirm that only the final successful receipt hash reaches backend transaction-status queries, the explorer link and `SwapCatchup`, then verify normal output-swap progress. Repeat the legacy, native-token, gasless and deposit-address flows. Live wallet acceptance has not been performed here; fixture tests cannot establish deployed contract or wallet behavior.
