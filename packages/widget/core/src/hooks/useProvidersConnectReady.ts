import { useEffect, useState } from "react"
import useWallet from "./useWallet"
import { useWalletProvidersReady } from "@/context/walletProviders"
import type { WalletConnectionProvider } from "@/types/wallet"

/**
 * Whether a provider is ready enough for its connect affordance to be enabled.
 *
 * Descriptor stubs count as ready: their SDK simply hasn't been requested yet,
 * and clicking connect is what triggers the load — gating on stub readiness
 * would deadlock (the disabled button could never open the modal that hydrates
 * the stub). Only live providers that are still initializing (e.g. wagmi
 * auto-reconnect in flight) report not-ready. `ready` is defensively treated
 * as true when a provider store never sets it.
 */
export function isProviderConnectReady(provider: WalletConnectionProvider | undefined): boolean {
    if (!provider) return true
    return provider.isStub === true || (typeof provider.ready === 'boolean' ? provider.ready : true)
}

// Upper bound on how long session-bearing stubs may hold the connect gate
// closed. Normally the stub is replaced by the real provider (whose own
// `ready` flag takes over) well within this; the deadline only matters when
// the SDK chunk fails to load — the loader absorbs the failure and nothing
// retries until the connect modal opens, so without a deadline the disabled
// button could never trigger that retry.
const SESSION_RESTORE_GRACE_MS = 10_000

/**
 * Connect-button gate: true once the wallet-provider registry has published
 * its entries AND every live (non-stub) provider has finished initializing.
 * The registry check matters because during the first commit `useWallet`
 * returns an empty provider list, which `every()` would treat as "all ready".
 *
 * Stubs whose descriptor found a persisted-session marker also hold the gate
 * closed (bounded by {@link SESSION_RESTORE_GRACE_MS}): they auto-hydrate
 * right after mount and a wallet is about to be restored, so counting them as
 * ready would flash the connect button enabled for the moment between
 * registry publish and hydration.
 */
export default function useProvidersConnectReady(): boolean {
    const registryReady = useWalletProvidersReady()
    const { providers } = useWallet()

    const awaitingSessionRestore = providers.some(p => p.isStub === true && p.pendingSessionRestore === true)
    const [graceExpired, setGraceExpired] = useState(false)
    useEffect(() => {
        if (!awaitingSessionRestore || graceExpired) return
        const timer = setTimeout(() => setGraceExpired(true), SESSION_RESTORE_GRACE_MS)
        return () => clearTimeout(timer)
    }, [awaitingSessionRestore, graceExpired])

    return registryReady
        && providers.every(isProviderConnectReady)
        && (!awaitingSessionRestore || graceExpired)
}
