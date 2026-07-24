import { GasProps } from "./balanceModels"
import { Network, Token } from "@layerswap/utils"

export interface GasProvider {
    supportsNetwork(network: Network): boolean,
    getGas(args: GasProps): Promise<GasWithToken | undefined>
}

export type GasWithToken = {
    gas: number,
    token: Token
}