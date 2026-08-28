import { useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LayerswapWidget, LayerswapDepositWidget } from '@layerswap/widget-react';
import type { LayerswapWidgetProps, LayerswapDepositWidgetProps } from '@layerswap/widget-react';
import { wagmiConfig } from './wagmi';
import { HostWallet } from './HostWallet';

const queryClient = new QueryClient();

// Demo recipient for the deposit tab. A real integrator supplies their own
// deposit address here — the deposit widget never asks the end user for it.
const DEPOSIT_DEMO_ADDRESS = '0xB2029bbd8C1cBCC43c3A7b7fE3d118b0C57D7C31';

// Keep object/function props referentially stable — the widget memoizes its
// wallet-provider setup on these by identity, so fresh inline literals on
// every host render would needlessly rebuild wallet providers. Hoist them
// (or useMemo/useCallback them if they depend on host state).
const WIDGET_CONFIG: LayerswapWidgetProps['config'] = { version: 'mainnet' };
const WALLET_PROVIDERS_CONFIG: LayerswapWidgetProps['walletProvidersConfig'] = {
  exclude: ['tron', 'fuel'],
};
const DEPOSIT_DESTINATION: LayerswapDepositWidgetProps['destination'] = {
  network: 'BASE_MAINNET',
  tokens: ['USDC', 'ETH'],
};
const SWAP_CALLBACKS: LayerswapWidgetProps['callbacks'] = {
  onSwapCreate: (swap) => console.log('[host] swap created', swap),
  onSwapComplete: (swap) => console.log('[host] swap complete', swap),
  onError: (err) => console.warn('[host] widget error', err),
  onSwapModalStateChange: (open) => console.log('[host] swap modal', open),
};
const DEPOSIT_CALLBACKS: LayerswapDepositWidgetProps['callbacks'] = {
  onSwapCreate: (swap) => console.log('[host] deposit swap created', swap),
  onSwapComplete: (swap) => console.log('[host] deposit complete', swap),
  onError: (err) => console.warn('[host] deposit widget error', err),
};
const onWidgetReady = () => console.log('[embed] widget ready');
const onWidgetLoadError = (err: unknown) => console.error('[embed] failed to load', err);
const onDepositWidgetReady = () => console.log('[embed] deposit widget ready');
const onDepositWidgetLoadError = (err: unknown) => console.error('[embed] failed to load', err);

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
                config={WIDGET_CONFIG}
                walletProvidersConfig={WALLET_PROVIDERS_CONFIG}
                wagmiConfig={wagmiConfig}
                callbacks={SWAP_CALLBACKS}
                fallback={loadingFallback}
                onReady={onWidgetReady}
                onError={onWidgetLoadError}
              />
            ) : (
              <LayerswapDepositWidget
                config={WIDGET_CONFIG}
                destination={DEPOSIT_DESTINATION}
                destinationAddress={DEPOSIT_DEMO_ADDRESS}
                walletProvidersConfig={WALLET_PROVIDERS_CONFIG}
                wagmiConfig={wagmiConfig}
                callbacks={DEPOSIT_CALLBACKS}
                fallback={loadingFallback}
                onReady={onDepositWidgetReady}
                onError={onDepositWidgetLoadError}
              />
            )}
          </div>
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
