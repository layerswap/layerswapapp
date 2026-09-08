# @layerswap/wallet-core

Headless foundation of the Layerswap wallet stack. Owns the wallet contracts (`WalletProvider`, `WalletConnectionStore`, `WalletConnectionService`, `WalletProviderDescriptor`, `AppNetworkAdapter`), the provider registry and descriptor-hydration machinery, WalletConnect plumbing (registry connectors, deep links, dynamic metadata), EIP-6963 detection, and string-based wallet icon resolution.

Contains no UI. React appears only as a peer dependency for the headless context providers (`WalletProvidersRegistryProvider`, `DescriptorHydrationBoundary`). The visual layer (connect modal, connectors list) lives in `@layerswap/ui-kit`, which depends on this package — never the other way around.

- `@layerswap/wallet-core` — runtime: registry, stores, WalletConnect helpers, icon strings, hooks.
- `@layerswap/wallet-core/types` — the contracts implemented by every `@layerswap/wallet-*` chain package.

Chain packages (`@layerswap/wallet-evm`, `@layerswap/wallet-svm`, …) must depend only on this package, `@layerswap/utils`, and `@layerswap/widget-types` — never on `@layerswap/ui-kit`.
