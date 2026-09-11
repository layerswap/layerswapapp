# Connected-wallet session context

Implemented with user approval on 2026-09-08 in the frontend working tree. No FluxCD, dashboard, datasource, sampling, retention, consent or trace-span changes.

## Source contract

`FaroWalletContext` is mounted inside `WidgetWrapper` beneath `LayerswapProvider`. It subscribes to the existing wallet registry, including updates from its provider stores. It does not load wallet adapters, open prompts, request accounts or call wallet RPC methods. It renders nothing and does not rerender the swap form on provider changes.

Session attributes are string-valued:

| Attribute | Meaning |
| --- | --- |
| `connected_wallets` | JSON array of current wallet records, separate from swap source/destination addresses |
| `connected_wallet_count` | Number of records included after deduplication and bounds |
| `connected_wallets_omitted` | Records omitted for invalid/oversized required fields or the total size bound; not a user/wallet-population metric |
| `connected_wallets_state` | `ready`, `restoring` (some provider/restore state incomplete), or `unavailable` (no registry entries, including cleanup) |

Each record contains `wallet_address`, `wallet_family`, `wallet_connector` and optional `wallet_chain_id`. These are **elements inside the JSON string**, not separately emitted scalar session attributes. The fresh Loki verification below observes `session_attr_connected_wallets` and verifies extraction of element zero; arbitrary array membership and Tempo mapping remain unverified.

- Address: the current `Wallet.address` from each provider's `connectedWallets`. Multiple simultaneous connections are retained. This does not enumerate every account in `Wallet.addresses`, request additional accounts, or collect arbitrary wallet metadata.
- Family: the known provider ID (`evm`, `starknet`, `fuel`, `paradex`, `bitcoin`, `ton`, `solana`, `tron`); unrecognized custom providers use `unknown`. No family is inferred from an address or connector brand.
- Connector: `Wallet.internalId`, falling back to `Wallet.id`. These identify the connector exposed by the adapter, not necessarily a human-readable brand name.
- Chain: only `Wallet.chainId`, converted to a string. Missing/invalid values stay absent. The swap form's network is never used to guess this value; there is no `wallet_network`.
- Each string is limited to 256 characters; invalid/oversized required fields omit that record rather than truncate an address. Whole records are deterministically sorted/deduplicated and the JSON is bounded to 6,000 UTF-8 bytes before the existing sanitizer. Omission is explicit. This is a payload integrity bound, not production sampling.

## Ownership and lifecycle

`faro-session-context.ts` defines independent wallet and swap key allowlists. Lifecycle replacement removes old swap fields such as reasons/hashes but retains wallet fields, unrelated metadata, session ID, overrides and SDK attributes (`isSampled`, `previousSession`). Wallet replacement leaves swap data alone. Future swap fields must be registered in the swap ownership list.

Account/chain updates replace the snapshot; disconnect removes the corresponding record. Unmount clears the wallet snapshot and marks it unavailable. No-op updates do not call `setSession`. A guarded Faro metadata listener reapplies the latest observed wallet snapshot after SDK session rotation/adoption, without changing the session ID or inventing connections.

Restoring providers are marked incomplete. Persisted addresses are not treated as proof of a current connection by the observer: its first snapshot replaces those fields with actual observed state. **Early startup signals before the observer mounts can still contain Faro-restored session metadata.** A broader startup-persistence policy is not implemented here. Cross-tab adoption handling is code-tested but not browser-verified; browser restoration, ordering and sample behavior still need controlled validation.

Session context is metadata on subsequent telemetry, not a new connect/disconnect event stream. Historical emitted records retain their historical context. Wallet fields are not copied onto OTLP spans by this change. Existing persistent Faro session storage still applies: these addresses are linkable data and require the agreed access/retention controls. No stream labels or metric dimensions were added.

## Verification

- `pnpm --filter @layerswap/bridge test:faro`: 18 passing tests (9 sanitizer, 8 wallet/context, 1 stored-wallet fixture check).
- Full bridge TypeScript check passes.
- Seven existing dashboard regression tests pass.
- The running development app returned HTTP 200 after adding the observer. This is server compilation/serving evidence, not browser execution evidence.
- Tests cover selected-address projection, multiple wallets, optional/changed chains, disconnect, deduplication/no-op updates, incomplete restoration, stale swap cleanup, preserving unrelated/SDK metadata, payload bounds, observer cleanup/remount, failure isolation and SDK-session adoption. Inputs are synthetic, not captured browser fixtures.
- A subsequent dev Loki check verifies the connected-wallet fields below. No paired outgoing wallet payload or Tempo storage is verified.

## Stored connected-wallet evidence — 2026-09-08

After the user reported reloading/connecting, a query at 13:52:20 UTC found 200 recent matching records (the query limit, not total volume) in the 13:32:19.297–13:52:19.297 UTC window. The sampled records contain one session and one connected address, with `wallet_family=evm`, `wallet_connector=metaMaskSDK`, `wallet_chain_id=43114`, count `1`, omitted `0`, state `ready`. Stored attribution is `layerswap-frontend` / `testnet` / `local`. The wallet-selected chain is independent of the application's API-mode environment; no network name was inferred.

