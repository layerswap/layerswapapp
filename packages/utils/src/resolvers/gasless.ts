import type { Network } from "@/types";
import type { Wallet } from "./walletModels";

export type GaslessSignParams = {
    network: Network
    address: string
    typedData: unknown
    wallet?: Wallet
}

export interface GaslessProvider {
    supportsNetwork(network: Network): boolean
    signGaslessDeposit(params: GaslessSignParams): Promise<string>
}
