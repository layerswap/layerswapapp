---
"@layerswap/wallet-evm": minor
"@layerswap/wallet-fuel": minor
"@layerswap/wallet-paradex": minor
"@layerswap/wallets": minor
---

Support wagmi ^2.14.11 and core ^2.16.4 peers. Raise the viem peer floor to
^2.38.0 because newer wagmi core imports actions absent from older viem 2.x.
Keep workspace build versions pinned. Align the workspace's use-sync-external-store
resolution to wagmi 2.x's 1.4.0 dependency so pnpm does not split the same core
version into separate peer-context instances. Reject replacing an already active EVM
config instead of leaving the widget and host on different configs.

The React loader requires a separate release (it is ignored by Changesets).
Its new /wagmi entry point shares the host wagmi/core/viem/React Query modules
as strict, already-loaded singletons. Existing wagmiConfig integrations must
switch their component imports to that entry point.
