type QueryParams = Record<string, string | string[] | undefined>

export type SwapForRedirect = {
    transactions?: unknown[]
    use_deposit_address: boolean
    source_exchange?: unknown
    requested_amount: number | string
    source_network: { name: string }
    destination_network: { name: string }
    source_token: { symbol: string }
    destination_token: { symbol: string }
}

export type SwapPageRedirect = { destination: string, permanent: false }

function awaitsManualDeposit(swap: SwapForRedirect, query: QueryParams): boolean {
    return swap.use_deposit_address
        && !swap.source_exchange
        && Number(swap.requested_amount) > 0
        && query.defaultTab !== 'deposit'
}

export function resolveSwapPageRedirect({ swap, query, persistentParams, formattedAmount }: {
    swap: SwapForRedirect | undefined
    query: QueryParams
    persistentParams: QueryParams | null
    formattedAmount: string
}): SwapPageRedirect | null {
    if (!swap || swap.transactions?.length !== 0 || awaitsManualDeposit(swap, query)) return null

    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(persistentParams ?? {})) {
        for (const item of Array.isArray(value) ? value : [value]) {
            if (item) params.append(key, item)
        }
    }
    params.set('from', swap.source_network.name)
    params.set('to', swap.destination_network.name)
    params.set('fromAsset', swap.source_token.symbol)
    params.set('toAsset', swap.destination_token.symbol)
    params.set('amount', formattedAmount)

    return { destination: `/?${params.toString()}`, permanent: false }
}
