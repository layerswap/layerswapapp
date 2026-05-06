import { useEffect } from 'react'
import { useFormikContext } from 'formik'
import { SwapFormValues } from '@/components/DTOs/SwapFormValues'
import useDepositAddressSources from './useDepositAddressSources'

/**
 * Auto-selects a source network and token for the deposit address flow.
 * Fetches available sources for the selected destination and picks the first active one.
 */
export default function useAutoSourceRoute() {
    const { values, setFieldValue } = useFormikContext<SwapFormValues>()
    const { to, toAsset } = values

    const { data, isLoading } = useDepositAddressSources({
        destinationNetwork: to?.name,
        destinationToken: toAsset?.symbol,
    })

    const sourceRoutes = data?.data?.filter(r => r.deposit_methods?.includes('deposit_address'))

    useEffect(() => {
        if (!sourceRoutes || sourceRoutes.length === 0) return

        const currentFrom = values.from
        const currentFromAsset = values.fromAsset

        // If current source is still valid for this destination, keep it
        if (currentFrom && currentFromAsset) {
            const stillValid = sourceRoutes.some(
                r => r.name === currentFrom.name && r.tokens?.some(t => t.symbol === currentFromAsset.symbol && t.status === 'active')
            )
            if (stillValid) return
        }

        // Sort by source_rank (lower = higher priority), then pick the first with an active token
        const sorted = [...sourceRoutes].sort((a, b) => {
            const aRank = a.source_rank || 999999
            const bRank = b.source_rank || 999999
            return aRank - bRank
        })

        for (const route of sorted) {
            const activeToken = route.tokens
                ?.filter(t => t.status === 'active')
                .sort((a, b) => (a.source_rank || 999999) - (b.source_rank || 999999))[0]
            if (activeToken) {
                setFieldValue('from', route, true)
                setFieldValue('fromAsset', activeToken, true)
                return
            }
        }
    }, [sourceRoutes])

    return { sourceRoutes, isLoading }
}
