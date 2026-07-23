import { Network } from "@/Models/Network"
import { Wallet } from "./wallet"

export type GaslessSignParams = {
    network: Network
    address: string
    typedData: unknown
    wallet?: Wallet
}

/** A chain-specific signer for gasless (sign-to-deposit) authorizations. Mirrors
 *  {@link TransferProvider}: each chain registers one via WalletProvider.gaslessProvider,
 *  and {@link GaslessResolver} picks the right one by network. */
export interface GaslessProvider {
    supportsNetwork(network: Network): boolean
    signGaslessDeposit(params: GaslessSignParams): Promise<string>
}
