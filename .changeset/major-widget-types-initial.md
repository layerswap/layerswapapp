---
"@layerswap/widget-types": major
---

Initial public release — shared TypeScript contracts for the Layerswap widget and wallet packages, extracted from `@layerswap/widget` and `@layerswap/utils`.

Includes the integrator-facing config contracts (`WidgetConfig`, `WidgetCallbacks`, `WidgetProps`, `WalletDefaults`, `WalletProviderId`), network and route models (`NetworkType`, `Network`, `NetworkWithTokens`, `Token`, `NetworkRoute`), wallet models (`Wallet`, `InternalConnector`, `WalletConnectConfig`), theme types (`ThemeData`, `ThemeColor`, `StatusColor`), `SwapStatus`, error/event types, and the balance/gas/contract resolver contracts. Framework-agnostic by construction — the package carries no dependency on React.
