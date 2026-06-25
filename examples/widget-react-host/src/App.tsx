import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LayerswapWidget } from '@layerswap/widget-react';
import { wagmiConfig } from './wagmi';
import { HostWallet } from './HostWallet';

// Integrators point `manifest` at the channel manifest URL. The loader
// fetches it, honors `killSwitch`, optionally verifies the signature, then
// loads the remote entry it points at. Defaults to the local widget-cdn dev
// server (`pnpm dev` in apps/widget-cdn); set VITE_LAYERSWAP_MANIFEST to the
// production URL (e.g. https://cdn.layerswap.io/v1/manifest.json).
const MANIFEST_URL =
  import.meta.env.VITE_LAYERSWAP_MANIFEST ?? 'http://127.0.0.1:3100/manifest.json';
// The dev server emits an unsigned manifest, so verification is off by
// default. Enable it (VITE_LAYERSWAP_VERIFY=true) against a signed prod build.
const VERIFY = import.meta.env.VITE_LAYERSWAP_VERIFY === 'true';

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
              manifest={MANIFEST_URL}
              verify={VERIFY}
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
