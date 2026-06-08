# @layerswap/widget-react

Tiny loader that fetches the Layerswap widget from a CDN at runtime via
Module Federation. Integrators install **only this package**; the widget
itself never enters their bundle.

## Install

```bash
pnpm add @layerswap/widget-react
```

`react`, `react-dom`, `wagmi`, `viem`, `@tanstack/react-query`, and `zustand`
are declared as peer dependencies — pnpm/npm will dedupe them to the host
app's existing copy.

## Usage

```tsx
import { LayerswapWidget } from '@layerswap/widget-react';

export function App() {
  return (
    <LayerswapWidget
      remoteEntry="https://cdn.layerswap.io/v1/remoteEntry.js"
      config={{ version: 'mainnet' }}
      fallback={<div>Loading widget…</div>}
      onReady={() => console.log('widget mounted')}
      onError={(e) => console.error(e)}
    />
  );
}
```

`config` is passed through to the remote widget's `<LayerswapProvider>` and
mirrors `LayerswapWidgetConfig` from `@layerswap/widget`.

`walletDefaults` (optional) is forwarded to `getDefaultProviders()` inside
the remote (see `@layerswap/wallets`), so things like the WalletConnect
project ID can be supplied from the host.

## How it works

1. `<LayerswapWidget>` calls `@module-federation/runtime`'s `init()` with the
   host's `react` / `react-dom` registered into the shared scope as
   singletons.
2. `loadRemote('layerswap_widget/Widget')` fetches the manifest +
   `remoteEntry.js` from `remoteEntry`.
3. The returned component (`<LayerswapProvider><Swap/></LayerswapProvider>`,
   exposed by `@layerswap/widget-cdn`) is rendered inside the host's React
   tree via `React.lazy`.

Heavy deps (framer-motion, radix, formik, swr, wallet adapters) stay in the
remote bundle on the CDN. The host bundle shrinks accordingly.
