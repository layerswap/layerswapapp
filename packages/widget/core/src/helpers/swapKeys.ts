export const depositActionsKey = (swapId: string, sourceAddress?: string) =>
    `/swaps/${swapId}/deposit_actions${sourceAddress ? `?source_address=${encodeURIComponent(sourceAddress)}` : ''}`

export const authorizationKey = (swapId: string, quoteRevision?: number) =>
    [`/swaps/${swapId}/authorize`, quoteRevision] as const
