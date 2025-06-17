import { Network, Token } from "@/Models/Network";

export type ActionData = {
    error: Error | null;
    isError: boolean;
    isPending: boolean;
}

export type BaseTransferButtonProps = {
    swapId?: string,
    sequenceNumber?: string,
    depositAddress?: `0x${string}`,
    userDestinationAddress: `0x${string}`,
    amount?: number,
    savedTransactionHash: `0x${string}`,
    chainId: number
}

export type WithdrawPageProps = {
    depositAddress?: string
    amount?: number
    swapId?: string
    userDestinationAddress?: string
    sequenceNumber?: number
    network?: Network
    token?: Token
    callData?: string
}