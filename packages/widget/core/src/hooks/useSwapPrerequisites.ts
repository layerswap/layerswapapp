import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { prerequisitesReady, SwapPrerequisiteError, swapPrerequisiteKey, type ResolvedSwapPrerequisite } from '@layerswap/wallet-core'
import type { SwapPrerequisiteContext } from '@layerswap/widget-types'
import { useSwapPrerequisiteResolver } from '../context/swapPrerequisites'

const cacheKey = (resolver: ReturnType<typeof useSwapPrerequisiteResolver>, context: SwapPrerequisiteContext) =>
    ['swap-prerequisites', resolver, swapPrerequisiteKey(context)] as const

/** Fresh action-time validation, also publishing failures to the normal prerequisite UI. */
export function useCheckSwapPrerequisites() {
    const resolver = useSwapPrerequisiteResolver()
    const { mutate } = useSWRConfig()
    const mounted = useRef(true)
    useEffect(() => {
        mounted.current = true
        return () => { mounted.current = false }
    }, [])
    return useCallback(async (context: SwapPrerequisiteContext | undefined) => {
        const assertActive = () => {
            if (!mounted.current) throw new Error('The transfer was cancelled.')
        }
        assertActive()
        if (!context || !resolver.supports(context)) return
        const entries = await resolver.check(context)
        assertActive()
        await mutate(cacheKey(resolver, context), entries, { revalidate: false })
        assertActive()
        if (!prerequisitesReady(entries)) {
            // A newly created quote may have a different cache key from the visible form.
            // Recheck mounted consumers so action-time failures always surface as setup UI.
            await mutate(key => Array.isArray(key) && key[0] === 'swap-prerequisites' && key[1] === resolver)
            throw new SwapPrerequisiteError(entries)
        }
    }, [resolver, mutate])
}

export function useSwapPrerequisites(context: SwapPrerequisiteContext | undefined, enabled = true) {
    const resolver = useSwapPrerequisiteResolver()
    const applicable = !!context && resolver.supports(context)
    const contextKey = context && applicable ? swapPrerequisiteKey(context) : undefined
    const verification = useMemo(() => ({ resolver, contextKey, enabled }), [resolver, contextKey, enabled])
    const [verified, setVerified] = useState<typeof verification>()
    const key = enabled && applicable && context ? cacheKey(resolver, context) : null
    const { data, isValidating, mutate } = useSWR<ResolvedSwapPrerequisite[]>(
        key,
        () => resolver.check(context!),
        {
            refreshInterval: entries => entries && prerequisitesReady(entries) ? 0 : 5000,
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            refreshWhenHidden: false,
            keepPreviousData: false,
            revalidateOnMount: false,
            dedupingInterval: 1000,
        },
    )
    // Cached success must not expose payment instructions before this mounted flow checks it.
    useEffect(() => {
        if (!verification.enabled || !verification.contextKey) return
        let current = true
        void mutate().then(() => {
            if (current) setVerified(verification)
        })
        return () => { current = false }
    }, [verification, mutate])
    const isVerified = verified === verification
    const isReady = !enabled || !applicable || isVerified && !!data && prerequisitesReady(data)
    return {
        context,
        applicable: enabled && applicable,
        entries: isVerified ? data : undefined,
        isReady,
        blockingMessage: isReady ? undefined : !isVerified || !data
            ? 'Checking account setup…'
            : data.find(entry => entry.result.status !== 'ready')?.result.title ?? 'Account setup required',
        isChecking: !isVerified || isValidating,
        refresh: () => mutate(),
    }
}
