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
    token: Token
    /** Native amount that must stay in the account after the transfer and fee due to chain/account rules (e.g. Solana rent or a Monad delegated-account reserve). Not part of the fee. */
    reserve?: number
}
