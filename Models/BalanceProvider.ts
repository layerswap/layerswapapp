import posthog from "posthog-js";
import { BalanceFetchError, TokenBalance } from "./Balance";
import { Network, NetworkWithTokens, Token } from "./Network";

export abstract class BalanceProvider {
    abstract supportsNetwork: (network: NetworkWithTokens) => boolean
    abstract fetchBalance: (address: string, network: NetworkWithTokens, options?: { timeoutMs?: number, retryCount?: number }) => Promise<TokenBalance[] | null | undefined>
    protected resolveTokenBalanceFetchError = (err: BalanceFetchError, token: Token, network: Network, isNativeCurrency?: boolean) => {
        posthog.capture("balance_fetch_error", {
            where: "BalanceProvider",
            severity: "warn",
            network: network.name,
            token: token.symbol ?? undefined,
            message: err.message || `Could not fetch balance for ${token.symbol} in ${network.name}`,
            code: err.code,
            cause: err.cause,
        });

        const tokenBalance: TokenBalance =  {
            network: network.name,
            token: token.symbol,
            amount: undefined,
            request_time: new Date().toJSON(),
            decimals: Number(token?.decimals),
            isNativeCurrency: isNativeCurrency ?? !token.contract,
            error: `Could not fetch balance for ${token.symbol}`
        }

        return tokenBalance
    }
}