Errors, `swap_lifecycle` and HTTP mirror events retain the JSON wallet snapshot alongside journey/step context. This shows coexistence in these stored records, not an account-change/disconnect test. A separate raw-line query (limit 10) showed only `source`, `service_name`, `detected_level` as stream-label names and no structured-metadata tuple. Wallet data is parsed log content, not an ingestion label. The [stored fixture](fixtures/faro-wallet-loki-observed.json) contains three sanitized projections; no raw addresses or error contents are included.

Discovery query executed successfully:

```logql
{source="faro"} |= "connected_wallets" | logfmt | __error__="" | app_name="layerswap-frontend"
```

At 13:53:38 UTC an exact address query returned 10 matching records (limit 10), with equality checked against the original address in memory. Template below uses placeholders; it selects **only array element zero**, not any wallet in an arbitrary-length list. Extracted `wallet_address` is a query-time field, not a new stream label. `line_format` replaces the displayed line with wallet JSON, so use the original query to inspect the full error/event.

```logql
{source="faro"} |= "connected_wallets" | logfmt | __error__="" | app_name="layerswap-frontend"
| session_id="<session ID>"
| line_format "{{.session_attr_connected_wallets}}"
| json wallet_address="[0].wallet_address" | __error__=""
| wallet_address="<exact address>"
```

Account/chain changes, multiple simultaneous wallets, restoration and cross-tab behavior remain controlled-browser checks. The initial discovery query was not restricted to the earlier test's session ID; it does not prove session rotation occurred. No production distributions, rates or thresholds were calculated.

## Disconnect verification — 2026-09-08

After the user reported disconnecting in the app, a read-only dev Loki check at 14:05:30 UTC recovered the exact prior connected exemplar by tuple timestamp, then queried later records for that original session ID. Of the latest 30 returned rows (query limit 30), 12 had `session_attr_connected_wallets="[]"` and count `0`, including the newest record. The newest empty exemplar has state `ready`, omitted `0`, unchanged application/environment/version, and the exact same original session ID, journey ID and step as the connected exemplar. IDs were compared in memory; only aliases and equality booleans are saved in the [disconnect fixture](fixtures/faro-wallet-disconnect-loki-observed.json).

This verifies removal from the connected-wallet snapshot on sampled subsequent stored records, with journey context preserved. It does not delete historical records or clear distinct swap-form address fields, nor prove every later record is empty. The browser action was user-operated; no paired outgoing disconnect body was captured. Account/chain changes and removing one of multiple simultaneous wallets remain unverified. Tempo remains deferred.

The repository-referenced React guidance file was unavailable at `.cursor/skills/vercel-react-best-practices/SKILL.md`; implementation followed the existing registry/component patterns and was checked with tests and TypeScript.

## Next controlled browser check

Completed stored checks: connect, disconnect, then reconnect with a different account. At 14:11:00 UTC, the latest sampled dev Loki record contained the new address only, count `1`, omitted `0`, state `ready`, connector `metaMaskSDK`, family `evm`, chain `43114`. Original-ID comparison confirms the same Faro session and application/environment/version. The journey ID differs from the first connected exemplar; context is present, but journey preservation or the cause of the change is not established. No instrumentation was changed during this verification.

Exact first-element address lookups returned 10 records each (limit 10) for both original and replacement addresses in that same session. Thus the earlier address remains usable to discover historical session records after disconnect/reconnect; it is absent from the current connected-wallet snapshot. See the [reconnection fixture](fixtures/faro-wallet-reconnect-loki-observed.json). The latest-record query reached its 30-row limit, not a complete history. This proves neither cross-session identity nor in-place account switching without disconnect. Paired outgoing payload capture, in-place account/chain changes, multiple wallets and cross-tab behavior remain pending.

1. Reload `http://localhost:3000` with Network recording enabled, using the existing Faro collector setting.
2. Connect a test wallet (or inspect a restored connection). Do not sign or submit a transaction.
3. Inspect an outgoing `collect` body at `meta.session.attributes`: parse `connected_wallets`, check the current address/connector, optional actual chain and state/count. Retain a sanitized excerpt; do not share raw wallet/provider metadata.
4. Switch the selected account, then disconnect. Trigger a harmless fetch if no new telemetry appears. Subsequent bodies must show the replacement address, then removal/`[]` with count `0`. When all providers are initialized, state should be `ready`; unknown/restoring is not proof of no connected wallet.
5. Inspect a second simultaneously connected wallet if safely available. Disconnecting one must preserve the other. Exercise a safe existing lifecycle transition without approving a financial action; wallet and swap context must coexist.
6. Use the session ID and capture time to query dev Loki, observe the actual stored field name/JSON encoding, and verify address lookup with exact equality after JSON parsing. Inspect raw stream labels separately; do not promote wallet/session identifiers.
7. Repeat reload/restoration and cross-tab session adoption. Check that addresses from a different tab do not become this tab's current wallet context after synchronization.

Update the telemetry contract only for fields actually observed at each boundary. Tempo remains deferred; no synthetic threshold or production baseline is justified.
