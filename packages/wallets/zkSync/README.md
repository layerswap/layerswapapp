# @layerswap/wallet-module-zksync

zkSync wallet module for the Layerswap Widget. Enables zkSync wallet connections and transactions.

## Installation

```bash
npm install @layerswap/wallet-module-zksync wagmi viem @layerswap/wallet-evm @tanstack/react-query
# or
yarn add @layerswap/wallet-module-zksync wagmi viem @layerswap/wallet-evm @tanstack/react-query
# or
pnpm add @layerswap/wallet-module-zksync wagmi viem @layerswap/wallet-evm @tanstack/react-query
```

## Quick Start

```tsx
import { LayerswapProvider, Swap } from "@layerswap/widget";
import { createEVMProvider } from "@layerswap/wallet-evm";
import { createZkSyncModule } from "@layerswap/wallet-module-zksync";

export default function Page() {
  const zkSyncModule = createZkSyncModule();
  const evmProvider = createEVMProvider({
    walletProviderModules: [zkSyncModule]
  });
  
  return (
    <LayerswapProvider walletProviders={[evmProvider]}>
      <Swap />
    </LayerswapProvider>
  );
}
```

## Usage

zkSync is a wallet module that extends the EVM provider. Use `createZkSyncModule()` and pass it to `createEVMProvider()`:

```tsx
import { createEVMProvider } from "@layerswap/wallet-evm";
import { createZkSyncModule } from "@layerswap/wallet-module-zksync";

const zkSyncModule = createZkSyncModule();
const evmProvider = createEVMProvider({
  walletProviderModules: [zkSyncModule]
});
```

## Documentation

For detailed setup instructions and usage examples, see the [Native Wallet Packages documentation](https://docs.layerswap.io/integration/UI/Widget/WalletManagement/EVMProvider#advanced:-evm-modules).

## Features

- zkSync wallet connection
- Balance checking
- Gas estimation
- Integration with zkSync SDK
- Support for zkSync transactions
- Layer 2 transaction support

## TypeScript

This package includes TypeScript definitions. All types are exported from the main entry point.

## License

MIT

## Repository

[GitHub](https://github.com/layerswap/layerswapapp/tree/main/packages/wallets/zkSync)

