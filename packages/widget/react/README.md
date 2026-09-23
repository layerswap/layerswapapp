# @layerswap/widget-react

React loader that fetches the Layerswap widget at runtime from a CDN-hosted
Module-Federation remote. The widget code and its heavy dependencies
(framer-motion, radix, formik, swr, wallet adapters) **never enter your
bundle** — your app installs only this thin loader.

## Install

```bash
pnpm add @layerswap/widget-react
```

`react` and `react-dom` are required peer dependencies — they are the only
libraries the loader shares with the remote (see "How it works"). `wagmi` is
an **optional**, types-only peer: install it if you pass a `wagmiConfig`
prop. Everything else the widget needs ships inside the CDN remote. Config
and callback prop types are bundled with this package (re-exported from
`@layerswap/widget-types`), so no extra package is needed for typed config.

## Quick start

```tsx
import { LayerswapWidget } from '@layerswap/widget-react';

export function App() {
  return (
    <LayerswapWidget
      config={{ version: 'mainnet' }}
      fallback={<div>Loading widget…</div>}
      onReady={() => console.log('widget mounted')}
      onError={(e) => console.error(e)}
    />
  );
}
```

That's it — there is nothing to configure about the widget's source. It is
always fetched from the canonical Layerswap CDN (rolling `v1` channel) baked
into the package, with signature verification on. The manifest layer handles
updates transparently, so integrators auto-receive forward-compatible builds
without a redeploy and cannot repoint the widget at another origin.

Works in the Next.js App Router out of the box: the component declares
`"use client"`, renders `fallback` during server prerender/hydration, and
only starts the browser-only loader after hydration — no `next/dynamic`
wrapper needed.

The npm package major selects the CDN protocol major:

```text
@layerswap/widget-react@1.x → /v1/manifest.json
@layerswap/widget-react@2.x → /v2/manifest.json
```

Minor and patch widget builds roll forward within that major without an
integrator redeploy. Exact CDN builds are not a public pinning API.

## Deposit widget

`LayerswapDepositWidget` renders the deposit flow instead of the full swap
form: you fix the destination (one network, its allowed tokens, and the
recipient address) and the end user only picks a funding source. Delivered
through the same verified manifest + Module Federation pipeline as
`LayerswapWidget`, and it accepts all of the same props plus the
deposit-specific ones (`DepositConfig` in `@layerswap/widget-types`).

```tsx
import { LayerswapDepositWidget } from '@layerswap/widget-react';

export function DepositPage() {
  return (
    <LayerswapDepositWidget
      config={{ version: 'mainnet' }}
      destination={{ network: 'BASE_MAINNET', tokens: ['USDC'] }}
      destinationAddress="0x…"
      fallback={<div>Loading widget…</div>}
    />
  );
}
```

Only one Layerswap widget (of either kind) may be live per page — the widget
keeps process-global state. Vanilla hosts use `mountDepositWidget` from
`@layerswap/widget-js` the same way they use `mountWidget`.

## Reusing the host's wagmi config

If your app already runs wagmi, pass its `Config` to the widget so EVM
state (account, chain, signer) is shared:

