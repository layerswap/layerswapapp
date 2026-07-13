import { useEffect, useMemo } from "react"
import { WalletProvider } from "@/types"
import { setExtendedRouteProviders } from "@/lib/extendedRoutes/registry"

/**
 * Collects the extended route providers contributed by `walletProviders` and
 * injects them into the extended-routes registry, mirroring how balance/gas
 * providers flow from `WalletProvider` into their resolvers.
 */
export function useRegisterExtendedRouteProviders(walletProviders: WalletProvider[]): void {
    const extendedRouteProviders = useMemo(
        () => walletProviders.flatMap(p => p.extendedRouteProvider ?? []).filter(Boolean),
        [walletProviders],
    )

    useEffect(() => {
        if (extendedRouteProviders.length > 0) {
            setExtendedRouteProviders(extendedRouteProviders)
        }
    }, [extendedRouteProviders])
}
