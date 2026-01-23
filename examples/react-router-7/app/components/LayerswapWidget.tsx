import { LayerswapProvider, Swap } from '@layerswap/widget';
// import { createEVMProvider } from '@layerswap/wallet-evm';
// import { createSVMProvider } from '@layerswap/wallet-svm';
// import { createBitcoinProvider } from '@layerswap/wallet-bitcoin';
// import { createStarknetProvider } from '@layerswap/wallet-starknet';
import { getDefaultProviders } from '@layerswap/wallets';

export function LayerswapWidget() {
  const walletConnect = {
    projectId: '821ab14954640abd9a7974a70f74bc6c',
    name: 'Layerswap Example',
    description: 'Layerswap Example',
    url: 'https://layerswap.io/app/',
    icons: ['https://layerswap.io/app/symbol.png']
  };

  const walletProviders = getDefaultProviders({
    walletConnect,
    ton: {
      tonApiKey: "Replace with your own TON API key",
      manifestUrl: 'https://layerswap.io/app/tonconnect-manifest.json',
    }
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-5">
      <h1 className="text-2xl font-bold text-white mb-4">
        Layerswap Widget React Router 7 Example
      </h1>
      <p className="mb-4 text-center text-gray-400 max-w-lg px-4">
        This example demonstrates the Layerswap widget integration using React Router 7. For information on all available widget configurations, please refer to{' '}
        <a
          href="https://docs.layerswap.io/introduction"
          target="_blank"
          rel="noopener noreferrer"
          className="text-pink-600 hover:no-underline underline"
        >
          our documentation
        </a>.
      </p>
      <div className="w-full max-w-lg mx-auto h-full rounded-xl">
        <LayerswapProvider
          config={{
            // apiKey: "Replace with your own API key",
            version: 'mainnet', //'mainnet' or 'testnet'
          }}
          walletProviders={walletProviders}
        >
          <Swap />
        </LayerswapProvider>
      </div>
    </div>
  );
}
