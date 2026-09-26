# @layerswap/widget-react

Embed the Layerswap swap or deposit widget in your React app. This package loads
the widget from the Layerswap CDN, keeping wallet SDKs and widget dependencies
out of your app's bundle.

## Install

```bash
pnpm add @layerswap/widget-react
```

Requires React and React DOM 18 or 19. Install `wagmi` only if you want to pass
your app's existing `wagmiConfig`. Config and callback types are included.

## Quick start

```tsx
import { LayerswapWidget } from '@layerswap/widget-react';

export function App() {
  return (
    <LayerswapWidget
      config={{ version: 'mainnet' }}
      fallback={<div>Loading widget…</div>}
    />
  );
}
```

- **Next.js:** Works with the App Router without a `next/dynamic` wrapper.
  Put integrations that pass callbacks in a Client Component (`'use client'`).
- **One widget per page:** Mount only one swap or deposit widget at a time.
- **Automatic updates:** Widget updates within the package's major version load
  from the fixed CDN source without redeploying your app. Exact build pinning is
  not supported.

## Deposit widget

Use `LayerswapDepositWidget` to fund a fixed destination. You choose the network,
supported tokens, and recipient address. Users choose where to send funds from.

```tsx
import { LayerswapDepositWidget } from '@layerswap/widget-react';

export function DepositPage({ recipientAddress }: { recipientAddress: string }) {
  return (
    <LayerswapDepositWidget
      config={{ version: 'mainnet' }}
      destination={{ network: 'BASE_MAINNET', tokens: ['USDC'] }}
      destinationAddress={recipientAddress}
      fallback={<div>Loading widget…</div>}
    />
  );
}
```

Pass a valid recipient address for the destination network. Both destination
props are required. The deposit widget accepts the common props below, plus
options such as `mode="button"` and `methods={['wallet', 'deposit_address']}`.
Import `DepositConfig` for the full set of deposit options.

## Use your existing wagmi config

Pass your app's wagmi config to share its connected EVM account and chain:

```tsx
'use client';

import { LayerswapWidget } from '@layerswap/widget-react';
import { wagmiConfig } from './wagmi';

export function SwapWidget() {
  return <LayerswapWidget wagmiConfig={wagmiConfig} />;
}
```

Use the config your app already provides to `WagmiProvider`. The widget adds
supported EVM chains that are missing from it and preserves your existing chain
order and transports.

If the same wallet appears twice after a refresh, check whether your wagmi config
combines a bare `injected()` connector with EIP-6963 discovery. The
[example host](../../../examples/widget-react-host/src/wagmi.ts) relies on
discovery without adding a bare `injected()` connector.

## Props

All common props are optional. Types can be imported from `@layerswap/widget-react`.

| Prop | Type | Purpose |
|---|---|---|
| `config` | `WidgetConfig` | API key, network version, theme, initial values, and settings. |
| `callbacks` | `WidgetCallbacks` | Widget errors, telemetry, and swap events. |
| `wagmiConfig` | `wagmi/Config` | Share your app's EVM wallet connection. |
| `walletDefaults` | `WalletDefaults` | Configure WalletConnect, TON, and Immutable Passport. |
| `walletProvidersConfig.include` | `WalletProviderId[]` | Use only these wallet providers, e.g. `['evm', 'solana']`. |
| `walletProvidersConfig.exclude` | `WalletProviderId[]` | Remove providers after applying `include`. |
| `fallback` | `ReactNode` | Content shown during loading or after an outer render failure. |
| `onReady` | `() => void` | Called once when the widget mounts. |
| `onError` | `(error: unknown) => void` | Load failures and errors caught by the outer render boundary. |

## Logging and events

Pass callback functions to connect your logging or analytics service. The widget
handles registration; you can forward each payload without handling every event
individually.

| Callback | Use it for |
|---|---|
| Top-level `onError` | CDN loading failures and outer render errors. |
| `callbacks.onError` | Errors and diagnostics reported inside the widget. |
| `callbacks.onTelemetry` | Flow progress, interactions, and operation outcomes/timings. |
| `callbacks.onSwapLifecycle` | Detailed journey events, including wallet prompts and retries. |
| `callbacks.onSwapStatusChange` | Observed backend swap status changes. |
| `callbacks.onSwapCreate` / `onSwapComplete` | Responding to swap creation or completion. |

```tsx
'use client';

import {
  LayerswapWidget,
  type WidgetCallbacks,
} from '@layerswap/widget-react';

const callbacks: WidgetCallbacks = {
  onError(report) {
    console.error('[widget error]', report);
  },
  onTelemetry({ name, attributes }) {
    console.info(name, attributes);
  },
};

export function App() {
  return (
    <LayerswapWidget
      config={{ version: 'mainnet' }}
      callbacks={callbacks}
      onError={(error) => console.error('[widget load/render error]', error)}
    />
  );
}
```

