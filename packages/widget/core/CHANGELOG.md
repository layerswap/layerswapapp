# @layerswap/widget

## 2.0.0

### Major Changes

- 3e34e07: Widget 2.0 — the widget is now a family of packages with a hardened embedding story.

  **Breaking changes**
  - `NetworkType` and `NetworkWithTokens` are no longer exported from the package root — import them from the new `@layerswap/widget-types` package. Shared models (`Wallet`, `InternalConnector`, network/route models, theme types, `SwapStatus`, `WidgetConfig`) now live in `@layerswap/widget-types`; the `@layerswap/widget/types` subpath keeps re-exporting wallet contracts for backward compatibility.
  - `Wallet.icon` and `InternalConnector.icon` are now URL / `data:` URI strings instead of React components.
  - The `MultiStepTransfer` types were removed from the `./types` subpath.
  - `LayerswapWidgetConfig` is now a refinement of the public `WidgetConfig` contract from `@layerswap/widget-types`. `walletProviders` accepts lazy `WalletProviderDescriptor`s alongside eager providers — descriptors defer each chain SDK until the connect modal opens.
  - `config.walletConnect`, `config.imtblPassport`, and `config.tonConfigs` are deprecated — pass them to the wallet provider factories (or `walletDefaults` in the loader packages) instead.
  - Only one live `LayerswapProvider` per page is supported; a second concurrent instance renders an explicit failure instead of silently sharing global state.

  **New**
  - New sibling packages: `@layerswap/widget-react` (CDN-delivered widget runtime via Module Federation — signed manifest, kill switch, per-chunk SRI verification, channel releases; the widget and its dependencies never enter the host bundle), `@layerswap/widget-js` (framework-agnostic loader that mounts the widget into any DOM element), and `@layerswap/widget-types` (shared TypeScript contracts).
  - `walletProvidersConfig.include` / `walletProvidersConfig.exclude` — allowlist or blocklist wallet ecosystems by `WalletProviderId`.
  - `config.apiUri` for pointing the widget at a custom API endpoint.
  - Gasless routes are reflected in quote and limits calculations; the destination address is now passed to quote and limits fetching.
  - Adaptive burst-and-decay polling for swap status.
  - Layered extended-route feature flags (Hyperliquid, Polymarket) with an explicit per-provider fail direction; Polymarket relay submissions are validated before spending builder auth.
  - Collapsible multi-account wallet list, wallet icons for saved-address picks, and swap-history filtering (capped at 6 wallet addresses).
  - Theme overrides for the portal, wide version, and "Powered by" visibility.
  - `PRICE_IMPACT_TOO_HIGH` is surfaced as its own error instead of "Rate not available".

  **Fixed**
  - The wallet list is gated behind a skeleton until providers hydrate, and persisted wallet sessions hydrate lazy providers on startup — no more refresh flicker or premature "no wallet" states.
  - The deposit flow starts on the correct step from first render, and the deposit-method default waits for wallet-provider readiness.
  - Popovers and modals default to the `#widget` container, making portal-based embedding safe.
  - Fixed a crash when selecting a manually-added destination address, refund transaction details display, rejected QR connection attempts, and async init failures being swallowed.

### Patch Changes

- Updated dependencies [3e34e07]
- Updated dependencies [3e34e07]
- Updated dependencies [3e34e07]
  - @layerswap/utils@2.0.0
  - @layerswap/wallet-core@2.0.0
  - @layerswap/ui-kit@2.0.0
  - @layerswap/widget-types@1.0.0

## 1.7.0

### Minor Changes

- Add Polymarket withdrawal

### Patch Changes

- Updated dependencies
  - @layerswap/utils@1.7.0

## 1.6.0

### Minor Changes

- Added gasless transactions

### Patch Changes

- Updated dependencies
  - @layerswap/utils@1.6.0

## 1.5.0

### Minor Changes

- Add Deposit from Hyperliquid option

### Patch Changes

- Updated dependencies
  - @layerswap/utils@1.5.0

## 1.4.0

### Minor Changes

- Add Deposit widget

### Patch Changes

- Updated dependencies
  - @layerswap/utils@1.4.0

## 1.2.2

### Patch Changes

- Minor bug fixes and improvements

## 1.2.0

### Minor Changes

- Fix issues related to React 19, and implement global UX improvements

## 1.1.5

### Patch Changes

- Minor bug fixes and improvements

## 1.1.4

### Patch Changes

- Minor bug fixes and improvements

## 1.1.3

### Patch Changes

- Fix modal overlay

## 1.1.2

### Patch Changes

- Modal and loading minor style fixes

## 1.1.1

### Patch Changes

- Minor bug fixes and improvements
