import { SwapBasicData } from "@/lib/apiClients/layerSwapApiClient";
import { Wallet } from "@/lib/wallets/types/wallet";
import { TokenBalance } from "@/Models/Balance";
import { Network, Token } from "@/Models/Network";

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
}

export type TransferProps = {
    network: Network,
    token: Token,
    callData: string
    depositAddress?: string
    amount: number
    swapId?: string
    userDestinationAddress?: string
    sequenceNumber?: number;
    selectedWallet: Wallet
    balances?: TokenBalance[] | undefined | null
}