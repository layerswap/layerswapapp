# Eager-import audit: `@layerswap/wallet-*` packages

**Question:** which chain SDKs end up on the critical path even when a user
never interacts with that chain, and what's the smallest framework-neutral
refactor that fixes it?

**Constraint reminder:** packages are consumed by Vite, plain React, Next.js,
and others. Use `React.lazy`, dynamic `import()`, subpath exports, and
`/*#__PURE__*/`. Avoid `next/dynamic` or webpack-only APIs.

---

## 1. The pattern repeats across every chain

Each `packages/wallets/<chain>/src/index.tsx` does roughly the same thing:

```ts
import useXxxConnection from "./useXxxConnection"
import XxxProviderWrapper from "./XxxProvider"
import { XxxAddressUtilsProvider } from "./xxxAddressUtilsProvider"
import { XxxBalanceProvider } from "./xxxBalanceProvider"
import { XxxGasProvider } from "./xxxGasProvider"
import { useXxxTransfer } from "./transferProvider/useXxxTransfer"

export function createXxxProvider(config) {
  return {
    wrapper: XxxProviderWrapper,
    walletConnectionProvider: useXxxConnection,
    addressUtilsProvider: [new XxxAddressUtilsProvider()],
    balanceProvider: [...],
    gasProvider: [...],
    transferProvider: [useXxxTransfer],
  }
}
```

The `XxxProviderWrapper` is a React component that wraps `WagmiProvider` /
`TonConnectUIProvider` / `WalletAdapterProvider` / etc. and pulls the heavy
chain SDK in via a module-top import.

**This means calling `createXxxProvider()` synchronously loads the entire
chain SDK, even though the wrapper isn't mounted until much later.**

The good news: `LazyBalanceProvider` and `LazyGasProvider` (already used in
EVM and elsewhere) prove the team has the splitting infrastructure — those
do `() => import(...)` correctly. The pattern just needs to extend to the
React wrapper + connection hook.

## 2. Heavy module-top imports per chain

What gets pulled in eagerly when `createXxxProvider()` is called, per chain:

| Chain | Module-top heavy imports | Est. cost |
|---|---|---:|
| **EVM** | `wagmi`, `@wagmi/core`, `@wagmi/connectors` (→ `@metamask/sdk`, `@coinbase/wallet-sdk`, `@walletconnect/*`) | ~470 KB attributed to MetaMask SDK alone |
| **SVM** | `@solana/web3.js`, `@solana/wallet-adapter-base`, custom `SolanaWalletConnectAdapter` | very large (web3.js is ~250+ KB) |
| **TON** | `@tonconnect/ui-react` (→ `@tonconnect/sdk`, UI bundle) | ~200 KB |
| **Starknet** | `@starknet-react/core`, `starknet` | ~150 KB |
| **Tron** | `@tronweb3/tronwallet-adapter-react-hooks`, `tronweb` | ~300 KB |
| **Bitcoin** | `@bigmi/react`, `@bigmi/client`, `@bigmi/core` (→ `bitcoinjs-lib`) | ~150 KB |
| **Fuel** | `@fuels/react`, `@fuel-ts/*` | ~200 KB |
| **Paradex** | `@paradex/sdk`, `ethers` v6 (already lazy via subpath in some places) | ~100 KB |
| **Imtbl Passport** | `@imtbl/sdk` | ~250 KB (mostly server-only, but client gets the imx-link bundle) |

For a consumer of `@layerswap/wallets` that calls `getDefaultProviders()`
(the documented one-liner setup in the README), **all of the above are
pulled at module load**.

## 3. Module-scope side effects that defeat `sideEffects: false`

`sideEffects: false` is set on every chain package. But the following pieces
of code run at module load, which keeps bundlers from tree-shaking them
even when nothing from the file is imported:

- `packages/wallets/evm/src/EVMProvider/index.tsx:17` — `const queryClient = new QueryClient()`
- `packages/wallets/evm/src/EVMProvider/index.tsx:19` — `let cachedConfig: Config | null = null` (module-scope mutable state)
- Similar `new QueryClient()` at module scope in `bitcoin/src/BitcoinProvider.tsx`, `fuel/src/FuelProvider.tsx`
- Several `createContext(null)` calls at module scope (these are cheap but defeat purity heuristics)
- Multiple `createConnector(...)` calls inside `useEVMConnectors` are inside the hook — those are fine, only run on call

