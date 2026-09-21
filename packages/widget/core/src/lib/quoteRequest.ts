export type QuoteUrlArgs = {
    sourceNetwork: string
    sourceToken: string
    destinationNetwork: string
    destinationToken: string
    amount: string | number
    refuel: boolean
    useDepositAddress: boolean
    slippage?: number
    minReceiveAmount?: string
    useGasless?: boolean
    destinationAddress?: string
    sourceAddress?: string
}

export function buildQuoteUrl(args: QuoteUrlArgs): string {
    const {
        sourceNetwork,
        sourceToken,
        destinationNetwork,
        destinationToken,
        amount,
        refuel,
        useDepositAddress,
        slippage,
        minReceiveAmount,
        useGasless,
        destinationAddress,
        sourceAddress,
    } = args

    const params = new URLSearchParams({
        source_network: sourceNetwork,
        source_token: sourceToken,
        destination_network: destinationNetwork,
        destination_token: destinationToken,
        amount: String(amount),
        refuel: String(!!refuel),
        use_deposit_address: useDepositAddress ? 'true' : 'false',
    })

    if (minReceiveAmount !== undefined) {
        params.append('min_receive_amount', minReceiveAmount)
    } else if (slippage !== undefined) {
        params.append('slippage', String(slippage))
    }

    if (useGasless) {
        params.append('use_gasless', 'true')
    }

    if (destinationAddress) {
        params.append('destination_address', destinationAddress)
    }

    if (sourceAddress) {
        params.append('source_address', sourceAddress)
    }

    return `/quote?${params.toString()}`
}
