/** Shared cache entry for an amount estimate without transaction calldata. */
export function amountGasKey(address: string | null | undefined, network: string | undefined, token: string | undefined, amount: number | undefined): string {
    return `/gases/${address}/${network}/${token}/${amount}`
}
