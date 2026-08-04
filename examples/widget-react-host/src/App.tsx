import { useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LayerswapWidget, LayerswapDepositWidget } from '@layerswap/widget-react';
import { wagmiConfig } from './wagmi';
import { HostWallet } from './HostWallet';

const queryClient = new QueryClient();

// Demo recipient for the deposit tab. A real integrator supplies their own
// deposit address here — the deposit widget never asks the end user for it.
const DEPOSIT_DEMO_ADDRESS = '0x2fc617e933a52713247ce25730f6695920b3befe';

type WidgetTab = 'swap' | 'deposit';

const loadingFallback = (
  <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>
    Loading widget…
  </div>
);

export function App() {
  // Only one Layerswap widget (of either kind) may be live per page — the
  // widget keeps process-global state. Tabs swap between them rather than
  // rendering both.
  const [tab, setTab] = useState<WidgetTab>('swap');

  const tabButton = (value: WidgetTab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(value)}
      style={{
        padding: '6px 16px',
        borderRadius: 8,
        border: '1px solid #374151',
        background: tab === value ? '#374151' : 'transparent',
        color: tab === value ? '#F9FAFB' : '#9CA3AF',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

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
            connect button. The Layerswap widget is fetched from the signed CDN
            configured inside the loader package. Connect the host wallet and
            compare its account against what the widget sees.
          </p>
          <HostWallet />
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {tabButton('swap', 'Swap')}
            {tabButton('deposit', 'Deposit')}
          </div>
          <div style={{ width: '100%', maxWidth: 512 }}>
            {tab === 'swap' ? (
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
                fallback={loadingFallback}
                onReady={() => console.log('[embed] widget ready')}
                onError={(err) => console.error('[embed] failed to load', err)}
              />
            ) : (
              <LayerswapDepositWidget
                config={{ version: 'mainnet' }}
                destination={{ network: 'BASE_MAINNET', tokens: ['USDC', 'ETH'] }}
                destinationAddress={DEPOSIT_DEMO_ADDRESS}
                walletProvidersConfig={{ exclude: ['tron', 'fuel'] }}
                wagmiConfig={wagmiConfig}
                callbacks={{
                  onSwapCreate: (swap) => console.log('[host] deposit swap created', swap),
                  onSwapComplete: (swap) => console.log('[host] deposit complete', swap),
                  onError: (err) => console.warn('[host] deposit widget error', err),
                }}
                fallback={loadingFallback}
                onReady={() => console.log('[embed] deposit widget ready')}
                onError={(err) => console.error('[embed] failed to load', err)}
              />
            )}
          </div>
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
