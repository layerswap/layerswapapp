# @layerswap/wallet-fuel

Fuel wallet provider for the Layerswap Widget. Enables Fuel blockchain wallet connections and transactions.

## Installation

```bash
npm install @layerswap/wallet-fuel wagmi viem @wagmi/core @tanstack/react-query
# or
yarn add @layerswap/wallet-fuel wagmi viem @wagmi/core @tanstack/react-query
# or
pnpm add @layerswap/wallet-fuel wagmi viem @wagmi/core @tanstack/react-query
```

## Quick Start

```tsx
import { LayerswapProvider, Swap } from "@layerswap/widget";
import { createFuelProvider } from "@layerswap/wallet-fuel";

export default function Page() {
  const fuelProvider = createFuelProvider();
  
  return (
    <LayerswapProvider walletProviders={[fuelProvider]}>
      <Swap />
    </LayerswapProvider>
  );
}
```

## Usage

Use `createFuelProvider()` to create a Fuel wallet provider:

```tsx
import { createFuelProvider } from "@layerswap/wallet-fuel";

const fuelProvider = createFuelProvider({
  // Custom configuration options
});
```

## Documentation

For detailed setup instructions, configuration options, and usage examples, see the [Fuel Wallet Provider documentation](https://docs.layerswap.io/integration/UI/Widget/WalletManagement/FuelProvider).

## Features

- Fuel wallet connection via Fuel SDK
- Balance checking
- Gas estimation
- Address validation and utilities
- Fuel transaction support
- Integration with `@fuels/react` for React hooks

## TypeScript

This package includes TypeScript definitions. All types are exported from the main entry point.

## License

MIT

## Repository

[GitHub](https://github.com/layerswap/layerswapapp/tree/main/packages/wallets/fuel)

