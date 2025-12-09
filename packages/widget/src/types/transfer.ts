import { Network, Token } from "@/Models/Network"
import { TokenBalance } from "@/Models/Balance"
import { Wallet } from "./wallet"

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

export interface TransferProvider {
    supportsNetwork(network: Network): boolean
    executeTransfer(params: TransferProps, wallet?: Wallet): Promise<string>
}

// Hook-based transfer provider factory
export type TransferProviderHook = () => TransferProvider