Pure-annotating these helps minifiers know they can drop them when unused:
```ts
const queryClient = /*#__PURE__*/ new QueryClient()
```

## 4. Concrete refactor sketch — EVM (highest impact, +470 KB)

Three layers to split. None require Next-specific APIs.

### Layer A — Lazy-mount the React wrapper

**Before** (`packages/wallets/evm/src/index.tsx`, line 5):

```ts
import EVMProviderWrapper from "./EVMProvider"
// …
const WrapperComponent = ({ children }) => (
  <WalletConnectConfigContext.Provider value={walletConnectConfigs ?? null}>
    <EVMProviderWrapper>{children}</EVMProviderWrapper>
  </WalletConnectConfigContext.Provider>
)
```

**After:**

```ts
import { lazy, Suspense } from "react"

// Synchronously creates a tiny lazy ref; the heavy module loads
// when EVMProviderWrapper is first rendered. Framework-neutral.
const EVMProviderWrapper = /*#__PURE__*/ lazy(() => import("./EVMProvider"))

const WrapperComponent = ({ children }) => (
  <WalletConnectConfigContext.Provider value={walletConnectConfigs ?? null}>
    <Suspense fallback={null}>
      <EVMProviderWrapper>{children}</EVMProviderWrapper>
    </Suspense>
  </WalletConnectConfigContext.Provider>
)
```

This alone moves `wagmi`, `@wagmi/connectors`, `@tanstack/react-query` (the
copy used by the provider), and the chain-configs out of the initial chunk.
The cost is one render-frame of delay when the EVM provider first mounts —
typically the consumer mounts it at app root, so the user sees nothing
different.

Caveat: the consumer's React tree should already render *something* even
while EVM is loading. The Suspense `fallback={null}` covers it — the rest
of the widget renders normally.

### Layer B — Delay connector instantiation inside the wagmi config

**Before** (`packages/wallets/evm/src/EVMProvider/Connectors.ts:4`):

```ts
import { coinbaseWallet, metaMask, walletConnect } from "@wagmi/connectors"

export const useEVMConnectors = (id, configs) => {
  const metaMaskConnector = useMemo(() => metaMask({ dappMetadata: {…} }), [...])
  // …
  return [metaMaskConnector, coinbaseWalletConnector, walletConnectConnector, …]
}
```

**After:**

```ts
import { useEffect, useMemo, useState } from "react"
import type { CreateConnectorFn } from "wagmi"

export const useEVMConnectors = (id, configs): readonly CreateConnectorFn[] => {
  const [factories, setFactories] = useState<{
    metaMask?: typeof import("@wagmi/connectors").metaMask
    coinbaseWallet?: typeof import("@wagmi/connectors").coinbaseWallet
    walletConnect?: typeof import("@wagmi/connectors").walletConnect
  }>({})

  useEffect(() => {
    let cancelled = false
    import("@wagmi/connectors").then(mod => {
      if (cancelled) return
      setFactories({
        metaMask: mod.metaMask,
        coinbaseWallet: mod.coinbaseWallet,
        walletConnect: mod.walletConnect,
      })
    })
    return () => { cancelled = true }
  }, [])

  return useMemo(() => {
    if (!factories.metaMask) return []
    return [
      factories.metaMask({ dappMetadata: {…} }),
      factories.coinbaseWallet({ appName: configs.name, … }),
      factories.walletConnect({ projectId: configs.projectId, … }),
      browserInjected(),
      hiddenWalletConnect({…}),
    ]
  }, [factories, configs])
}
```

This pushes `@metamask/sdk`, `@coinbase/wallet-sdk`, and the heavier parts
of `@walletconnect/*` out of the initial connector eval. The `WagmiProvider`
will receive an empty connectors list on first render and re-evaluate when
the dynamic import resolves — wagmi handles connector list changes safely
because of its reconnect-on-mount mechanism.

