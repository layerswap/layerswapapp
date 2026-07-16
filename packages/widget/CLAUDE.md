# CLAUDE.md — `packages/widget`

Widget-specific conventions. See the repo-root `CLAUDE.md` for project-wide guidance and the **Merge Safety** checklist (these contracts are common casualties of silent semantic conflicts — verify with `pnpm check:types` after merges).

## Shared contracts

These types and their consumers live in different files, so a change on one side breaks the other without a git conflict marker. Follow the canonical helper.

### Wallet icons — `Wallet.icon` is a `string` URL, not a component

`Wallet.icon` (and `InternalConnector.icon`) is a URL / `data:` URI (`icon?: string`). It is **not** a React component.

- **Render wallet icons via `@/components/Wallet/WalletIconView`** — it wraps `ImageWithFallback` and falls back to `AddressIcon`/`WalletIcon` when no icon URL is present.
- For a custom fallback (e.g. a network-aware `AddressIcon`), guard on `wallet?.icon` and render `WalletIconView` (or `ImageWithFallback` directly, as in `SummaryRow.tsx`) in the truthy branch.
- **Never** write `<wallet.icon />` (treats a string as a component) or a raw `<img>` (no broken-URL fallback, no `alt`).

### Wallet providers — narrow before reading resolver fields

`walletProviders` is the union `(WalletProvider | WalletWrapper | WalletProviderDescriptor)[]`. Only `WalletProvider` carries resolver fields (`transferProvider`, `balanceProvider`, `gaslessProvider`, `extendedRouteProvider`, etc.); descriptors are lazy stubs and wrappers have no resolvers.

- In `resolverContext`, extract every provider list from **`realProviders`** (`walletProviders.filter(isWalletProviderWithResolvers)`), never from raw `walletProviders`. Adding a new resolver type? Map over `realProviders` like its siblings.
- **`extendedRouteProvider` registration lives in `resolverContext`'s effect** (operating on post-resolution `resolvedProviders`) — do not re-register it during render in `LayerswapProvider`.

### WalletConnect registry entries — per-connector, not per-provider

Registry (WalletConnect Explorer) metadata is attached to each connector tile via the `WC_REGISTRY_MARKER` symbol and read back with `getRegistryEntry(connector)`. There is **no** `provider.registryWallets` array — that per-provider field was removed in the EVM/SVM wallet-class refactor. `splitRegistryConnectors(configured, registryWallets, …)` takes the fetched list as an argument and tags each connector; it does not read a provider field.

### Extended-route flags — per-provider fail direction, resolved server-side

Extended source routes (Hyperliquid, Polymarket) are gated by `ExtendedRouteFlags`, applied in `lib/extendedRoutes/registry.ts` → `activeProviders()`.

- **Every `ExtendedRouteProvider` declares `enabledByDefault`** — the behavior when no resolved flag covers it. Choose by failure mode: `true` (fail-open) only for pure client-side synthesis (Hyperliquid); `false` (fail-closed) for routes with a server dependency — credentials, a gated relayer proxy — that would break the user mid-flow (Polymarket). A new provider must make this choice explicitly.
- **Flag resolution has two paths that must stay in sync with `apps/bridge/flags.ts`:** the bridge SSR resolves via the Vercel Flags SDK and injects `settings.featureFlags`; every other client (CDN embeds, deposit integrations) gets them from `GET https://layerswap.io/app/api/flags` inside the widget's `getSettings()` (`lib/extendedRoutes/remoteFlags.ts`). Callers that resolve flags first-party pass `{ includeFeatureFlags: false }`.
- **Polymarket's effective enablement is `isPolymarketEnabled`** (dashboard flag AND builder creds, plus a `POLYMARKET_ROUTES_OVERRIDE` env opt-in) — enforced identically by the flags endpoint and the relayer proxy. The proxy refuses with `{ "error": "provider_disabled" }`, which the wallet package's `relayerClient` maps to user-facing "temporarily unavailable" copy.
- **Intended end state:** the LayerSwap API owns route availability in its settings/routes payload; when that lands, prefer API-provided flags and retire the bridge flags endpoint.

## Commands

```bash
pnpm check:types   # tsc --noEmit — run this after every merge
pnpm build         # clean + build ESM/types + CSS
```
