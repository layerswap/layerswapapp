import { useState } from 'react';
import { LayerswapProvider, Swap, DepositComponent } from '@layerswap/widget';
import { createEVMProvider } from '@layerswap/wallet-evm';
import { createSVMProvider } from '@layerswap/wallet-svm';
import { createBitcoinProvider } from '@layerswap/wallet-bitcoin';
import { createStarknetProvider } from '@layerswap/wallet-starknet';
import "@layerswap/widget/index.css";

type WidgetType = "swap" | "deposit";

export function App() {
  const [widgetType, setWidgetType] = useState<WidgetType>("swap");
  const walletConnect = {
    projectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || '821ab14954640abd9a7974a70f74bc6c',
    name: 'Layerswap Example',
    description: 'Layerswap Example',
    url: 'https://layerswap.io/app/',
    icons: ['https://layerswap.io/app/symbol.png']
  };

  const walletProviders = [
    createEVMProvider({ walletConnectConfigs: walletConnect }),
    createSVMProvider({ walletConnectConfigs: walletConnect }),
    createBitcoinProvider(),
    createStarknetProvider({ walletConnectConfigs: walletConnect }),
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: '#111827'
    }}>
      <h1 style={{
        fontSize: '24px',
        fontWeight: 'bold',
        color: 'white',
        marginBottom: '16px'
      }}>
        Layerswap Widget Vite Example
      </h1>
      <p style={{
        marginBottom: '16px',
        textAlign: 'center',
        color: '#9CA3AF',
        maxWidth: '512px',
        padding: '0 16px'
      }}>
        This example demonstrates the Layerswap widget integration using Vite. For information on all available widget configurations, please refer to{' '}
        <a
          href="https://docs.layerswap.io/introduction"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#EC4899',
            textDecoration: 'underline'
          }}
        >
          our documentation
        </a>.
      </p>
      <WidgetSwitcher value={widgetType} onChange={setWidgetType} />
      <div style={{
        width: '100%',
        maxWidth: '512px',
        margin: '0 auto',
        height: '100%',
        borderRadius: '12px'
      }}>
        <LayerswapProvider
          config={{
            // apiKey: import.meta.env.VITE_LAYERSWAP_API_KEY,
            version: 'mainnet', //'mainnet' or 'testnet'
          }}
          walletProviders={walletProviders}
        >
          {widgetType === 'swap' ? (
            <Swap />
          ) : (
            <DepositComponent
              destination={{ network: 'ETHEREUM_MAINNET', tokens: ['ETH'] }}
              destinationAddress="0xB2029bbd8C1cBCC43c3A7b7fE3d118b0C57D7C31"
            />
          )}
        </LayerswapProvider>
      </div>
    </div>
  );
}

function WidgetSwitcher({
  value,
  onChange,
}: {
  value: WidgetType;
  onChange: (value: WidgetType) => void;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px',
      marginBottom: '16px',
      borderRadius: '8px',
      backgroundColor: '#1F2937'
    }}>
      {(['swap', 'deposit'] as const).map((type) => {
        const isActive = value === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            style={{
              borderRadius: '6px',
              padding: '6px 24px',
              fontSize: '14px',
              fontWeight: 500,
              textTransform: 'capitalize',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s, color 0.2s',
              backgroundColor: isActive ? '#EC4899' : 'transparent',
              color: isActive ? 'white' : '#9CA3AF'
            }}
          >
            {type}
          </button>
        );
      })}
    </div>
  );
}
