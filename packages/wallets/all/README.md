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

Notes:
- You also need `react` and `react-dom` in your app.
- Some networks may require additional peers (e.g. Solana adapters, TON libs) which are pulled by the individual wallet packages as needed.

## Quick start

Render the Layerswap Widget with the wallet providers you want to enable. Only the providers you include are bundled (tree-shakeable).

```tsx
import { LayerswapProvider, Swap } from "@layerswap/widget";
import {
  EVMProvider,
  StarknetProvider,
  SVMProvider,
  TonProvider,
  TronProvider,
} from "@layerswap/wallets";

export default function Page() {
  return (
    <LayerswapProvider walletProviders={[
      EVMProvider,
      StarknetProvider,
      SVMProvider,
      TonProvider,
      TronProvider,
    ]}>
      <Swap />
    </LayerswapProvider>
  );
}
```

## Usage by network

All providers are exported from `@layerswap/wallets` and can be passed directly to `LayerswapProvider`:

- EVM (Ethereum, L2s): `EVMProvider`
- Starknet: `StarknetProvider`
- Solana: `SVMProvider`
- TON: `TonProvider`
- Tron: `TronProvider`
- Fuel: `FuelProvider`
- Bitcoin: `BitcoinProvider`
- Paradex: `ParadexProvider`
- Immutable X: `ImtblXProvider`
- Immutable Passport: `ImtblPassportProvider`

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

