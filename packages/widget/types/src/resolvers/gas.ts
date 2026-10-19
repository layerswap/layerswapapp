import { GasProps } from "./balanceModels"
import { Network, Token } from "../types"

export interface GasProvider {
    supportsNetwork(network: Network): boolean,
    getGas(args: GasProps): Promise<GasWithToken | undefined>
}

export type GasWithToken = {
    gas: number,
    token: Token
    /** Native amount that must stay in the account after the transfer and fee (e.g. Solana's rent-exempt minimum). Not part of the fee. */
    reserve?: number
}
