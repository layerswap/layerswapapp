import { type Wallet } from '../wallet';
import type { LayerswapNetwork } from "../types";

export type GaslessSignParams = {
    network: LayerswapNetwork
    address: string
    typedData: unknown
    wallet?: Wallet
}

export interface GaslessProvider {
    supportsNetwork(network: LayerswapNetwork): boolean
    signGaslessDeposit(params: GaslessSignParams): Promise<string>
}