```tsx
import { WagmiProvider } from 'wagmi';
import { LayerswapWidget } from '@layerswap/widget-react';
import { wagmiConfig } from './wagmi';

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <LayerswapWidget
          wagmiConfig={wagmiConfig}
          config={{ version: 'mainnet' }}
        />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

The widget's EVM wallet provider adopts the host's `Config` via
`createEVMProvider({ wagmiConfig })` and subscribes to its store. No
nested `<WagmiProvider>`, no second connect flow — the widget reads the
host's connected account/chain through the same `Config` instance.

You only need to declare the chains **your own app** uses — the widget
appends every Layerswap-supported EVM chain (with its transports) to the
adopted config at init, so network switching and transfers work on chains
you didn't list. Your chain order is preserved, and your transports win
for chains you did configure.

**Gotcha:** wagmi v2 defaults `multiInjectedProviderDiscovery: true`,
which auto-registers an EIP-6963 connector for every announced injected
provider alongside any bare connector you declared. With both an
`injected()` and the auto-discovered MetaMask connector active,
`reconnect()` restores both against the same wallet on refresh — the
widget then shows the same physical wallet twice. Either:

- Set `multiInjectedProviderDiscovery: false` if you intend a single
  declared connector, or
- Drop the bare `injected()` and rely on the discovered connectors.

## Props

The widget's source (manifest URL + signature verification) is **not**
configurable — it is baked into the package. The props below are all about the
widget's behavior, not where it comes from.

| Prop | Type | Description |
|---|---|---|
| `config` | `WidgetConfig` (from `@layerswap/widget-types`, re-exported here) | Forwarded to the widget's `LayerswapProvider`. Includes `apiKey`, `version`, `theme`, `initialValues`, `settings`. |
| `callbacks` | `WidgetCallbacks` | `onSwapCreate`, `onSwapComplete`, `onSwapLifecycle`, `onError`, `onSwapModalStateChange`, etc. `onSwapLifecycle` reports semantic steps, outcomes, and reason codes for journey observability. |
| `wagmiConfig` | `wagmi/Config` | Host wagmi config the widget adopts for EVM. |
| `walletDefaults` | `WalletDefaults` | `walletConnect` (projectId, etc.), `ton`, `immutablePassport`. |
| `walletProvidersConfig.include` | `WalletProviderId[]` | Allowlist — keep only these chains, e.g. `['evm', 'solana']`. Applied before `exclude`. |
| `walletProvidersConfig.exclude` | `WalletProviderId[]` | Blocklist — drop chains from the provider list — `['tron', 'fuel']`, etc. |
| `fallback` | `ReactNode` | Shown while loading. |
| `onReady` | `() => void` | Fires once the widget mounts. |
| `onError` | `(err) => void` | Fires on load/render failure; receives a `ManifestError` for manifest issues. |

`callbacks.onSwapStatusChange` reports changes to `(swapId, type, phase)`;
late address data does not repeat the same notification. `type` is the API
status and `phase` is the UI state, which can become `completed` or `failed`
before the API status catches up. A later API status change is a separate event.
Starting another wallet attempt permits a new notification even if it reaches
the same status and phase as the previous attempt.

`callbacks.onSwapLifecycle` delivers phase and transaction observations once
per meaningful transition. Confirmation counts, context enrichment, and React
effect replay do not duplicate them. New transactions, phase recovery, and
user actions (including every wallet prompt and retry) remain observable.
Reopening the swap, returning to the form, or submitting a new form resets
observation deduplication. Wallet transfer cancellations declared by the
adapter (`userRejectedError` from `@layerswap/wallet-core/errors`) use
`wallet_action_rejected` with `reasonCode: 'user_rejected'`; they no longer
invoke `callbacks.onError`. A custom `TransferProvider` that only sets
`name = 'TransactionRejected'` shows the rejected copy but is reported as a
failure through `callbacks.onError` and `wallet_action_failed`.

`callbacks.onTelemetry` is an optional, vendor-neutral analytics stream. Each
event is `{ name, attributes }`, discriminated by `name`:

| `name` | Event-specific attributes |
|---|---|
| `widget_flow` | `step` (any `onSwapLifecycle` step, plus `form_viewed`, `form_started`, `validation_shown`), optional `outcome`, `reason_code` |
| `widget_interaction` | `action`, `trigger` |
| `widget_operation` | `operation` (e.g. `quote_request`, `swap_creation`, `balance_fetch`, `wallet_transfer`), `operation_id`, `outcome`, `duration_ms` |

Every event carries `schema_version: 1` and a unique `event_id`; all other
attributes are primitives (`string | number | boolean`), never DOM text or
provider response bodies. A handler that throws is ignored and never affects
the swap. `widget_flow` events carry journey context (`flow_id`, `swap_id`,
`submission_count`, progress flags) and deduplicate repeated phase and
transaction observations the same way `onSwapLifecycle` does; a new journey
starts on every `form_submitted`. Form text editing reports `form_started`
once rather than an interaction per keystroke.

```tsx
import type { WidgetTelemetryEvent } from '@layerswap/widget-react';

