---
"@layerswap/utils": minor
"@layerswap/ui-kit": major
"@layerswap/wallet-core": major
---

**New:** The `useCopyClipboard` and `useWindowDimensions` React hooks moved here from `@layerswap/ui-kit` — import them from `@layerswap/utils/react`. `react` is now an optional peer dependency (only the hooks require it; the root utility entry point stays React-free).

**Breaking:** Import UI components and types from `@layerswap/ui-kit` instead of the removed `@layerswap/ui-kit/components` and `@layerswap/ui-kit/types` entry points. The hooks above are no longer exported from the UI-kit root.

Import `AppNetworkAdapter` and `defineNetworkAdapter` from `@layerswap/utils` instead of `@layerswap/wallet-core`. Replace the adapter's `is*Network` predicates with `getNetworkType`.
