# @layerswap/wallet-ton

TON (The Open Network) wallet provider for the Layerswap Widget. Enables TON wallet connections and transactions.

## Installation

```bash @layerswap/widget
# or
yarn add @layerswap/wallet-ton
# or
pnpm add @layerswap/wallet-ton
```

## Quick Start

```tsx
import { LayerswapProvider, Swap } from "@layerswap/widget";
import { createTONProvider } from "@layerswap/wallet-ton";

export default function Page() {
  const tonProvider = createTONProvider({
    tonConfigs: {
      tonApiKey: "your-ton-api-key",
      manifestUrl: "https://your-app.com/tonconnect-manifest.json"
    }
  });
  
  return (
    <LayerswapProvider walletProviders={[tonProvider]}>
      <Swap />
    </LayerswapProvider>
  );
}
```

## Usage

Use `createTONProvider()` to create a TON wallet provider:

```tsx
import { createTONProvider } from "@layerswap/wallet-ton";

const tonProvider = createTONProvider({
  tonConfigs: {
    tonApiKey: "your-ton-api-key",
    manifestUrl: "https://your-app.com/tonconnect-manifest.json"
  }
});
```

## Documentation

For detailed setup instructions, configuration options, and usage examples, see the [TON Wallet Provider documentation](https://docs.layerswap.io/integration/UI/Widget/WalletManagement/TonProvider).

## Features

- TON wallet connection via TON Connect
- Balance checking
- Gas estimation
- Address validation and utilities
- TON transaction support
- Integration with `@tonconnect/ui-react`

## TypeScript

This package includes TypeScript definitions. All types are exported from the main entry point.

## License

MIT

## Repository

[GitHub](https://github.com/layerswap/layerswapapp/tree/main/packages/wallets/ton)

