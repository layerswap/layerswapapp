# @layerswap/widget-react

React loader that fetches the Layerswap widget at runtime from a CDN-hosted
Module-Federation remote. The widget code and its heavy dependencies
(framer-motion, radix, formik, swr, wallet adapters) **never enter your
bundle** — your app installs only this thin loader.

## Install

```bash
pnpm add @layerswap/widget-react
```

`react`, `react-dom`, `wagmi`, `viem`, `@tanstack/react-query`, and `zustand`
are declared as peer dependencies; pnpm/npm will dedupe them to the host
app's existing copy. `@layerswap/widget` is an **optional** peer-dep that
provides typed `LayerswapWidgetConfig` and `CallbacksContextType` for IDE
support — install it as a devDep if you want fully-typed config.

## Quick start

```tsx
import { LayerswapWidget } from '@layerswap/widget-react';

export function App() {
  return (
    <LayerswapWidget
      manifest="https://cdn.layerswap.io/v1/manifest.json"
      verify
      config={{ version: 'mainnet' }}
      fallback={<div>Loading widget…</div>}
      onReady={() => console.log('widget mounted')}
      onError={(e) => console.error(e)}
    />
  );
}
```

That's it for a default integration — the manifest layer handles updates,
the EVM connect flow inside the widget works without further setup.

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
          manifest="https://cdn.layerswap.io/v1/manifest.json"
          verify
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

| Prop | Type | Description |
|---|---|---|
| `manifest` | `string` | URL to `manifest.json`. The loader fetches it, then loads the `remoteEntry` it points at. |
| `verify` | `boolean` | Require a valid signature on the manifest. Default false until your signing pipeline is live. |
| `config` | `LayerswapWidgetConfig` | Forwarded to the widget's `LayerswapProvider`. Includes `apiKey`, `version`, `theme`, `initialValues`, `settings`. |
| `callbacks` | `CallbacksContextType` | `onSwapCreate`, `onSwapComplete`, `onError`, `onSwapModalStateChange`, etc. |
| `wagmiConfig` | `wagmi/Config` | Host wagmi config the widget adopts for EVM. |
| `walletDefaults` | `DefaultWalletConfig` | `walletConnect` (projectId, etc.), `ton`, `immutablePassport`. |
| `walletProvidersConfig.exclude` | `string[]` | Drop chains from the default provider list — `['tron', 'fuel']`, etc. |
| `fallback` | `ReactNode` | Shown while loading. |
| `onReady` | `() => void` | Fires once the widget mounts. |
| `onError` | `(err) => void` | Fires on load/render failure; receives a `ManifestError` for manifest issues. |

## How it works

1. `<LayerswapWidget>` fetches `manifest.json` from the channel URL.
2. If `manifest.killSwitch === true`, refuses to load and fires
   `onError` with `ManifestError('kill-switch')`.
3. If `verify` is set, verifies a detached ECDSA P-256 signature on the
   manifest body against the public key baked into this package.
   Tampered / unsigned manifests are rejected.
4. Calls `@module-federation/runtime` to load `manifest.remoteEntry`
   (resolved relative to the manifest URL). React, react-dom, wagmi,
   viem, react-query, zustand are registered into the MF shared scope
   from the host so the remote uses those instances.
5. The remote's exposed `./Widget` component is rendered via
   `React.lazy` inside the host's React tree.

Heavy deps stay in the remote bundle on the CDN. Your bundle shrinks
accordingly.

## Recommended Content Security Policy

The widget is served from a known origin (`cdn.layerswap.io` by default).
A tight CSP that allowlists exactly that origin plus the LayerSwap API
gives integrators the smallest blast radius if the supply chain is ever
compromised:

```
Content-Security-Policy:
  default-src 'self';
  script-src   'self' https://cdn.layerswap.io;
  connect-src  'self' https://cdn.layerswap.io https://api.layerswap.io
               https://*.walletconnect.com https://*.walletconnect.org;
  style-src    'self' 'unsafe-inline';
  img-src      'self' data: https:;
  font-src     'self' data:;
  frame-src    'self';
```

Notes:
- `'unsafe-inline'` for `style-src` is required because the widget injects
  styles via `style-loader` at runtime. Removing this requires a build
  change in `apps/widget-cdn`.
- `connect-src` includes WalletConnect relays — without them, WC v2
  connections fail.
- Add any additional RPC endpoints your wagmi `transports` use.

## Failure modes

| Symptom | `onError` payload | Cause |
|---|---|---|
| Widget never mounts, error in console | `TypeError: fetch` etc. | Manifest URL unreachable / CORS misconfigured on the CDN. |
| Widget never mounts | `ManifestError('parse')` | Manifest JSON missing `remoteEntry` field. |
| Widget never mounts | `ManifestError('kill-switch')` | Operational kill-switch set on the manifest. |
| Widget never mounts | `ManifestError('signature')` | `verify: true` with no/invalid signature. |
| Widget loads but errors at render | Component-level | Catch via `callbacks.onError`. |

## Local development

Run the widget-cdn dev server (`pnpm dev` in `apps/widget-cdn`) — it
serves both `remoteEntry.js` and an unsigned `manifest.json` at
`http://127.0.0.1:3100`. Point `manifest` at that dev manifest (leave
`verify` off, since the dev manifest is unsigned):

```tsx
<LayerswapWidget
  manifest="http://127.0.0.1:3100/manifest.json"
  config={{ version: 'testnet' }}
/>
```

See `examples/widget-react-host/` in the monorepo for a runnable Vite
host that wires `wagmiConfig` adoption and callback handlers.

## Security model

In-page CDN delivery means the widget's code runs in your host's
context. Trust is rooted in **the signing key baked into this package**
(see `src/manifest.ts`). Rotating the production key requires a new
`@layerswap/widget-react` release; integrators with SRI-pinned installs
upgrade by bumping the package version. The CDN itself does not sign
anything — it just hosts the artifact and the manifest.
