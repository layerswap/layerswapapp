import posthog from "posthog-js";
import { TokenBalance } from "./Balance";
import { Network, NetworkWithTokens, Token } from "./Network";

export abstract class BalanceProvider {
    abstract supportsNetwork: (network: NetworkWithTokens) => boolean
    abstract fetchBalance: (address: string, network: NetworkWithTokens, options?: { timeoutMs?: number, retryCount?: number }) => Promise<TokenBalance[] | null | undefined>
    protected resolveTokenBalanceFetchError = (err: Error, token: Token, network: Network, isNativeCurrency?: boolean) => {
        const errorMessage = `${err.message || err}`
        console.error("balance_fetch_error", network.name, err)
        const tokenBalance: TokenBalance = {
            network: network.name,
            token: token.symbol,
            amount: undefined,
            request_time: new Date().toJSON(),
            decimals: Number(token?.decimals),
            isNativeCurrency: isNativeCurrency ?? !token.contract,
            error: errorMessage
        }

        return tokenBalance
    }
}
