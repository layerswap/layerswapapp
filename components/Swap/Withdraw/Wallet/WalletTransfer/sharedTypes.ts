export type ActionData = {
    error: Error | null;
    isError: boolean;
    isPending: boolean;
}

export type BaseTransferButtonProps = {
    swapId: string,
    sequenceNumber: string,
    depositAddress?: `0x${string}`,
    userDestinationAddress: `0x${string}`,
    amount?: number,
    savedTransactionHash: `0x${string}`,
}