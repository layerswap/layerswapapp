import { TokenBalance } from "./Balance";
import { NetworkWithTokens } from "./Network";

export interface IBalanceProvider {
    supportsNetwork: (network: NetworkWithTokens) => boolean
    fetchBalance: (address: string, network: NetworkWithTokens) => Promise<TokenBalance[] | null | undefined>
}
