# @layerswap/wallet-svm

Solana (SVM) wallet provider for the Layerswap Widget. Enables Solana wallet connections and transactions.

## Installation

```bash
npm install @layerswap/wallet-svm
# or
yarn add @layerswap/wallet-svm
# or
pnpm add @layerswap/wallet-svm
```

## Quick Start

```tsx
import { LayerswapProvider, Swap } from "@layerswap/widget";
import { createSVMProvider } from "@layerswap/wallet-svm";

export default function Page() {
  const svmProvider = createSVMProvider({
    walletConnectConfigs: {
      projectId: "your-project-id",
      name: "Your App",
      description: "Your app description",
      url: "https://your-app.com",
      icons: ["https://your-app.com/icon.png"]
    }
  });
  
  return (
    <LayerswapProvider walletProviders={[svmProvider]}>
      <Swap />
    </LayerswapProvider>
  );
}
```

## Usage

Use `createSVMProvider()` to create a Solana wallet provider:

```tsx
import { createSVMProvider } from "@layerswap/wallet-svm";

const svmProvider = createSVMProvider({
  walletConnectConfigs: {
    projectId: "your-project-id",
    name: "Your App",
    description: "Your app description",
    url: "https://your-app.com",
    icons: ["https://your-app.com/icon.png"]
  }
});
```

### Supported Wallets

- Phantom
- Solflare
- Backpack
- And other Solana wallet adapters

## Documentation

For detailed setup instructions, configuration options, and usage examples, see the [Solana (SVM) Wallet Provider documentation](https://docs.layerswap.io/integration/UI/Widget/WalletManagement/SVMWallet).

## Features

- Solana wallet connection via Solana wallet adapters
- Balance checking
- Gas/fee estimation
- Address validation and utilities
- Solana transaction support
- WalletConnect support for Solana

## TypeScript

This package includes TypeScript definitions. All types are exported from the main entry point.

## License

MIT

## Repository

[GitHub](https://github.com/layerswap/layerswapapp/tree/main/packages/wallets/svm)

