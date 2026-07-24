# CLAUDE.md — `packages/widget/core`

Widget-specific conventions. See the repo-root `CLAUDE.md` for project-wide guidance and the **Merge Safety** checklist (these contracts are common casualties of silent semantic conflicts — verify with `pnpm check:types` after merges).

## Shared contracts

These types and their consumers live in different files, so a change on one side breaks the other without a git conflict marker. Follow the canonical helper.

The contract types themselves are defined in `@layerswap/wallet-core` (import from `@layerswap/wallet-core/types`); the widget's `@/types` files are intentional backward-compat re-export shims feeding the public `@layerswap/widget/types` subpath. Add or change contract types **in wallet-core, never in the widget shims** — chain packages resolve the contract from wallet-core and will never see widget-local additions.

### Wallet icons — `Wallet.icon` is a `string` URL, not a component

`Wallet.icon` (and `InternalConnector.icon`) is a URL / `data:` URI (`icon?: string`) — both types defined in `@layerswap/wallet-core/types`. It is **not** a React component.

- **Render wallet icons via `@/components/Wallet/WalletIconView`** — it wraps `ImageWithFallback` and falls back to `AddressIcon`/`WalletIcon` when no icon URL is present.
- For a custom fallback (e.g. a network-aware `AddressIcon`), guard on `wallet?.icon` and render `WalletIconView` (or `ImageWithFallback` directly, as in `SummaryRow.tsx`) in the truthy branch.
- **Never** write `<wallet.icon />` (treats a string as a component) or a raw `<img>` (no broken-URL fallback, no `alt`).

### Wallet providers — narrow before reading resolver fields

`walletProviders` is the union `(WalletProvider | WalletWrapper | WalletProviderDescriptor)[]` (all three from `@layerswap/wallet-core/types`). Only `WalletProvider` carries resolver fields (`transferProvider`, `balanceProvider`, `gaslessProvider`, `extendedRouteProvider`, etc.); descriptors are lazy stubs and wrappers have no resolvers.

- In `resolverContext`, extract every provider list from **`realProviders`** (`walletProviders.filter(isWalletProviderWithResolvers)`), never from raw `walletProviders`. Adding a new resolver type? Map over `realProviders` like its siblings.
- **`extendedRouteProvider` registration happens in two places, both required.** `LayerswapProvider` registers eager providers (via `extractExtendedRouteProviders`) inside a memo keyed on `walletProviders` alone, declared *before* the memo that constructs `LayerSwapAppSettings` — the registry must be populated before `mergeExtendedSourceNetworks` runs, and `ResolverProviders`' post-commit effect is too late for the first settings object (a descendant's `setState` never rerenders the parent). The effect in `resolverContext` re-registers the full list (including descriptor-hydrated providers) after hydration. Removing either call reintroduces a timing bug; keying the eager registration on anything besides `walletProviders` (e.g. `settings`) reintroduces a clobber bug — a settings-only change would overwrite the post-hydration registry with the eager-only list, and the effect's unchanged deps would never restore it. `setExtendedRouteProviders` is an idempotent assignment, safe to call from both.

### Wallet provider availability is async — gate sticky decisions on `useWalletProvidersReady()`

Wallet connections/stubs are published to the registry in `WalletProvidersProvider`'s post-commit effect, so during the first commit `useWallet(network, purpose)` returns **no provider for any network** — indistinguishable from "this network has no wallet support". Any effect that commits durable state off provider availability (the deposit-method default in `DepositMethodComponent` is the canonical case) must check `useWalletProvidersReady()` first (imported from `@layerswap/wallet-core` — the registry lives in wallet-core's `WalletProvidersRegistryProvider`) and include it (plus `provider`) in its deps. Committing early locks query-param entries into `deposit_address` mode, which hides wallet-only routes (extended sources like Polymarket) from the picker.

### WalletConnect registry entries — per-connector, not per-provider

Registry (WalletConnect Explorer) metadata is attached to each connector tile via the `WC_REGISTRY_MARKER` symbol and read back with `getRegistryEntry(connector)` — both live in `@layerswap/wallet-core`. There is **no** `provider.registryWallets` array — that per-provider field was removed in the EVM/SVM wallet-class refactor. `splitRegistryConnectors(configured, registryWallets, …)` (in `@layerswap/wallet-evm`, `src/service/connectorsHelpers.ts`) takes the fetched list as an argument and tags each connector; it does not read a provider field.

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
