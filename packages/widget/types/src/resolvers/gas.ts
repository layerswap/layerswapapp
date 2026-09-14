import { GasProps } from "./balanceModels"
import { Network, Token } from "../types"

export interface GasProvider {
    supportsNetwork(network: Network): boolean,
    getGas(args: GasProps): Promise<GasWithToken | undefined>
}

export type GasWithToken = {
    /** Expected fee in the native fee token. */
    gas: number,
    /** Maximum fee reserved for affordability checks, when it differs from the expected fee. */
    maxFee?: number,
    /** Native-token balance that must remain after the transaction because of chain/account rules. */
    balanceReserve?: number,
    token: Token
}
