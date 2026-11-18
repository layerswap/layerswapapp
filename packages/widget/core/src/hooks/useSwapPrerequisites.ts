import { useCallback } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { firstBlockingPrerequisite, prerequisitesReady, swapPrerequisiteKey, type ResolvedSwapPrerequisite } from '@layerswap/wallet-core'
import type { SwapPrerequisiteContext } from '@layerswap/widget-types'
import { useSwapPrerequisiteResolver } from '../context/swapPrerequisites'

const REFRESH_INTERVAL_MS = 5_000
const DEDUPING_INTERVAL_MS = 1_000

const cacheKey = (resolver: ReturnType<typeof useSwapPrerequisiteResolver>, context: SwapPrerequisiteContext) =>
    ['swap-prerequisites', resolver, swapPrerequisiteKey(context)] as const

/** Fresh check before creating a swap; rejects with the provider's message when not ready. */
export function useCheckSwapPrerequisites() {
    const resolver = useSwapPrerequisiteResolver()
    const { mutate } = useSWRConfig()
    return useCallback(async (context: SwapPrerequisiteContext | undefined) => {
        if (!context || !resolver.supports(context)) return
        const entries = await resolver.check(context)
        if (prerequisitesReady(entries)) return
        void mutate(cacheKey(resolver, { destination: context.destination }))
        const blocking = firstBlockingPrerequisite(entries)
        throw new Error(blocking?.description ?? blocking?.title ?? 'Account setup is required before continuing.')
    }, [resolver, mutate])
}

export function useSwapPrerequisites(context: SwapPrerequisiteContext | undefined, enabled = true) {
    const resolver = useSwapPrerequisiteResolver()
    const supported = !!context && resolver.supports(context)
    const applicable = enabled && supported
    const { data, isValidating, mutate } = useSWR<ResolvedSwapPrerequisite[]>(
        applicable && context ? cacheKey(resolver, context) : null,
        () => resolver.check(context!),
        {
            refreshInterval: entries => entries && prerequisitesReady(entries) ? 0 : REFRESH_INTERVAL_MS,
            revalidateOnFocus: true,
            dedupingInterval: DEDUPING_INTERVAL_MS,
        },
    )
    const isReady = !applicable || (!!data && prerequisitesReady(data))
    return {
        context,
        supported,
        applicable,
        entries: data,
        isReady,
        blockingMessage: isReady ? undefined : data
            ? firstBlockingPrerequisite(data)?.title ?? 'Account setup required'
            : 'Checking account setup…',
        isChecking: isValidating,
        refresh: () => mutate(),
    }
}
