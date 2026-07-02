# @layerswap/wallet-paradex

Paradex wallet provider for the Layerswap Widget. Enables Paradex wallet connections for both EVM and Starknet networks.

## Installation

```bash
npm install @layerswap/wallet-paradex @layerswap/wallet-evm @layerswap/wallet-starknet wagmi viem @wagmi/core @layerswap/widget
# or
yarn add @layerswap/wallet-paradex @layerswap/wallet-evm @layerswap/wallet-starknet wagmi viem @wagmi/core @layerswap/widget
# or
pnpm add @layerswap/wallet-paradex @layerswap/wallet-evm @layerswap/wallet-starknet wagmi viem @wagmi/core @layerswap/widget
```

## Quick Start

```tsx
import { LayerswapProvider, Swap } from "@layerswap/widget";
import { createParadexProvider, createEVMProvider, createStarknetProvider } from "@layerswap/wallet-paradex";

export default function Page() {
  const paradexProvider = createParadexProvider();
  const evmProvider = createEVMProvider();
  const starknetProvider = createStarknetProvider()'
  
  return (
    <LayerswapProvider walletProviders={[evmProvider, starknetProvider, paradexProvider]}>
      <Swap />
    </LayerswapProvider>
  );
}
```

## Usage

Use `createParadexProvider()` to create a Paradex wallet provider. Paradex supports both EVM and Starknet networks, so this provider requires both `@layerswap/wallet-evm` and `@layerswap/wallet-starknet` as peer dependencies:

```tsx
import { createParadexProvider } from "@layerswap/wallet-paradex";

const paradexProvider = createParadexProvider({
  // Custom configuration options
});
```

## Documentation

For detailed setup instructions, configuration options, and usage examples, see the [Paradex Wallet Provider documentation](https://docs.layerswap.io/integration/UI/Widget/WalletManagement/ParadexProvider).

## Features

- Paradex wallet connection
- Balance checking
- Support for both EVM and Starknet networks
- Integration with Paradex SDK
- Multi-chain transaction support

## TypeScript

This package includes TypeScript definitions. All types are exported from the main entry point.

## License

MIT

## Repository

[GitHub](https://github.com/layerswap/layerswapapp/tree/main/packages/wallets/paradex)

