# @layerswap/wallet-imtbl-x

Immutable X wallet provider for the Layerswap Widget. Enables Immutable X wallet connections and transactions.

## Installation

```bash
npm install @layerswap/wallet-imtbl-x
# or
yarn add @layerswap/wallet-imtbl-x
# or
pnpm add @layerswap/wallet-imtbl-x
```

## Quick Start

```tsx
import { LayerswapProvider, Swap } from "@layerswap/widget";
import { createImmutableXProvider } from "@layerswap/wallet-imtbl-x";

export default function Page() {
  const imtblXProvider = createImmutableXProvider();
  
  return (
    <LayerswapProvider walletProviders={[imtblXProvider]}>
      <Swap />
    </LayerswapProvider>
  );
}
```

## Usage

Use `createImmutableXProvider()` to create an Immutable X wallet provider:

```tsx
import { createImmutableXProvider } from "@layerswap/wallet-imtbl-x";

const imtblXProvider = createImmutableXProvider({
  // Custom configuration options
});
```

## Documentation

For detailed setup instructions, configuration options, and usage examples, see the [ImmutableX Wallet Provider documentation](https://docs.layerswap.io/integration/UI/Widget/WalletManagement/ImmutableXProvider).

## Features

- Immutable X wallet connection
- Balance checking
- Gas estimation
- Integration with Immutable X SDK
- Support for Immutable X transactions

## TypeScript

This package includes TypeScript definitions. All types are exported from the main entry point.

## License

MIT

## Repository

[GitHub](https://github.com/layerswap/layerswapapp/tree/main/packages/wallets/imtblX)

