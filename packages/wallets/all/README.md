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

Render the Layerswap Widget with the wallet providers you want to enable. Only EVM is wired eagerly; every other chain is a lazy descriptor whose SDK is dynamic-imported when the user first opens the connect modal, so it stays out of your entry chunk.

```tsx
import { LayerswapProvider, Swap } from "@layerswap/widget";
import {
  createEVMProvider,
  createStarknetDescriptor,
  createSVMDescriptor,
  createTONDescriptor,
  createTronDescriptor,
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
    createStarknetDescriptor(),
    createSVMDescriptor(walletConnectConfigs),
    createTONDescriptor({
      tonApiKey: "your-ton-api-key",
      manifestUrl: "https://your-app.com/tonconnect-manifest.json"
    }),
    createTronDescriptor(),
  ];

  return (
    <LayerswapProvider walletProviders={walletProviders}>
      <Swap />
    </LayerswapProvider>
  );
}
```

## Usage by network

Exported from the `@layerswap/wallets` root:

- EVM (Ethereum, L2s): `createEVMProvider()` — eager
- Starknet: `createStarknetDescriptor()`
- Solana: `createSVMDescriptor()`
- TON: `createTONDescriptor()`
- Tron: `createTronDescriptor()`
- Fuel: `createFuelDescriptor()`
- Bitcoin: `createBitcoinDescriptor()`
- Paradex: `createParadexDescriptor()`
- Immutable Passport: `createImmutablePassportDescriptor()`

You can mix and match any subset depending on your app needs. If you need the eager (non-descriptor) factory for a chain, import it directly from that chain's package, e.g. `import { createStarknetProvider } from "@layerswap/wallet-starknet"`.

### Eager Immutable Passport subpath

`createImmutablePassportProvider` and `imtblPassportLoginCallback` are intentionally not exported from the package root — a static root import would pull `@imtbl/sdk` (~993 KB Brotli) into every consumer's bundle. Import them from the dedicated subpath, and only from chunks that genuinely need them eagerly (e.g. an OAuth callback page):

```tsx
import {
  createImmutablePassportProvider,
  imtblPassportLoginCallback,
} from "@layerswap/wallets/eager/imtbl-passport";
```

For the common case, use the lazy descriptor via `getDefaultProviders({ immutablePassport })` or `createImmutablePassportDescriptor()` instead.

## Included packages

- `@layerswap/wallet-evm`
- `@layerswap/wallet-starknet`
- `@layerswap/wallet-svm` (Solana)
- `@layerswap/wallet-ton`
- `@layerswap/wallet-tron`
- `@layerswap/wallet-fuel`
- `@layerswap/wallet-bitcoin`
- `@layerswap/wallet-paradex`
- `@layerswap/wallet-imtbl-passport`

## TypeScript

All providers ship type definitions. You can import types either from specific packages or via this aggregator if they are re-exported by the providers.

## Versioning and updates

This package auto-bumps when any of the individual wallet packages receives a release, so you always get the latest providers with a single upgrade.