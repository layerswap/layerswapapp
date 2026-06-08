import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LayerswapWidget } from '@layerswap/widget-react';
import { wagmiConfig } from './wagmi';
import { HostWallet } from './HostWallet';

const REMOTE_ENTRY =
  import.meta.env.VITE_LAYERSWAP_REMOTE_ENTRY ??
  'http://127.0.0.1:3100/remoteEntry.js';

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
            connect button. The Layerswap widget is fetched at runtime from{' '}
            <code>{REMOTE_ENTRY}</code>. Connect the host wallet and compare
            its account against what the widget sees.
          </p>
          <HostWallet />
          <div style={{ width: '100%', maxWidth: 512 }}>
            <LayerswapWidget
              remoteEntry={REMOTE_ENTRY}
              config={{ version: 'mainnet' }}
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
