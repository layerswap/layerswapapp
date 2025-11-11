"use client";
import '@layerswap/widget/index.css';
import { LayerswapProvider, Swap } from '@layerswap/widget';
import { EVMProvider } from '@layerswap/wallet-evm';
import { StarknetProvider } from '@layerswap/wallet-starknet';
import { SVMProvider } from '@layerswap/wallet-svm';
import { BitcoinProvider } from '@layerswap/wallet-bitcoin';
import { FuelProvider } from '@layerswap/wallet-fuel';
import { TonProvider } from '@layerswap/wallet-ton';
import { TronProvider } from '@layerswap/wallet-tron';
import { ParadexProvider } from '@layerswap/wallet-paradex';

export default function App() {

  const walletConnect = {
    projectId: '821ab14954640abd9a7974a70f74bc6c',
    name: 'Layerswap Example',
    description: 'Layerswap Example',
    url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
    icons: ['https://layerswap.io/app/symbol.png']
  }
  return (
    <LayerswapProvider
      config={{
        apiKey: "Replace with your own API key",
        version: 'mainnet', //'mainnet' or 'testnet'
        tonConfigs: {
          tonApiKey: "Replace with your own TON API key",
          manifestUrl: 'https://layerswap.io/app/tonconnect-manifest.json',
        },
        walletConnect
      }}
      walletProviders={[
        EVMProvider,
        StarknetProvider,
        SVMProvider,
        BitcoinProvider,
        FuelProvider,
        TonProvider,
        TronProvider,
        ParadexProvider
      ]}
    >
      <Swap />
    </LayerswapProvider>
  );
}