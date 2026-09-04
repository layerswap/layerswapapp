# @layerswap/wallet-ton

## 2.0.1

### Patch Changes

- Wallet connection readiness fixes
- Updated dependencies
  - @layerswap/utils@2.0.1
  - @layerswap/wallet-core@2.0.1
  - @layerswap/widget-types@1.0.1

## 2.0.0

### Major Changes

- 3e34e07: Wallets 2.0 — the wallet stack is re-architected into a layered package family with lazy chain loading.

  **Breaking changes**
  - New `@layerswap/wallet-core` package: the headless foundation (wallet contracts — `WalletProvider`, `WalletWrapper`, `WalletProviderDescriptor`, the shared connection-service contract — plus the provider registry and WalletConnect plumbing), extracted from the widget. New `@layerswap/ui-kit` package: the presentational connect modal and connectors list. Chain packages depend only on wallet-core, `@layerswap/utils`, and `@layerswap/widget-types`.
  - `getDefaultProviders()` now returns lazy `WalletProviderDescriptor`s for every chain except EVM. Chain SDKs (`starknet`, `@paradex/sdk`, `@ton/*`, `@fuel-ts/*`, `@solana/web3.js`, `tronweb`, `bitcoinjs-lib`, `@bigmi`) are dynamic-imported when the connect modal opens instead of shipping in the host's entry bundle. Persisted sessions still hydrate their provider eagerly on startup.
  - Root exports of `@layerswap/wallets` changed accordingly: non-EVM chains now export `create<Chain>Descriptor` instead of `create<Chain>Provider`. Eager factories remain available from each `@layerswap/wallet-<chain>` package; the eager Immutable Passport factory moved to the `@layerswap/wallets/eager/imtbl-passport` subpath.
  - The hook-based `WalletProvider` contract was replaced with vanilla store factories (`useChainConfigs` is no longer exported from the root).
  - Wallet provider ids are unified into the compile-time-enforced `WalletProviderId` union in `@layerswap/widget-types` (note: Solana's id is `'solana'`, not `'svm'`).
  - The per-provider `registryWallets` array was removed. WalletConnect Explorer metadata is flattened onto each connector (`source: 'registry'`, `networkTypes`, `mobile`); use `isWalletConnectRegistryConnector()` from `@layerswap/wallet-core` to identify registry connectors.
  - Bitcoin: the Phantom connector was removed (dropped upstream by `@bigmi/client` v0.9).

  **New**
  - EVM: injected wallets are discovered via EIP-6963 multi-injected provider discovery (replacing the bare injected connector), and an externally-provided wagmi `Config` can be adopted via `createEVMProvider({ wagmiConfig })` so the widget shares the host app's EVM state.
  - Solana: Token-2022 balances and withdrawals; live Wallet Standard discovery with multichain detection.
  - Bitcoin: added Ctrl, OKX, Bitget, and MetaMask connectors (joining Xverse, UniSat, Leather, OneKey); updated PSBT finalization.
  - Tron: Trust Wallet adapter; adapters are resolved by connector id instead of display name.
  - TON: mobile bridge transfers open the wallet app.

  **Fixed**
  - Starknet: real extension availability detection and session restore after refresh.
  - Fuel: reliable extension detection and session restore.
  - Paradex: wallet restored after a page refresh; hidden from the connect list until hydrated.
  - Bitcoin: MetaMask auto-reconnect popup and stuck connect button; wallet icon/name after reload; hardened disconnect.
  - Solana: the WalletConnect modal no longer opens unprompted on load.
  - Raw inline-SVG wallet icons are normalized, and the shared RPC-health store stays alive across consumer unmounts.

### Patch Changes

- Updated dependencies [3e34e07]
- Updated dependencies [3e34e07]
- Updated dependencies [3e34e07]
  - @layerswap/utils@2.0.0
  - @layerswap/wallet-core@2.0.0
  - @layerswap/widget-types@1.0.0

## 1.7.0

### Minor Changes

- Add Polymarket withdrawal

### Patch Changes

- Updated dependencies
  - @layerswap/widget@1.7.0

## 1.6.0

### Minor Changes

- Added gasless transactions

### Patch Changes

- Updated dependencies
  - @layerswap/widget@1.6.0

## 1.5.0

### Minor Changes

- Add Deposit from Hyperliquid option

### Patch Changes

- Updated dependencies
  - @layerswap/widget@1.5.0

## 1.4.0

### Minor Changes

- Add Deposit widget

### Patch Changes

- Updated dependencies
  - @layerswap/widget@1.4.0

## 1.2.1

### Patch Changes

- Minor bug fixes and improvements
- Updated dependencies
  - @layerswap/widget@1.2.2

## 1.2.0

### Patch Changes

- Updated dependencies
  - @layerswap/widget@1.2.0
