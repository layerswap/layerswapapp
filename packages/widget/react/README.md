# @layerswap/widget-react

Embed the Layerswap swap or deposit widget in your React app. This package loads
the widget from the Layerswap CDN, keeping wallet SDKs and widget dependencies
out of your app's bundle.

## Install

```bash
pnpm add @layerswap/widget-react
```

Requires React and React DOM 18 or 19. Node-based builds/SSR require Node 18.20.x or Node 20.10+ (JSON import attributes). Config and callback types are included.
For an existing wagmi app, use the `/wagmi` entry point described below; the default entry point keeps wallet SDKs out of the host bundle.

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

Internally, widget telemetry identifies the rendered form as `cross-chain`,
`exchange`, `deposit-address`, `deposit-widget-address`, or
`deposit-widget-wallet`. These values describe the active flow and are not
configuration options for the React package.

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

The telemetry `form_mode` identifies the active form: `cross-chain`, `exchange`,
`deposit-address`, `deposit-widget-address`, or `deposit-widget-wallet`. These
values describe the user's flow; they are not additional widget configuration options.

## Use your existing wagmi config

Use the dedicated entry point to share the host's actual wagmi, `@wagmi/core`,
viem, and React Query modules with the CDN widget. It reuses the exact config
passed to your host's `WagmiProvider`; it never creates another config.

```bash
npm install @layerswap/widget-react wagmi@2.19.5 @wagmi/core@2.22.1 viem@^2.38.0 @tanstack/react-query@^5.90.11
```

```tsx
'use client';

import { LayerswapWidget } from '@layerswap/widget-react/wagmi';
import { wagmiConfig } from './wagmi';

export function SwapWidget() {
  return <LayerswapWidget wagmiConfig={wagmiConfig} />;
}
```

`LayerswapDepositWidget` is available from the same entry point. Keep the widget
under your host's `WagmiProvider` and `QueryClientProvider`. Supported peers are
wagmi `>=2.14.11 <3`, core `>=2.16.4 <3`, viem `>=2.38.0 <3`, and React Query
`>=5.90.11 <6`. Older viem versions can install alongside newer wagmi but fail
at runtime because required actions are absent.

Keep `@wagmi/core` on the version declared by your installed wagmi package:

```bash
node -p "require('wagmi/package.json').dependencies['@wagmi/core']"
npm ls wagmi @wagmi/core
```

Do not upgrade core independently. With pnpm, also check `pnpm why @wagmi/core`:
different optional-peer contexts can create duplicate copies of the same version.
This workspace aligns the store shim to wagmi 2.x's 1.4.0 dependency to prevent that. The tested pairs are:

| wagmi | core |
| --- | --- |
| 2.14.11 | 2.16.4 |
| 2.14.16 | 2.16.7 |
| 2.15.7 | 2.17.3 |
| 2.16.9 | 2.20.3 |
| 2.17.5 | 2.21.2 |
| 2.18.2 / 2.19.5 | 2.22.1 |

**Migration:** if you previously passed `wagmiConfig` to the root entry point,
change the component import to `@layerswap/widget-react/wagmi`. The root entry
point now rejects that configuration rather than silently running a separate
wallet runtime. Types and other exports remain available from the root.

The shared entry point rejects unsupported versions and duplicate core instances.
Module Federation registers the host modules as already loaded, strict singletons,
so a newer remote fallback cannot replace them. Always pass your config on the
first render and reuse it; replacing an active config throws a clear error.

The widget adds supported EVM chains that are missing from your config and
preserves your existing chain order and transports. Keep workspace build versions
pinned; public peer ranges are independent of those build pins.

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

## Further reading

- [Layerswap documentation](https://docs.layerswap.io): integration guides and reference documentation.
- [Example React host](../../../examples/widget-react-host/): a runnable Vite integration.

For vanilla JavaScript, use `mountWidget` or `mountDepositWidget` from
`@layerswap/widget-js`. They accept the same widget callbacks.

## Compatibility verification

After building wallet-evm and its workspace dependencies, run
`node scripts/test-wagmi-compatibility.mjs` from the repository root. The script
fetches integrity-checked package snapshots into a temporary directory and runs
the EVM suite plus host-config interoperability tests for every listed pair.
Existing connector SDKs stay on the adapter's workspace versions. Transactions
and RPC requests are mocked; this does not certify live mobile wallet flows.

Release the CDN build containing the `walletRuntime` expose before publishing
the 1.1.0 loaders. The new shared entry point checks that capability and verifies
actual remote function identities before mounting. An older remote fails with
an explicit load error. The separately pinned example host can switch to the
new entry point after those packages are published.
