# @layerswap/wallet-tron

Tron wallet provider for the Layerswap Widget. Enables Tron wallet connections and transactions.

## Installation

```bash
npm install @layerswap/wallet-tron
# or
yarn add @layerswap/wallet-tron
# or
pnpm add @layerswap/wallet-tron
```

## Quick Start

```tsx
import { LayerswapProvider, Swap } from "@layerswap/widget";
import { createTronProvider } from "@layerswap/wallet-tron";

export default function Page() {
  const tronProvider = createTronProvider();
  
  return (
    <LayerswapProvider walletProviders={[tronProvider]}>
      <Swap />
    </LayerswapProvider>
  );
}
```

## Usage

Use `createTronProvider()` to create a Tron wallet provider:

```tsx
import { createTronProvider } from "@layerswap/wallet-tron";

const tronProvider = createTronProvider({
  // Custom configuration options
});
```

## Documentation

For detailed setup instructions, configuration options, and usage examples, see the [Tron Wallet Provider documentation](https://docs.layerswap.io/integration/UI/Widget/WalletManagement/TronProvider).

## Features

- Tron wallet connection via multiple wallet adapters
- Support for multiple Tron wallets:
  - TronLink
  - Ledger
  - OKX Wallet
  - TokenPocket
  - BitKeep
  - Bybit
  - GateWallet
  - FoxWallet
  - imToken
  - Trust Wallet
- Balance checking
- Gas estimation
- Address validation and utilities
- Tron transaction support

## TypeScript

This package includes TypeScript definitions. All types are exported from the main entry point.

## License

MIT

## Repository

[GitHub](https://github.com/layerswap/layerswapapp/tree/main/packages/wallets/tron)

