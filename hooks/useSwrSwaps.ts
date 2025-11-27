import useSWRInfinite from 'swr/infinite'
import { useEffect } from 'react'
import LayerSwapApiClient, { SwapResponse } from '../lib/apiClients/layerSwapApiClient'
import { ApiResponse, EmptyApiResponse } from '../Models/ApiResponse'

const PAGE_SIZE = 20

export type UseSwrSwapsArgs = {
    statuses: string[]
    addresses?: string[]
    refreshInterval: number | ((data?: ApiResponse<SwapResponse[]>[] | undefined) => number)
    autoLoadAllInitially?: boolean
    revalidateAll?: boolean
    revalidateFirstPage?: boolean
}

const getSwapsKey = (index: number, statuses: string[], addresses?: string[]) => {
    const addressesParams = addresses?.map(a => `&addresses=${a}`).join('') || ''
    const statusesParams = statuses.map(s => `&statuses=${s}`).join('') || ''
    return `/swaps?page=${index + 1}${statusesParams}${addressesParams}`
}

export function useSwrSwaps({ statuses, addresses, refreshInterval, autoLoadAllInitially, revalidateAll, revalidateFirstPage }: UseSwrSwapsArgs) {
    const apiClient = new LayerSwapApiClient()

    const getKey = (pageIndex: number, previous: ApiResponse<SwapResponse[]> | EmptyApiResponse | null) => {
        if (previous instanceof EmptyApiResponse) return null
        if (previous && 'data' in (previous as any) && !((previous as ApiResponse<SwapResponse[]>)?.data?.length)) return null
        return getSwapsKey(pageIndex, statuses, addresses)
    }

    const { data, size, setSize, isLoading, isValidating, mutate, error } =
        useSWRInfinite<ApiResponse<SwapResponse[]>>(getKey, apiClient.fetcher, {
            revalidateAll,
            revalidateFirstPage,
            dedupingInterval: 3000,
            refreshInterval,
        })

    const pages = data ?? []
    const swaps: SwapResponse[] = pages.flatMap(p => ((p?.data ?? []) as SwapResponse[]))
    const isEmpty = !isLoading && swaps.length === 0
    const hasMore = !(isEmpty || (pages.length && ((pages[pages.length - 1]?.data?.length ?? 0) < PAGE_SIZE)))

    // Auto-load all pages on initial mount for small datasets (like in-progress)
    useEffect(() => {
        if (!autoLoadAllInitially) return
        if (!pages.length) return
        const lastPageLen = (pages[pages.length - 1]?.data?.length ?? 0)
        if (lastPageLen === PAGE_SIZE && !isValidating) {
            setSize(size + 1)
        }
    }, [autoLoadAllInitially, pages, isValidating, setSize, size])

    return {
        pages,
        swaps,
        size,
        setSize,
        loadMore: () => setSize(size + 1),
        isLoading,
        isValidating,
        hasMore,
        error,
        mutate,
    }
}


