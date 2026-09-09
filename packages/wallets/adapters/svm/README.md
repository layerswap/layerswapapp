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

### Agave 4.2 compatibility

Transaction lookups accept legacy, v0, and v1 responses using
`maxSupportedTransactionVersion: 1` and `@solana/web3.js` 1.99.0 or later.
The [1.99.0 release](https://github.com/solana-foundation/solana-web3.js/releases/tag/v1.99.0)
backports v1 read support to the stable SDK used by the wallet adapters.

Transfer call data must still contain a legacy transaction. This update does
not enable v1 transaction construction or signing; those require a separate
SDK and wallet compatibility migration before the API starts returning v1 call data.

## TypeScript

This package includes TypeScript definitions. All types are exported from the main entry point.

## License

MIT

## Repository

[GitHub](https://github.com/layerswap/layerswapapp/tree/main/packages/wallets/svm)
