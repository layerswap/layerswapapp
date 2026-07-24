import type { Network } from "@layerswap/utils";
import type { Wallet } from "./wallet";

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
