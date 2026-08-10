import { type Wallet } from '@layerswap/widget-types';
import type { Network } from "@/types";

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
