// Side store for sharing the wagmi `Config` instance across packages —
// specifically so Paradex (which needs `getWalletClient(config)` etc.
// from @wagmi/core) can run *outside* WagmiProvider. The EVM registrar
// publishes the config here from a useEffect once it's mounted inside
// WagmiProvider; downstream consumers read at imperative call time.
//
// Living in a plain TS module (no React, no Zustand) keeps the file
// trivial and avoids pulling any heavy deps into the static surface of
// @layerswap/wallet-evm. Both wallet-evm and wallet-paradex resolve to
// this single module instance via the workspace dependency graph, so
// there is one shared `currentConfig` across the app.
import type { Config } from 'wagmi'

let currentConfig: Config | null = null
const listeners = new Set<() => void>()

export function setEVMWagmiConfig(config: Config | null): void {
    if (currentConfig === config) return
    currentConfig = config
    listeners.forEach((listener) => listener())
}

export function getEVMWagmiConfig(): Config | null {
    return currentConfig
}

export function subscribeEVMWagmiConfig(listener: () => void): () => void {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}