const onTelemetry = (event: WidgetTelemetryEvent) => {
  if (event.name === 'widget_operation') {
    analytics.track(event.attributes.operation, {
      outcome: event.attributes.outcome,
      durationMs: event.attributes.duration_ms,
    });
  }
};
```

These contracts also apply to `@layerswap/widget-js` and CDN consumers.

## How it works

1. `<LayerswapWidget>` fetches `manifest.json` from the CDN channel URL
   baked into `@layerswap/widget-js`.
2. If `manifest.killSwitch === true`, refuses to load and fires
   `onError` with `ManifestError('kill-switch')`.
3. Verifies a detached ECDSA P-256 signature on the manifest body against
   the public key baked into this package. Tampered / unsigned manifests
   are rejected.
4. Calls `@module-federation/runtime` to load `manifest.remoteEntry`
   (resolved relative to the manifest URL). React and react-dom are
   registered into the MF shared scope from the host as singletons
   (React 18/19 required) so the remote reuses the host's instances.
   Everything else (wagmi, viem, react-query, zustand, wallet SDKs)
   is bundled inside the remote.
5. The remote's exposed `./Widget` component is rendered via
   `React.lazy` inside the host's React tree.

Heavy deps stay in the remote bundle on the CDN. Your bundle shrinks
accordingly.

## Recommended Content Security Policy

The widget is served from the fixed origin baked into this package release —
currently `https://layerswapcdntest.blob.core.windows.net` (the
`WIDGET_MANIFEST_URL` in `@layerswap/widget-js`; if a future release moves
to a custom domain such as `cdn.layerswap.io`, this section moves with it).
A tight CSP that allowlists exactly that origin plus the LayerSwap endpoints
gives integrators the smallest blast radius if the supply chain is ever
compromised:

```
Content-Security-Policy:
  default-src 'self';
  script-src   'self' https://layerswapcdntest.blob.core.windows.net;
  connect-src  'self' https://layerswapcdntest.blob.core.windows.net
               https://api.layerswap.io https://layerswap.io
               https://*.walletconnect.com https://*.walletconnect.org;
  style-src    'self' 'unsafe-inline';
  img-src      'self' data: https:;
  font-src     'self' data:;
  frame-src    'self';
```

Notes:
- The CDN origin appears in both `script-src` (remoteEntry + chunks) and
  `connect-src` (manifest fetch).
- `https://layerswap.io` in `connect-src` covers the extended-route feature
  flags endpoint (`/app/api/flags`) and the Polymarket relayer proxy
  (`/app/api/polymarket/relay`) — without it those routes are disabled or
  fail at withdrawal time.
- `'unsafe-inline'` for `style-src` is required because the widget injects
  styles via `style-loader` at runtime. Removing this requires a build
  change in `apps/widget-cdn`.
- `connect-src` includes WalletConnect relays — without them, WC v2
  connections fail.
- Add any additional RPC endpoints your wagmi `transports` use, plus the
  default public RPC endpoints of the chains you enable.

## Failure modes

| Symptom | `onError` payload | Cause |
|---|---|---|
| Widget never mounts, error in console | `TypeError: fetch` etc. | Manifest URL unreachable / CORS misconfigured on the CDN. |
| Widget never mounts | `ManifestError('parse')` | Manifest JSON missing `remoteEntry` field. |
| Widget never mounts | `ManifestError('kill-switch')` | Operational kill-switch set on the manifest. |
| Widget never mounts | `ManifestError('signature')` | Manifest has no/invalid signature (verification is always on). |
| Widget never mounts | `ManifestError('stale')` | Manifest expired (or carries no validity window) — replay protection refuses possibly-rolled-back builds. Layerswap re-publishing the channel resolves it. |
| Widget never mounts | `ManifestError('incompatible')` | Manifest protocol major does not match this loader package major. |
| Widget loads but errors at render | Component-level | Catch via `callbacks.onError`. |

## Local development

The widget source and signature verification policy are owned entirely by
`@layerswap/widget-js`. They cannot be changed through props, environment
variables, or globals. The runnable Vite host in
`examples/widget-react-host/` therefore exercises the same signed production
channel as an integrator.

## Security model

In-page CDN delivery means the widget's code runs in your host's
context. Trust is rooted in **the signing key baked into this package**
(see `src/manifest.ts`). Rotating the production key requires a new
`@layerswap/widget-react` release; integrators with SRI-pinned installs
upgrade by bumping the package version. The CDN itself does not sign
anything — it just hosts the artifact and the manifest.
