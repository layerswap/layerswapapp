# @layerswap/wallet-core

## 2.3.0

### Minor Changes

- bdf46a0: Share wallet error classification through `@layerswap/wallet-core/errors`.
  - `@layerswap/wallet-core/errors` is a new subpath exporting `isUserRejection`, `normalizeWalletErrorCode` and `walletErrorCode`, so the widget and wallet adapters classify wallet cancellations and failures the same way.
  - It also exports the helpers transfer providers throw with: `walletActionError(name, { message, cause?, reasonCode? })` builds the error whose `name` is the `ActionMessageType` the widget renders and whose optional `reasonCode` (a `WalletErrorReasonCode`) is what hosts and telemetry are told; `userRejectedError({ message?, cause? })` is the only sanctioned way to pair the rejected label with `user_rejected`; `isWalletErrorReasonCode(value)` narrows to the bounded taxonomy; `WalletActionError` is the thrown type. An explicit `reasonCode` on the error, anywhere in its `cause` chain, wins over every inferred signal (outermost first).
  - ActionMessageType labels are UI copy and never classify: a bare `TransactionRejected` name no longer yields `user_rejected`. A custom `TransferProvider` that only sets `name = 'TransactionRejected'` shows the rejected copy but is reported to the host as a failure (`onError`, `wallet_action_failed`, `reasonCode: unknown_error`); declare declines with `userRejectedError` instead. The message rules additionally recognise the chain wallets' own decline phrases (`USER_REFUSED_OP`, `Reject request`, `user reject this request`).
  - `@layerswap/wallet-evm` resolves user rejections through the shared helper. The Hyperliquid and Polymarket transfer providers use the common `evmUtils/resolveError` instead of private copies, and the adapter keeps its legacy nested `-1` / `data.code` cancellation handling at the adapter boundary.
  - Classification precedence is by evidence, not by which field a signal came from: a definitive code/name (4001, 5000, `ACTION_REJECTED`, `UserRejectedRequestError`, …) or descriptive message text (`user rejected`, `denied by the user`, `insufficient funds`, …) anywhere in the error tree beats the `-32603` / `SERVER_ERROR` / `InternalRpcError` / `internal error` buckets. viem bucket classes (`InternalRpcError`, `InvalidInputRpcError`, `UnknownRpcError`) contribute no text of their own, so a wrapper can never change what it wraps.
  - `cause`, `data`, `originalError` and `error` are inspected (bounded), covering viem/ethers wrappers, JSON-RPC `data`, MetaMask's `-32603` serializer fallback and ethers v5 `SERVER_ERROR` bodies.
  - Host-visible `reason_code` shifts: wrapped declines that were `internal_rpc_error` become `user_rejected` (Faro impact `expected` via `widget_diagnostic` instead of `user` via `captureException`; `onSwapLifecycle` emits `wallet_action_rejected` instead of `wallet_action_failed`), and viem-wrapped node `-32000` errors report the underlying reason (`insufficient_funds`, `nonce_or_replacement`, `contract_reverted`, `timeout`, `unknown_error`) instead of `invalid_parameters`.

### Patch Changes

- f26c1e7: Wallet declines are reported as declines, and node errors no longer pass for declines.
  - `@layerswap/wallet-core/errors` exports `errorMessage(error)`: an Error's message, a string as is, or a plain `{ message }` object's string message, else `String(error)`. Every adapter's `toTransferError` uses it, so plain-object wallet rejections keep their text instead of `[object Object]`.
  - Classifier: decline text must name the user (`user rejected`, `user denied`, `denied by the user`, …); the generic `rejected the request` phrase is gone, so a node's `origin rejected the request` is no longer `user_rejected`. A revert reason (`execution reverted: …`) never counts as a decline, and on a JSON-RPC server error (`-32000`..`-32099`) the text must start with `user rejected` / `user denied` — WalletConnect wallets that decline with `-32000 "User rejected the request."` stay `user_rejected`. Definitive codes (4001, 5000, `ACTION_REJECTED`, `UserRejectedRequestError`) are unchanged.
  - EVM: `resolveError` checks decline evidence before the nested `-32000` insufficient-funds branch, so a decline relayed as `-32000` is no longer shown as insufficient funds.
  - Starknet: a plain `{ code: 113, message: 'An error occurred (USER_REFUSED_OP)' }` rejection is a declared decline carrying its real message.
  - Stellar: the signing-prompt vocabulary includes `reject` again, so Albedo's `Action request was rejected by the user.` is a decline.
  - TON: TON Connect's `UserRejectsError` is a declared decline (with a name/message fallback for a duplicate SDK copy); the `Reject request` string is still recognised.

- Updated dependencies [95d95a1]
- Updated dependencies [31d0d1f]
- Updated dependencies [5bd03c7]
- Updated dependencies [bdf46a0]
  - @layerswap/widget-types@2.3.0
  - @layerswap/utils@2.3.0

## 2.2.0

### Minor Changes

- Global improvements and bug fixes

### Patch Changes

- Updated dependencies
  - @layerswap/utils@2.2.0
  - @layerswap/widget-types@2.2.0

## 2.1.0

### Minor Changes

- Global fixes and improvements

### Patch Changes

- Updated dependencies
  - @layerswap/utils@2.1.0
  - @layerswap/widget-types@2.1.0

## 2.0.1

### Patch Changes

- Wallet connection readiness fixes
- Updated dependencies
  - @layerswap/utils@2.0.1
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
  - @layerswap/utils@2.0.0
  - @layerswap/widget-types@1.0.0
