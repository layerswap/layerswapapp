import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LayerswapWidget } from '@layerswap/widget-react';
import { wagmiConfig } from './wagmi';
import { HostWallet } from './HostWallet';

// Integrators do NOT configure the widget's source — it is always the
// canonical signed Layerswap CDN baked into `@layerswap/widget-js`. This dev
// harness is the exception: it points the loader at the local widget-cdn dev
// server (`pnpm dev` in apps/widget-cdn) via the internal `__LAYERSWAP_WIDGET_*`
// override globals. These are an undocumented build/test seam, not a public API.
//
// Defaults to the local dev server; set VITE_LAYERSWAP_MANIFEST to a production
// URL (e.g. https://cdn.layerswap.io/v1/manifest.json). The dev server emits an
// unsigned manifest, so verification is off unless VITE_LAYERSWAP_VERIFY=true.
const MANIFEST_URL =
  import.meta.env.VITE_LAYERSWAP_MANIFEST ?? 'http://127.0.0.1:3100/manifest.json';
const VERIFY = import.meta.env.VITE_LAYERSWAP_VERIFY === 'true';

declare global {
  interface Window {
    __LAYERSWAP_WIDGET_MANIFEST__?: string;
    __LAYERSWAP_WIDGET_VERIFY__?: boolean;
  }
}

// Set before <LayerswapWidget> mounts (module scope runs first), so the loader
// reads them when it resolves the source.
window.__LAYERSWAP_WIDGET_MANIFEST__ = MANIFEST_URL;
window.__LAYERSWAP_WIDGET_VERIFY__ = VERIFY;

const queryClient = new QueryClient();

export function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            minHeight: '100vh',
            padding: 20,
          }}
        >
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>
            Layerswap CDN-delivered Widget
          </h1>
          <p style={{ marginBottom: 20, color: '#9CA3AF', maxWidth: 540, textAlign: 'center' }}>
            The host page below mounts its own <code>WagmiProvider</code> and a
            connect button. The Layerswap widget is fetched at runtime via the
            manifest at <code>{MANIFEST_URL}</code>. Connect the host wallet and
            compare its account against what the widget sees.
          </p>
          <HostWallet />
          <div style={{ width: '100%', maxWidth: 512 }}>
            <LayerswapWidget
              config={{ version: 'mainnet' }}
              walletProvidersConfig={{ exclude: ['tron', 'fuel'] }}
              wagmiConfig={wagmiConfig}
              callbacks={{
                onSwapCreate: (swap) => console.log('[host] swap created', swap),
                onSwapComplete: (swap) => console.log('[host] swap complete', swap),
                onError: (err) => console.warn('[host] widget error', err),
                onSwapModalStateChange: (open) => console.log('[host] swap modal', open),
              }}
              fallback={
                <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>
                  Loading widget…
                </div>
              }
              onReady={() => console.log('[embed] widget ready')}
              onError={(err) => console.error('[embed] failed to load', err)}
            />
          </div>
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
