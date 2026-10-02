# @layerswap/wallet-core

Headless foundation of the Layerswap wallet stack. Owns the wallet contracts (`WalletProvider`, `WalletConnectionStore`, `WalletConnectionService`, `WalletProviderDescriptor`, `AppNetworkAdapter`), the provider registry and descriptor-hydration machinery, WalletConnect plumbing (registry connectors, deep links, dynamic metadata), EIP-6963 detection, and string-based wallet icon resolution.

Contains no UI. React appears only as a peer dependency for the headless context providers (`WalletProvidersRegistryProvider`, `DescriptorHydrationBoundary`). The visual layer (connect modal, connectors list) lives in `@layerswap/ui-kit`, which depends on this package — never the other way around.

- `@layerswap/wallet-core` — runtime: registry, stores, WalletConnect helpers, icon strings, hooks.
- `@layerswap/wallet-core/types` — the contracts implemented by every `@layerswap/wallet-*` chain package.
- `@layerswap/wallet-core/errors` — shared wallet error classification: `isUserRejection(error)`, `normalizeWalletErrorCode(error)` (maps a provider error to a bounded `WalletErrorReasonCode` from `@layerswap/widget-types`), and `walletErrorCode(error)` (the raw provider code). Chain packages and the widget use these instead of per-adapter rejection checks; adapter-specific legacy rules stay at the adapter boundary (e.g. `isEvmUserRejection`). Precedence is by evidence tier, innermost cause first: definitive codes/names, then descriptive message text, then the `-32603` / `SERVER_ERROR` / `InternalRpcError` buckets; `cause`, `data`, `originalError` and `error` wrappers are transparent. Misclassifications are fixed by adding a provenance-tagged fixture to `packages/wallets/core/tests/wallet-error-fixtures.mjs`, not by call-site special cases.
  Transfer providers throw through `walletActionError(name, { message, cause?, reasonCode? })` and `userRejectedError({ message?, cause? })`: `name` is the `ActionMessageType` the widget renders (UI copy only, it never classifies), `reasonCode` is what the host and telemetry are told and wins over every inferred signal anywhere in the `cause` chain. Rule: labels are UI copy; declare declines with `userRejectedError`. `tests/adapter-sentinel-guard.test.mjs` fails CI for any adapter that assigns the rejected label by hand.

Chain packages (`@layerswap/wallet-evm`, `@layerswap/wallet-svm`, …) must depend only on this package, `@layerswap/utils`, and `@layerswap/widget-types` — never on `@layerswap/ui-kit`.

## Swap prerequisites

**Architecture rule:** account preparation must be modular and provider-owned. The shared widget may orchestrate generic prerequisite states and actions, but must never contain chain-specific checks, signing logic, imports, or setup copy.

`SwapPrerequisiteProvider` (from `@layerswap/widget-types`) is an optional capability on `WalletProvider`, `WalletWrapper`, and `WalletProviderDescriptor`, registered through `swapPrerequisiteProvider`. Descriptors must declare this capability themselves; `LazySwapPrerequisiteProvider` checks a recipient before a wallet connects. Registration uses the configured descriptors independently of connection hydration, so loading a wallet cannot interrupt setup. Hosts exposing a network with account prerequisites must include that network's provider or descriptor, even for manually entered recipients. Omitting the capability retains legacy behavior.

- `supports(context)` selects applicable transfers using source/destination metadata.
- `check(context)` is read-only and returns `ready`, `required`, `blocked`, `pending`, or `unavailable`, with a provider-owned title, short description, and optional action. A check failure or timeout blocks continuation.
- `execute(context, actionId, { wallet, signal, onProgress })` performs only the prerequisite. The action specifies the owning account, network, and source/destination role. The implementation must recheck ownership and readiness, respect cancellation before submission, prevent duplicate submissions, and reconcile uncertain confirmations.

The widget renders setup inside the form beside the destination and disables continuation until it is ready. It checks again before opening the completion screen, creating a swap, and executing the source transfer. Payment instructions stay hidden until readiness is verified; a later failure directs the user back to the form instead of offering setup on the completion screen. Changing the route, asset, amount, or recipient invalidates readiness. Already submitted swaps retain the processing flow. `receiveAmount` is omitted for deposits without a fixed amount; providers must handle that explicitly.

The final execution guard runs through the shared transfer and gasless hooks. Buttons and individual withdrawal providers must not call prerequisite checks or carry setup metadata. Swap state supplies an execution snapshot, including the create response before React re-renders and the latest quote afterward.

The Stellar adapter implements account activation guidance, issuer-specific trustlines, XLM reserves, and receiving capacity. Its normal connection supports an explicit trustline signature. A `customConnection` gets external setup guidance unless the host supplies a compatible `swapPrerequisiteProviders` override to `createStellarProvider`.

Run `pnpm --filter @layerswap/wallet-core test` for the generic capability contract and `pnpm --filter @layerswap/wallet-stellar test` for the Stellar implementation.
