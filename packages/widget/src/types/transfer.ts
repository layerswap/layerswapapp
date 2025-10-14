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