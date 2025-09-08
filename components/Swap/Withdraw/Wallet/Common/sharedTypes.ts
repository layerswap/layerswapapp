import { SwapBasicData } from "@/lib/apiClients/layerSwapApiClient";

export type ActionData = {
    error: Error | null;
    isError: boolean;
    isPending: boolean;
}

export type WithdrawPageProps = {
    swapId: string | undefined
    swapBasicData: SwapBasicData
    refuel: boolean
    savedTransactionHash?: string
    handleClearAmount?: () => void
}

export type TransferProps = {
    callData?: string
    depositAddress?: string
    amount?: number
    swapId?: string
    userDestinationAddress?: string
    sequenceNumber?: number
    handleClearAmount?: () => void
}