Replace the console calls with your logging SDK. Widget error reports are plain
objects with a message, type, and available diagnostics. They contain sanitized
error summaries, not raw provider errors, request bodies, or headers. An SDK that
requires an `Error` object needs a small conversion. Without `callbacks.onError`,
widget reports go to the console. Telemetry is opt-in.

`onSwapStatusChange` reports observed transitions into `ls_transfer_pending`,
`completed`, `failed`, and `expired`. Opening an existing swap establishes a
silent baseline; swaps created in the widget may report their first eligible
status. Unchanged statuses are not repeated on wallet retries or modal remounts.
Use `onSwapLifecycle` for UI progress, wallet actions, and refund phases.

Telemetry and lifecycle events overlap, so you usually only need telemetry for
analytics. Recognized wallet rejections are lifecycle outcomes, not error reports.
Callbacks are not awaited; handle rejected promises inside asynchronous logging
code.

## Loading and troubleshooting

The widget runs in your page's JavaScript context. Its manifest signature is
verified automatically using a key shipped with the loader; the CDN source and
verification policy cannot be overridden through props.

Top-level `onError` can receive a `ManifestError`, exported from
`@layerswap/widget-react`. Its `reason` identifies the failure:

| Reason | Meaning |
|---|---|
| `fetch` | The manifest request failed because of a network or CORS issue, or returned an unsuccessful HTTP status. |
| `parse` | The manifest is invalid JSON or is missing required fields. |
| `signature` | The manifest signature is missing, invalid, or could not be verified. |
| `kill-switch` | Layerswap has disabled loading through the manifest. |
| `stale` | The manifest has expired or lacks a valid expiry; Layerswap must republish the channel. |
| `incompatible` | The manifest protocol major does not match the loader. |

For transient loading failures, remount the widget to retry after the underlying
issue clears. The `fallback` remains visible after an outer render failure;
use top-level `onError` to show an appropriate error or retry state.

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
   registered into the MF shared scope from the host as singletons, including
   the JSX runtimes and ReactDOM renderer entry points used by the remote.
   React and ReactDOM must have the same version (React 18 or 19). The remote
   reuses those host modules together, avoiding a mixture of React 18 and 19.
   Everything else (wagmi, viem, react-query, zustand, wallet SDKs)
   is bundled inside the remote.
5. The remote's exposed `./Widget` component is rendered via
   `React.lazy` inside the host's React tree.

Heavy dependencies stay in the remote bundle on the CDN instead of being added
to your app's bundle.

## Content Security Policy

If your app uses a CSP, allow the widget CDN in `script-src` and `connect-src`,
and allow the API, wallet, and RPC endpoints your integration uses in
`connect-src`. This release loads from
`https://cdn.layerswap.io`. Widget styles currently require
`'unsafe-inline'` in `style-src`.

Include `https://layerswap.io` in `connect-src`: the widget fetches extended-route
flags from `/app/api/flags`, and Polymarket withdrawals use
`/app/api/polymarket/relay`. Also allow the WalletConnect and chain RPC endpoints
used by your enabled providers, including any custom wagmi transports.

```text
Content-Security-Policy:
  default-src 'self';
  script-src  'self' https://cdn.layerswap.io;
  connect-src 'self' https://cdn.layerswap.io https://api.layerswap.io
              https://layerswap.io https://*.walletconnect.com
              https://*.walletconnect.org;
  style-src   'self' 'unsafe-inline';
  img-src     'self' data: https:;
  font-src    'self' data:;
  frame-src   'self';
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

### Maintaining React sharing

The loader build generates `src/reactShares.generated.ts` from the CDN's
production and development graphs, including dependency, lazy, and emitted
JSX imports. No CDN assets are emitted. Use `pnpm --filter
@layerswap/widget-react check:shares` to check the generated file.

React module imports are discovered automatically, without a manually maintained
module list. Newly required modules need an updated loader in customer builds;
generation does not update loaders already deployed by customers.
Vanilla hosts continue using the CDN's own React/ReactDOM pair.

Customers using the previous loader must receive the updated loader and
rebuild their app to supply the missing host modules, alongside the CDN fix.

## Security model

In-page CDN delivery means the widget's code runs in your host's
context. Trust is rooted in **the signing key baked into this package**
(see `src/manifest.ts`). Rotating the production key requires a new
`@layerswap/widget-react` release; integrators with SRI-pinned installs
upgrade by bumping the package version. The CDN itself does not sign
anything — it just hosts the artifact and the manifest.

## Further reading

- [Layerswap documentation](https://docs.layerswap.io): integration guides and reference documentation.
- [Example React host](../../../examples/widget-react-host/): a runnable Vite integration.

For vanilla JavaScript, use `mountWidget` or `mountDepositWidget` from
`@layerswap/widget-js`. They accept the same widget callbacks.
