import { Network, Token } from "@/Models/Network";

export type ActionData = {
    error: Error | null;
    isError: boolean;
    isPending: boolean;
}

export type WithdrawPageProps = {
    network?: Network
    token?: Token
    swapId?: string
    savedTransactionHash?: string
}

export type TransferProps = {
    callData?: string
    depositAddress?: string
    amount?: number
    swapId?: string
    userDestinationAddress?: string
    sequenceNumber?: number
}