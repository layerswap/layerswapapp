# @layerswap/wallet-module-loopring

Loopring wallet module for the Layerswap Widget. Enables Loopring Layer 2 wallet connections and transactions.

## Installation

```bash
npm install @layerswap/wallet-module-loopring
# or
yarn add @layerswap/wallet-module-loopring
# or
pnpm add @layerswap/wallet-module-loopring
```

## Quick Start

```tsx
import { LayerswapProvider, Swap } from "@layerswap/widget";
import { createEVMProvider } from "@layerswap/wallet-evm";
import { createLoopringModule } from "@layerswap/wallet-module-loopring";

export default function Page() {
  const loopringModule = createLoopringModule();
  const evmProvider = createEVMProvider({
    walletProviderModules: [loopringModule]
  });
  
  return (
    <LayerswapProvider walletProviders={[evmProvider]}>
      <Swap />
    </LayerswapProvider>
  );
}
```

## Usage

Loopring is a wallet module that extends the EVM provider. Use `createLoopringModule()` and pass it to `createEVMProvider()`:

```tsx
import { createEVMProvider } from "@layerswap/wallet-evm";
import { createLoopringModule } from "@layerswap/wallet-module-loopring";

const loopringModule = createLoopringModule();
const evmProvider = createEVMProvider({
  walletProviderModules: [loopringModule]
});
```

## Documentation

For detailed setup instructions and usage examples, see the [Native Wallet Packages documentation](https://docs.layerswap.io/integration/UI/Widget/WalletManagement/EVMProvider#advanced:-evm-modules).

## Features

- Loopring wallet connection
- Balance checking
- Gas estimation
- Integration with Loopring SDK
- Support for Loopring Layer 2 transactions
- Multi-step transaction handling

## TypeScript

This package includes TypeScript definitions. All types are exported from the main entry point.

## License

MIT

## Repository

[GitHub](https://github.com/layerswap/layerswapapp/tree/main/packages/wallets/loopring)

