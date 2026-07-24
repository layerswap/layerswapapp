# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Layerswap UI — a Next.js 15 web application (Pages Router) for cross-chain token swaps across 9+ blockchain networks (EVM, Solana, Starknet, TON, TRON, Fuel, Bitcoin, Cosmos, ZkSync).

## Commands

```bash
pnpm install      # Install dependencies
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm lint         # ESLint (next/core-web-vitals + custom JSX literal plugin)
pnpm storybook    # Component docs on port 6006
ANALYZE=true pnpm build  # Bundle analysis
```

No unit test framework is configured. Storybook is used for component documentation.

## Environment Variables

```bash
NEXT_PUBLIC_LS_API=https://api-dev.layerswap.cloud/   # API base URL
NEXT_PUBLIC_API_KEY=mainnet                            # "sandbox" for testnets
```

Production uses `https://api.layerswap.io` with additional env vars for identity API, Immutable, WalletConnect, and PostHog (see `.env`).

## Architecture

### Data Flow

1. **Server-side**: `getServerSideProps` in `helpers/getSettings.ts` fetches networks, exchanges, and routes via `LayerSwapApiClient`, compresses them with `settingsCompression`, and passes as page props
2. **Client-side**: Settings are inflated and pre-populated into SWR cache as fallback data. SWR handles subsequent client-side data fetching (5s dedup, no revalidation on focus)
3. **State**: Zustand stores for wallet state, balances, slippage, routes, and transactions. React Context for swap flow, settings, form wizard, validation, and wallet providers

### Key Architectural Patterns

- **Pages Router** (not App Router) — routes are in `pages/`, SSR via `getServerSideProps`
- **Hybrid state**: Zustand for persistent/global state (10 stores in `stores/`), React Context for component-tree-scoped state (13 contexts in `context/`)
- **Multi-chain wallet abstraction**: `lib/wallets/` contains adapters for each chain type, unified through `WalletProvider` model and `walletStore`
- **API client**: `lib/apiClients/layerSwapApiClient.ts` — Axios-based with auth interceptors, retry logic, and PostHog error tracking
- **SWR fallback pattern**: Server-fetched data is injected into SWR cache at page level, enabling instant renders with background revalidation
- **Settings compression**: Large settings objects are compressed for SSR transfer (`helpers/settingsCompression.ts`)
- **Path alias**: `@/*` maps to project root

### Network Types

Defined in `Models/Network.ts` as `NetworkType` enum: EVM, Starknet, Solana, Cosmos, StarkEx, ZkSyncLite, TON, Fuel, Bitcoin. Each has chain-specific wallet adapters, balance resolvers, and gas estimators in `lib/`.

### Key Entry Points

- `pages/_app.js` — Root: SWRConfig, PostHog, Intercom providers
- `pages/index.tsx` — Home: inflates settings, sets up SWR fallback, renders `<Layout>` + `<Swap>`
- `components/layout.tsx` — Layout wrapper with settings/query/wallet providers
- `components/swapComponent.tsx` — Main swap interface orchestrator

## Linting Rules

- **Custom ESLint plugin** `no-conditional-literals-in-jsx`: prevents conditional literals and unwrapped text in JSX (both set to `error`)
- `react-hooks/exhaustive-deps` is **disabled**
- `react/display-name` is **disabled**

## Project Structure

```
components/     # React components (~284 .tsx files)
context/        # React context providers (swap, settings, wallet, wizard, validation, etc.)
hooks/          # Custom React hooks (useWallet, useFee, useFormRoutes, etc.)
helpers/        # Utility functions (settings, balances, routes, tokens)
lib/            # API clients, wallet adapters, balance resolvers, gas estimators
  ├── apiClients/   # LayerSwap API, JSON-RPC, Hyperliquid clients
  ├── wallets/      # Per-chain wallet integrations
  ├── balances/     # Per-chain balance fetchers
  └── gas/          # Per-chain gas estimation
Models/         # TypeScript interfaces (Network, Token, Route, Exchange, SwapStatus, etc.)
pages/          # Next.js pages (index, swap/[swapId], transactions, campaigns)
stores/         # Zustand stores (wallet, balance, slippage, routes, transactions)
styles/         # Global CSS
stories/        # Storybook stories
```

## Key Dependencies

| Category | Libraries |
|----------|-----------|
| Framework | Next.js 15, React 18, TypeScript 5 |
| Styling | Tailwind CSS v4, Framer Motion, Headless UI, Radix UI |
| State | Zustand, SWR, React Query, Formik |
| EVM | wagmi, viem, ethers v5 |
| Solana | @solana/web3.js, wallet-adapter-react |
| Starknet | starknet v8, @starknet-react/core, starknetkit |
| Other chains | @ton/ton, @tronweb3/*, @fuel-ts/*, @imtbl/sdk, @paradex/sdk |
| Analytics | PostHog |

## Merge Safety

Most conflicts in this repo are **semantic (silent)**: two branches edit *different* files — a shared type/contract on one side, a consumer or a newly-added sibling on the other — so git merges cleanly with no `<<<<<<<` markers, but the result fails to typecheck or double-executes at runtime. **A clean merge is not a correct merge.**

**After every merge/rebase, run `pnpm check:types` (or `pnpm build`) before committing** — for silent conflicts, the type errors are the real conflict report. Then watch for these recurring categories (each one bit us in the widget-CDN merge):

- **Contract changed on one side.** A refactor changes a shared type (component → `string`, `T[]` → a union) while the other branch keeps consuming the old shape. Fix the consumer to the *new* contract using the migrating branch's helper — not a local cast or patch.
- **New sibling written against the old pattern.** One branch adds a feature (a field, a list extraction) using the pre-refactor idiom while the other branch rewrote that idiom. Make the newcomer follow the pattern its siblings now use.
- **Relocated responsibility → duplicated logic.** A refactor moves work (render → effect, hook → service); the merge keeps *both* copies so it runs twice. Delete the copy the refactor superseded rather than making both compile.
- **Rename / delete collisions.** One branch renames or deletes a symbol/file (a rebrand, a moved export) while the other still references it. After merging, grep for references to anything renamed or removed.
- **Hand-resolution slips.** When a file genuinely conflicts, resolve it *whole* — don't keep one side's function body with the other side's return-type annotation or imports. Confirm a function's declared type still matches what its body returns.

Package-specific contracts that are especially prone to the above live in the nested `CLAUDE.md` for that package (e.g. `packages/widget/core/CLAUDE.md`).

## PR Review System

This project includes specialized review tooling in `.cursor/agents/`. For comprehensive reviews, read `.cursor/agents/pr-review-coordinator.md` which orchestrates 6 parallel reviewers (architecture, bugs, performance, quality, react, security). For quick single-perspective reviews, use `.cursor/agents/pr-reviewer.md`.

Review workflow: read `.cursor/commands/reviewchanges.md`, output findings to `pr-review-report.md`.

## React Performance Rules

`.cursor/skills/vercel-react-best-practices/SKILL.md` contains 45+ optimization rules. Key ones:
- `async-parallel.md` — Use `Promise.all()` for independent operations
- `bundle-barrel-imports.md` — Import directly, avoid barrel files
- `bundle-dynamic-imports.md` — Use `next/dynamic` for heavy components
- `rerender-memo.md` — Extract expensive work into memoized components
