# @layerswap/wallet-evm

EVM (Ethereum Virtual Machine) wallet provider for the Layerswap Widget. Supports Ethereum and all EVM-compatible chains including L2s.

## Installation

```bash
npm install @layerswap/wallet-evm wagmi@2.14.11 @wagmi/core@2.16.4 @wagmi/connectors@5.7.7 viem@^2.21.16 @tanstack/react-query
# or
yarn add @layerswap/wallet-evm wagmi@2.14.11 @wagmi/core@2.16.4 @wagmi/connectors@5.7.7 viem@^2.21.16 @tanstack/react-query
# or
pnpm add @layerswap/wallet-evm wagmi@2.14.11 @wagmi/core@2.16.4 @wagmi/connectors@5.7.7 viem@^2.21.16 @tanstack/react-query
```

`wagmi`, `@wagmi/core`, `@wagmi/connectors`, and `viem` are peer dependencies
supplied by the host application. Keep their versions aligned with the host's
Wagmi installation. The adapter uses development dependencies for local builds
and tests; it does not declare a separate runtime dependency on these packages.

## Quick Start

The default MetaMask connector uses `@metamask/connect-evm` through a Wagmi 2
connector. The existing Wagmi and Viem requirements are unchanged; CDN hosts do
not need to upgrade them for this migration.

```tsx
import { LayerswapProvider, Swap } from "@layerswap/widget";
import { createEVMProvider } from "@layerswap/wallet-evm";

export default function Page() {
  const evmProvider = createEVMProvider({
    walletConnectConfigs: {
      projectId: "your-project-id",
      name: "Your App",
      description: "Your app description",
      url: "https://your-app.com",
      icons: ["https://your-app.com/icon.png"]
    }
  });
  
  return (
    <LayerswapProvider walletProviders={[evmProvider]}>
      <Swap />
    </LayerswapProvider>
  );
}
```

## Usage

Use `createEVMProvider()` to create an EVM wallet provider:

```tsx
import { createEVMProvider } from "@layerswap/wallet-evm";

const evmProvider = createEVMProvider({
  walletConnectConfigs: {
    projectId: "your-project-id",
    name: "Your App",
    description: "Your app description",
    url: "https://your-app.com",
    icons: ["https://your-app.com/icon.png"]
  },
  walletProviderModules: [
    // Additional wallet modules
  ]
});
```

### Existing Wagmi Provider

When your application already owns a Wagmi config, pass the same config to
Layerswap so the host UI and widget share connections:

Layerswap preserves the host's Wagmi 2 config and connectors. Updating the
widget's default MetaMask connector does not replace a host-owned legacy
MetaMask connection. A host that supplies its own connectors controls their SDK
and session lifecycle.

Configure the chains you intend to use before initializing a host-owned
MetaMask Connect client. Its supported RPC networks are captured at client
creation; extending a Wagmi config later does not extend an existing SDK client.

The new SDK owns its session storage. An existing legacy mobile session may
require connecting again after deployment; do not copy old SDK session data or
clear unrelated wallet storage. Verify both a fresh connection and a reload of
the new session on mobile before promoting the release.

```tsx
const evmProvider = createEVMProvider({
  wagmiConfig: config,
});

return (
  <WagmiProvider config={config}>
    <LayerswapProvider walletProviders={[evmProvider]}>
      <Swap />
    </LayerswapProvider>
  </WagmiProvider>
);
```

### Supported Wallets

- MetaMask
- WalletConnect
- Coinbase Wallet
- And other wagmi-compatible wallets

### Supported Chains

All EVM-compatible chains including:
- Ethereum
- Polygon
- Arbitrum
- Optimism
- Base
- And many more L2s

## RPC preparation and retries

Transfers hand the requested chain, account, target, value, and calldata directly
to the wallet. The wallet selects gas and fees; application RPC estimates and
balance checks do not delay or block the wallet request.

After a wallet insufficient-funds error on a native-token send, a best-effort
background estimate of the actual target can make Adjust amount available.
Recovery never automatically resends, overrides the wallet error, or changes the
amount. Estimates arriving after five seconds or after another send attempt are
ignored. The existing gas warning and 2% Max reserve remain in place.

The shared fallback transport now forwards an explicit `retryCount` to viem's
outer fallback cycle. This also affects balance providers that supply retry
options: `retryCount: 0` tries each eligible RPC once without additional cycles.
Leaving it undefined retains viem's default three retries, or up to four cycles.
Background fee recovery explicitly disables retries and uses a 1.5-second
timeout per HTTP request; its estimate is usable for at most five seconds.

## Documentation

For detailed setup instructions, configuration options, and usage examples, see the [EVM Wallet Provider documentation](https://docs.layerswap.io/integration/UI/Widget/WalletManagement/EVMProvider).

## Features

- Multi-wallet support via wagmi
- WalletConnect integration
- Balance checking (including Hyperliquid support)
- Gas estimation
- Address validation and utilities
- Contract address utilities
- EVM transaction support
- Extensible via wallet provider modules

## Exports

- `createEVMProvider()` - Factory function for creating EVM providers
- `getEvmChainsConfig()` - Creates chain and transport configuration from widget networks
- `getEvmConfig()` - Returns the active internal or externally provided Wagmi config
- `getEthersSigner()` - Resolves an ethers signer for the active EVM wallet

## TypeScript

This package includes TypeScript definitions. All types are exported from the main entry point.

## License

MIT

## Repository

[GitHub](https://github.com/layerswap/layerswapapp/tree/main/packages/wallets/evm)
