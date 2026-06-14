import { useEffect, useMemo } from 'react'
import { useFormikContext } from 'formik'
import useDepositAddressSources from './useDepositAddressSources'
import { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues'
import { NetworkRoute, NetworkRouteToken } from '@/Models/Network'

/**
 * Picks the top-ranked source route + active token for the deposit-address
 * flow. Shared between the form's auto-source effect and the deposit widget's
 * prefetcher so both always agree on the same pick.
 */
export function pickAutoSource(sourceRoutes: NetworkRoute[] | undefined): { network: NetworkRoute, token: NetworkRouteToken } | undefined {
    if (!sourceRoutes || sourceRoutes.length === 0) return undefined

    // Lower source_rank = higher priority. Use ?? so rank 0 (the best possible value)
    // isn't coerced to the sentinel like `|| Infinity` would do.
    const rank = (r: { source_rank?: number }) => r.source_rank ?? Number.POSITIVE_INFINITY

    const sorted = [...sourceRoutes].sort((a, b) => rank(a) - rank(b))

    for (const route of sorted) {
        const activeToken = route.tokens
            ?.filter(t => t.status === 'active')
            .sort((a, b) => rank(a) - rank(b))[0]
        if (activeToken) return { network: route, token: activeToken }
    }
    return undefined
}

/**
 * Auto-selects a source network and token for the deposit address flow.
 * Fetches available sources for the selected destination and picks the first active one.
 */
export default function useAutoSourceRoute() {
    const { values, setFieldValue } = useFormikContext<SwapFormValues>()
    const { to, toAsset, from, fromAsset } = values

    const hasDestination = !!(to?.name && toAsset?.symbol)

    const { data, isLoading } = useDepositAddressSources({
        destinationNetwork: to?.name,
        destinationToken: toAsset?.symbol,
    })

    const sourceRoutes = data?.data?.filter(r => r.deposit_methods?.includes('deposit_address'))

    const isSourceInRoutes = useMemo(() => {
        if (!sourceRoutes || !from || !fromAsset) return false
        return sourceRoutes.some(
            r => r.name === from.name && r.tokens?.some(t => t.symbol === fromAsset.symbol && t.status === 'active')
        )
    }, [sourceRoutes, from?.name, fromAsset?.symbol])

    // True only when we have positive evidence that this hook is about to swap
    // `from`/`fromAsset` to a different value: either the SWR call for the current
    // destination is still in flight, or it has returned a non-empty source list
    // that doesn't contain the current selection. Callers (e.g. the deposit-address
    // auto-submit) gate on this so we don't briefly fire a doomed swap creation.
    //
    // Deliberately false when sources fetch failed or returned no sources — those
    // cases warrant a real server response (and error toast) rather than silent
    // blocking, since this hook will not be picking a new source.
    const isAutoSourceUpdating = (
        hasDestination && isLoading
    ) || (
        !!sourceRoutes && sourceRoutes.length > 0 && !isSourceInRoutes
    )

    useEffect(() => {
        if (!sourceRoutes || sourceRoutes.length === 0) return

        if (isSourceInRoutes) return

        const pick = pickAutoSource(sourceRoutes)
        if (pick) {
            setFieldValue('from', pick.network, true)
            setFieldValue('fromAsset', pick.token, true)
        }
    }, [sourceRoutes, isSourceInRoutes])

    return { sourceRoutes, isLoading, isAutoSourceUpdating }
}
