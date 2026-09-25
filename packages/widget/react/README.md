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
