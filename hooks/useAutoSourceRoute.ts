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

        // Lower source_rank = higher priority. Use ?? so rank 0 (the best possible value)
        // isn't coerced to the sentinel like `|| Infinity` would do.
        const rank = (r: { source_rank?: number }) => r.source_rank ?? Number.POSITIVE_INFINITY

        const sorted = [...sourceRoutes].sort((a, b) => rank(a) - rank(b))

        for (const route of sorted) {
            const activeToken = route.tokens
                ?.filter(t => t.status === 'active')
                .sort((a, b) => rank(a) - rank(b))[0]
            if (activeToken) {
                setFieldValue('from', route, true)
                setFieldValue('fromAsset', activeToken, true)
                return
            }
        }
    }, [sourceRoutes])

    return { sourceRoutes, isLoading }
}
