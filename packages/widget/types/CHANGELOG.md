# @layerswap/widget-types

## 2.0.1

### Major Changes

- Wallet connection readiness fixes

## 1.0.0

### Major Changes

- 3e34e07: Initial public release — shared TypeScript contracts for the Layerswap widget and wallet packages, extracted from `@layerswap/widget` and `@layerswap/utils`.

  Includes the integrator-facing config contracts (`WidgetConfig`, `WidgetCallbacks`, `WidgetProps`, `WalletDefaults`, `WalletProviderId`), network and route models (`NetworkType`, `Network`, `NetworkWithTokens`, `Token`, `NetworkRoute`), wallet models (`Wallet`, `InternalConnector`, `WalletConnectConfig`), theme types (`ThemeData`, `ThemeColor`, `StatusColor`), `SwapStatus`, error/event types, and the balance/gas/contract resolver contracts. Framework-agnostic by construction — the package carries no dependency on React.
