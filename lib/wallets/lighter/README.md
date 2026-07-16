# Lighter extended source

Lighter is exposed as a client-synthesized source network in `lib/extendedRoutes/`.
The real backend leg is funded through a Layerswap deposit address on Arbitrum
(Arbitrum Sepolia in sandbox): Lighter's fast-withdraw bridge releases USDC to
that address, then the normal Layerswap route completes the destination leg.

Base and Avalanche are Lighter CCTP **deposit** entry paths. They are not
destinations of `/api/v1/fastwithdraw`; Lighter's current app describes that flow
as a quick transfer to an Arbitrum wallet.

## Withdrawal protocol

1. Resolve the user's Lighter account from its L1 EVM address.
2. Select an unused API-key slot in the reserved high range and build a
   `ChangePubKey` transaction without overwriting an existing SDK key.
3. Ask the connected wallet to EIP-191 sign Lighter's `messageToSign`, insert it
   as `L1Sig`, and submit the transaction to `/api/v1/sendTx`.
4. Create an API auth token, fetch `/api/v1/fastwithdraw/info`, then fetch the
   account's `transfer_fee_usdc` from `/api/v1/transferFeeInfo`.
5. Build a USDC L2 `Transfer` to the returned bridge account. Its 32-byte memo is
   the 20-byte Arbitrum recipient followed by 12 zero bytes.
6. Ask the wallet to sign that transfer's `messageToSign`, insert `L1Sig`, and
   submit `tx_info` plus `to_address` to `/api/v1/fastwithdraw` with API auth.

The relay seals prepared registration and withdrawal payloads with a short-lived
HMAC token. The client never receives the Lighter API private key and cannot alter
the signed transaction after the EVM wallet approves it.

Confirmed protocol constants:

- Lighter protocol chain IDs: mainnet `304`, testnet `300`
- USDC asset ID: `3`
- Perps route type: `0`
- Fast-withdraw minimum: `4 USDC` total, before subtracting the fee
- USDC L2 transfer minimum: `1 USDC` after subtracting the fee
- Initial minimum shown by the extended source: `4 USDC`; preflight enforces the
  exact current fee and the 1 USDC minimum bridge transfer
- API-key slots considered by this integration: `252` down through `128`

The initial UI quote estimates a 1 USDC fee because Lighter only exposes the
account-specific fee after API-key authorization. Preflight returns the exact fee,
net deposit amount, and total debit in a short-lived HMAC-sealed quote. If the fee
differs, the user confirms it before the Layerswap swap is created using the exact
net amount. Preparation accepts that sealed quote and rejects only if Lighter raises
the fee again before signing. The authenticated liquidity check also runs before
swap creation, so an unavailable Lighter bridge LP does not leave an unfunded swap
behind.

## Relationship to Mobula's build/execute model

Mobula is the architectural reference for the complete lifecycle, not just an
error workaround. The equivalent stages in this integration are:

1. **Provision**: resolve the Lighter `accountIndex`, select an unused API-key
   slot, prepare `ChangePubKey`, obtain the wallet's L1 signature, and execute it.
2. **Preflight**: check bridge liquidity, the exact fee, withdrawal limits, and
   available balance before creating a Layerswap swap.
3. **Build**: prepare an immutable Lighter transfer whose memo contains the exact
   Layerswap Arbitrum deposit address. The relay seals the transaction, expected
   hash, account, key slot, network, and expiry in an HMAC token.
4. **Execute**: verify the connected wallet's L1 signature, submit the sealed
   transaction, and cross-check Lighter's returned hash against the signer-computed
   hash. Layerswap then monitors the actual Arbitrum deposit through its normal
   swap lifecycle.

Mobula adds a second signature over its generic multi-DEX envelope. This direct
Lighter relay does not need that extra adapter signature: Lighter's own EIP-191
message already binds the nonce, source account and route, API-key slot,
destination bridge account and route, asset, amount, fee, chain, and destination
memo. The sealed token prevents the relay request from swapping in another
transaction between build and execute, while Lighter's nonce and transaction
expiry provide replay protection.

Mobula's Lighter `withdraw` action remains a useful API-key and authorization
reference, but it is a normal withdrawal back to the account owner's wallet. It
cannot replace `/fastwithdraw` here because Layerswap must bind the withdrawal to
an arbitrary Arbitrum deposit address. Mobula's examples also contain chain IDs
that differ between pages, so protocol constants in this integration come from
the current official Lighter SDK and API instead.

## Vendored official signer

Lighter's L2 Schnorr/Poseidon signer is loaded server-side through the official Go
WASM interface; no browser or npm signer is used.

Files:

- `server/lighter-signer.wasm`
- `server/wasm_exec.js`

They were built/copied from `elliottech/lighter-go` commit
`c26ac340ce5d2e237c555949b6ab0927bd09e0df` with Go 1.24.4:

```sh
GOOS=js GOARCH=wasm go build -trimpath -o lighter-signer.wasm ./wasm/
cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" wasm_exec.js
```

SHA-256:

- `lighter-signer.wasm`: `d384fbd184feab4c3c06c25e696b1c69abe5b514c8fd7bf4fa4e08e9a401bcb9`
- `wasm_exec.js`: `0c949f4996f9a89698e4b5c586de32249c3b69b7baadb64d220073cc04acba14`

`next.config.js` includes both files in the relay route's output-file trace.

## Configuration and production boundary

The relay requires `LIGHTER_SIGNER_SECRET`; the `lighter-routes` feature flag must
also be enabled. In sandbox use:

```yaml
NEXT_PUBLIC_API_KEY: sandbox
NEXT_PUBLIC_LS_API: https://api-dev.layerswap.cloud/
```

The current generated API-key store is intentionally process-local and suitable
only for testnet. It survives Next.js development hot reloads, but a server restart
loses the private key while its public key remains registered on Lighter. Mainnet
deployment therefore requires durable,
encrypted-at-rest storage keyed by L1 address, account index, and API-key index,
plus a rotation/recovery path.

The API private key alone is not sufficient to redirect this integration's fast
withdrawals: every registration and withdrawal also requires an EIP-191 signature
from the account's connected Ethereum wallet over the exact Lighter payload.

References:

- https://docs.mobula.io/exec/perps/perp-payload-withdraw
- https://docs.mobula.io/exec/perps/perp-execute
- https://docs.mobula.io/rest-api-reference/endpoint/perp-payload-create-account
- https://apidocs.lighter.xyz/docs/deposits-transfers-and-withdrawals
- https://apidocs.lighter.xyz/docs/api-keys
- https://github.com/elliottech/lighter-python/blob/main/examples/withdraw_fast.py
