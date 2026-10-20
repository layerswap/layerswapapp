---
'@layerswap/wallet-evm': minor
---

Use MetaMask Connect EVM 2.1.1 for the default MetaMask connection through a
Wagmi 2 connector built on the SDK's public lifecycle and EIP-1193 APIs.
Wagmi, Viem, React-loader peer requirements, and CDN sharing rules are unchanged.
Host applications do not need a dependency upgrade.

Declare the adapter's existing `@wagmi/core` and `@wagmi/connectors` imports as
peer dependencies, with development dependencies for local builds and tests.
Package consumers supply these alongside Wagmi and Viem so the adapter can use
the host's compatible installation.

The SDK selects approved mobile chains within its multichain session and routes
signing and transaction requests to the selected chain. Its provider also
updates after a successful extension switch without needing a separate wallet
notification. Layerswap still verifies chain/account readiness and preserves
rejection, cancellation, and timeout handling before sending or signing.

External Wagmi configs and their connectors remain host-owned. This migration
does not replace their MetaMask sessions. Default legacy mobile sessions may
require a fresh connection after deployment; new sessions restore through
MetaMask Connect. The old SDK can still appear transitively through Wagmi 2's
connector package, but Layerswap's default MetaMask connector no longer uses it.
