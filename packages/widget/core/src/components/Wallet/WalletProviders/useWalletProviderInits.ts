import { useEffect, useRef } from "react"
import type { WalletProvider, WalletWrapper } from "@layerswap/wallet-core/types"

type InitializedProvider = WalletProvider | WalletWrapper

function dispose(cleanup: (() => void) | undefined) {
    try {
        cleanup?.()
    } catch {
        // A failing provider cleanup must not block the others.
    }
}

/**
 * Runs each provider's `init` once per provider instance. Providers that stay
 * in the list keep their lifecycle while others are added or hydrated; removed
 * or replaced providers are disposed, and every provider is disposed on unmount.
 */
export function useWalletProviderInits(providers: InitializedProvider[], appName: string | undefined) {
    const cleanups = useRef(new Map<InitializedProvider, (() => void) | undefined>())

    useEffect(() => {
        const running = cleanups.current
        for (const [provider, cleanup] of running) {
            if (!providers.includes(provider)) {
                dispose(cleanup)
                running.delete(provider)
            }
        }
        for (const provider of providers) {
            const init = (provider as WalletWrapper).init
            if (running.has(provider) || typeof init !== 'function') {
                continue
            }
            const cleanup = init({ appName })
            running.set(provider, typeof cleanup === 'function' ? cleanup : undefined)
        }
        // appName is stable per LayerswapProvider mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [providers])

    useEffect(() => () => {
        for (const cleanup of cleanups.current.values()) {
            dispose(cleanup)
        }
        cleanups.current.clear()
    }, [])
}