If you do **both Layer A and B**, the `@wagmi/connectors` import only
resolves after `EVMProviderWrapper` has mounted *and* the effect has run —
typically ~100 ms after first paint, off the critical path.

### Layer C — Per-connector lazy load (gold standard, optional)

The most aggressive option: only import `@metamask/sdk` when the user
actually clicks the MetaMask button. This requires the connect-wallet UI
in `@layerswap/widget` to support an async connector factory contract
(`{ id, name, icon, load: () => Promise<CreateConnectorFn> }`). Worth doing
later if A+B don't deliver enough; not worth doing now unless the team
already has appetite for changing the connector contract.

## 5. Cross-chain rollout plan

Once Layer A + B are validated on EVM, the exact same pattern applies to
each chain. Estimated effort per chain ~2–4 hours (most of it test/QA):

| Chain | Wrapper to `React.lazy` | Hook to dynamic-import |
|---|---|---|
| EVM | `./EVMProvider` | `@wagmi/connectors` in `Connectors.ts` |
| SVM | `./SVMProvider` | `@solana/web3.js`, `@solana/wallet-adapter-base` in `useSVMConnection` |
| TON | `./TonProvider` | `@tonconnect/ui-react` (note: this lib has CSS imports — check `sideEffects`) |
| Starknet | `./StarknetProvider` | `@starknet-react/core` setup in `useStarknetConnection` |
| Tron | `./TronProvider` | `@tronweb3/tronwallet-adapter-react-hooks` |
| Bitcoin | `./BitcoinProvider` | `@bigmi/react`, `@bigmi/client` in the provider/hook |
| Fuel | `./FuelProvider` | `@fuels/react` in the provider |
| Paradex | (provider in `index.tsx`) | `@paradex/sdk` in `useParadexConnection` |
| Imtbl Passport | `./ImtblPassportProvider` | `@imtbl/sdk` in the provider |

Bonus: **pure-annotate the side-effecty module-scope code** as part of each
chain's PR:

```ts
const queryClient = /*#__PURE__*/ new QueryClient()
let cachedConfig: Config | null = null  // unavoidable; document why
```

## 6. Public API impact

Critically — **the consumer-facing API does not change.** All these refactors
live inside the chain packages' own source. Users calling
`getDefaultProviders()` or `createEVMProvider()` get the same return shape,
the same props on the wrapper, the same hooks. The only difference is the
wrapper component is now a `React.lazy` ref and renders inside a Suspense
boundary instead of a plain component.

This is important for the published widget — no breaking change for
integrators on Vite/Next/CRA. Versioned as a minor bump.

## 7. Expected wins (informed estimate, must verify)

Re-running the same Lighthouse + bundle-size measurement after Layer A+B
on EVM only should show:

- `/` First Load JS: **2.23 MB → ~1.85–1.95 MB** (saving ~300–400 KB, mostly the MetaMask SDK)
- JS bootup time: regress closer to dev branch numbers (-100–200 ms TBT)
- Framework chunk: unchanged (that's a separate issue)

After rolling A+B across all 9 chains, estimated `/` First Load JS:
~1.5–1.7 MB — back into the same range as the single-app dev branch, or
better.

These are estimates. Re-run the benchmark methodology in `perf-baseline.md`
to verify.

## 8. Suggested first PR

Scope: **EVM only**, Layer A + Layer B.

Files touched:
- `packages/wallets/evm/src/index.tsx` — convert `EVMProviderWrapper` to `React.lazy`, wrap in Suspense
- `packages/wallets/evm/src/EVMProvider/Connectors.ts` — switch `@wagmi/connectors` to dynamic import inside `useEVMConnectors`
- `packages/wallets/evm/src/EVMProvider/index.tsx` — pure-annotate `new QueryClient()`

QA:
- Connect with each EVM wallet (MetaMask, WalletConnect QR, Coinbase, injected) — verify no regression
- Verify reconnect-on-page-reload still works
- Re-run `pnpm build` and compare First Load JS on `/`
- Run Lighthouse, compare TBT
