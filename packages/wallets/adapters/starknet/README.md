# @layerswap/wallet-starknet

Starknet wallet provider for the Layerswap Widget. Enables Starknet wallet connections and transactions.

## Installation

```bash
npm install @layerswap/wallet-starknet
# or
yarn add @layerswap/wallet-starknet
# or
pnpm add @layerswap/wallet-starknet
```

## Quick Start

```tsx
import { LayerswapProvider, Swap } from "@layerswap/widget";
import { createStarknetProvider } from "@layerswap/wallet-starknet";

export default function Page() {
  const starknetProvider = createStarknetProvider({
    walletConnectConfigs: {
      projectId: "your-project-id",
      name: "Your App",
      description: "Your app description",
      url: "https://your-app.com",
      icons: ["https://your-app.com/icon.png"]
    }
  });
  
  return (
    <LayerswapProvider walletProviders={[starknetProvider]}>
      <Swap />
    </LayerswapProvider>
  );
}
```

## Usage

Use `createStarknetProvider()` to create a Starknet wallet provider:

```tsx
import { createStarknetProvider } from "@layerswap/wallet-starknet";

const starknetProvider = createStarknetProvider({
  walletConnectConfigs: {
    projectId: "your-project-id",
    name: "Your App",
    description: "Your app description",
    url: "https://your-app.com",
    icons: ["https://your-app.com/icon.png"]
  }
});
```

## Documentation

For detailed setup instructions, configuration options, and usage examples, see the [Starknet Wallet Provider documentation](https://docs.layerswap.io/integration/UI/Widget/WalletManagement/StarknetProvider).

## Features

- Starknet wallet connection via StarknetKit
- Balance checking
- Gas estimation
- NFT provider support
- Address validation and utilities
- Starknet transaction support

## Supported Wallets

- Ready Wallet
- Ready
- Web wallet
- Braavos
- Keplr
- Xverse
- Cartridge Controller

## RPC compatibility

Balance queries, NFT queries, fee estimation, and connected wallet accounts use
Starknet.js 10 through the `starknet-rpc` package alias, supporting RPC v0.10 and
v0.9. The shared `starknet` catalog stays on v8 for Starknet React, StarknetKit,
and Paradex. Paradex reuses the connected account's v10 RPC provider for
Starknet authorization reads while retaining v8 for its own chain.

RPC URLs come from the network configuration (`node_url`, or `getRpcUrls` for a
custom network adapter). Configure an endpoint that serves RPC v0.10 to use that
version. URLs are passed through unchanged, and the provider detects the RPC
version. RPC v0.8 endpoints are no longer supported by this adapter.

## TypeScript

This package includes TypeScript definitions. All types are exported from the main entry point.

## License

MIT

## Repository

[GitHub](https://github.com/layerswap/layerswapapp/tree/main/packages/wallets/starknet)

