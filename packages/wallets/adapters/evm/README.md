# @layerswap/wallet-evm

EVM (Ethereum Virtual Machine) wallet provider for the Layerswap Widget. Supports Ethereum and all EVM-compatible chains including L2s.

## Installation

```bash
npm install @layerswap/wallet-evm wagmi viem @tanstack/react-query
# or
yarn add @layerswap/wallet-evm wagmi viem @tanstack/react-query
# or
pnpm add @layerswap/wallet-evm wagmi viem @tanstack/react-query
```

## Quick Start

```tsx
import { LayerswapProvider, Swap } from "@layerswap/widget";
import { createEVMProvider } from "@layerswap/wallet-evm";

export default function Page() {
  const evmProvider = createEVMProvider({
    walletConnectConfigs: {
      projectId: "your-project-id",
      name: "Your App",
      description: "Your app description",
      url: "https://your-app.com",
      icons: ["https://your-app.com/icon.png"]
    }
  });
  
  return (
    <LayerswapProvider walletProviders={[evmProvider]}>
      <Swap />
    </LayerswapProvider>
  );
}
```

## Usage

Use `createEVMProvider()` to create an EVM wallet provider:

```tsx
import { createEVMProvider } from "@layerswap/wallet-evm";

const evmProvider = createEVMProvider({
  walletConnectConfigs: {
    projectId: "your-project-id",
    name: "Your App",
    description: "Your app description",
    url: "https://your-app.com",
    icons: ["https://your-app.com/icon.png"]
  },
  walletProviderModules: [
    // Additional wallet modules
  ]
});
```

### Existing Wagmi Provider

When your application already owns a Wagmi config, pass the same config to
Layerswap so the host UI and widget share connections:

```tsx
const evmProvider = createEVMProvider({
  wagmiConfig: config,
});

return (
  <WagmiProvider config={config}>
    <LayerswapProvider walletProviders={[evmProvider]}>
      <Swap />
    </LayerswapProvider>
  </WagmiProvider>
);
```

### Supported Wallets

- MetaMask
- WalletConnect
- Coinbase Wallet
- And other wagmi-compatible wallets

### Supported Chains

All EVM-compatible chains including:
- Ethereum
- Polygon
- Arbitrum
- Optimism
- Base
- And many more L2s

## Documentation

For detailed setup instructions, configuration options, and usage examples, see the [EVM Wallet Provider documentation](https://docs.layerswap.io/integration/UI/Widget/WalletManagement/EVMProvider).

## Features

- Multi-wallet support via wagmi
- WalletConnect integration
- Balance checking (including Hyperliquid support)
- Gas estimation
- Address validation and utilities
- Contract address utilities
- EVM transaction support
- Extensible via wallet provider modules

## Exports

- `createEVMProvider()` - Factory function for creating EVM providers
- `getEvmChainsConfig()` - Creates chain and transport configuration from widget networks
- `getEvmConfig()` - Returns the active internal or externally provided Wagmi config
- `getEthersSigner()` - Resolves an ethers signer for the active EVM wallet

## TypeScript

This package includes TypeScript definitions. All types are exported from the main entry point.

## License

MIT

## Repository

[GitHub](https://github.com/layerswap/layerswapapp/tree/main/packages/wallets/evm)
