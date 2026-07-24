# @layerswap/wallet-bitcoin

Bitcoin wallet provider for the Layerswap Widget. Enables Bitcoin wallet connections and transactions within the Layerswap ecosystem.

## Installation

```bash
npm install @layerswap/wallet-bitcoin @bigmi/client @bigmi/core @bigmi/react @tanstack/react-query
# or
yarn add @layerswap/wallet-bitcoin @bigmi/client @bigmi/core @bigmi/react @tanstack/react-query
# or
pnpm add @layerswap/wallet-bitcoin @bigmi/client @bigmi/core @bigmi/react @tanstack/react-query
```

## Quick Start

```tsx
import { LayerswapProvider, Swap } from "@layerswap/widget";
import { createBitcoinProvider } from "@layerswap/wallet-bitcoin";

export default function Page() {
  const bitcoinProvider = createBitcoinProvider();
  
  return (
    <LayerswapProvider walletProviders={[bitcoinProvider]}>
      <Swap />
    </LayerswapProvider>
  );
}
```

## Usage

Use `createBitcoinProvider()` to create a Bitcoin wallet provider:

```tsx
import { createBitcoinProvider } from "@layerswap/wallet-bitcoin";

const bitcoinProvider = createBitcoinProvider({
  // Custom configuration options
});
```

## Documentation

For detailed setup instructions, configuration options, and usage examples, see the [Bitcoin Wallet Provider documentation](https://docs.layerswap.io/integration/UI/Widget/WalletManagement/BitcoinProvider).

## Features

- Bitcoin wallet connection via Bigmi
- Balance checking
- Gas/fee estimation
- Address validation and utilities
- Bitcoin transaction support

## TypeScript

This package includes TypeScript definitions. All types are exported from the main entry point.

## License

MIT

## Repository

[GitHub](https://github.com/layerswap/layerswapapp/tree/main/packages/wallets/bitcoin)

