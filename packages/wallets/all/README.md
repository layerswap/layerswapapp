# @layerswap/wallets

Unified entry point for all Layerswap wallet providers. Import providers for multiple chains from a single package.

## Installation

Install the aggregator and common peer dependencies used by EVM wallets:

```bash
npm install @layerswap/wallets wagmi viem @tanstack/react-query @bigmi/client @bigmi/core @bigmi/react
# or
yarn add @layerswap/wallets wagmi viem @tanstack/react-query @bigmi/client @bigmi/core @bigmi/react
# or
pnpm add @layerswap/wallets wagmi viem @tanstack/react-query @bigmi/client @bigmi/core @bigmi/react
```

## Quick start

## Convenience function

For a quick setup with all providers, use `getDefaultProviders()`:

```tsx
import { getDefaultProviders } from "@layerswap/wallets";
import { LayerswapProvider, Swap } from "@layerswap/widget";

export default function Page() {
  const walletProviders = getDefaultProviders({
    walletConnect: {
      projectId: "your-project-id",
      name: "Your App",
      description: "Your app description",
      url: "https://your-app.com",
      icons: ["https://your-app.com/icon.png"]
    },
    ton: {
      tonApiKey: "your-ton-api-key",
      manifestUrl: "https://your-app.com/tonconnect-manifest.json"
    }
  });
  
  return (
    <LayerswapProvider walletProviders={walletProviders}>
      <Swap />
    </LayerswapProvider>
  );
}
```

Render the Layerswap Widget with the wallet providers you want to enable. Only the providers you include are bundled (tree-shakeable).

```tsx
import { LayerswapProvider, Swap } from "@layerswap/widget";
import {
  createEVMProvider,
  createStarknetProvider,
  createSVMProvider,
  createTONProvider,
  createTronProvider,
} from "@layerswap/wallets";

export default function Page() {

  const walletConnectConfigs = {
    projectId: "your-project-id",
    name: "Your App",
    description: "Your app description",
    url: "https://your-app.com",
    icons: ["https://your-app.com/icon.png"]
  }

  const walletProviders = [
    createEVMProvider({
      walletConnectConfigs
    }),
    createStarknetProvider({
      walletConnectConfigs
    }),
    createSVMProvider({
      walletConnectConfigs
    }),
    createTONProvider({
      tonConfigs: {
        tonApiKey: "your-ton-api-key",
        manifestUrl: "https://your-app.com/tonconnect-manifest.json"
      }
    }),
    createTronProvider(),
  ];
  
  return (
    <LayerswapProvider walletProviders={walletProviders}>
      <Swap />
    </LayerswapProvider>
  );
}
```

## Usage by network

All provider factories are exported from `@layerswap/wallets`:

- EVM (Ethereum, L2s): `createEVMProvider()`
- Starknet: `createStarknetProvider()`
- Solana: `createSVMProvider()`
- TON: `createTONProvider()`
- Tron: `createTronProvider()`
- Fuel: `createFuelProvider()`
- Bitcoin: `createBitcoinProvider()`
- Paradex: `createParadexProvider()`
- Immutable X: `createImmutableXProvider()`
- Immutable Passport: `createImmutablePassportProvider()`
- Loopring (module): `createLoopringModule()` - use with `createEVMProvider()`
- zkSync (module): `createZkSyncModule()` - use with `createEVMProvider()`

You can mix and match any subset depending on your app needs.

## Included packages

- `@layerswap/wallet-evm`
- `@layerswap/wallet-starknet`
- `@layerswap/wallet-svm` (Solana)
- `@layerswap/wallet-ton`
- `@layerswap/wallet-tron`
- `@layerswap/wallet-fuel`
- `@layerswap/wallet-bitcoin`
- `@layerswap/wallet-paradex`
- `@layerswap/wallet-imtbl-x`
- `@layerswap/wallet-imtbl-passport`

## TypeScript

All providers ship type definitions. You can import types either from specific packages or via this aggregator if they are re-exported by the providers.

## Versioning and updates

This package auto-bumps when any of the individual wallet packages receives a release, so you always get the latest providers with a single upgrade.