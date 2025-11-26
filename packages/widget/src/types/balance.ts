import { TokenBalance } from "@/Models/Balance";
import { Network, NetworkWithTokens, Token } from "@/Models/Network";
import { ErrorHandler } from "@/lib/ErrorHandler";

export abstract class BalanceProvider {
    abstract supportsNetwork: (network: NetworkWithTokens) => boolean
    abstract fetchBalance: (address: string, network: NetworkWithTokens, options?: { timeoutMs?: number, retryCount?: number }) => Promise<TokenBalance[] | null | undefined>
    protected resolveTokenBalanceFetchError = (err: Error, token: Token, network: Network, isNativeCurrency?: boolean) => {
        const errorMessage = `${err.message || err}`

        ErrorHandler({
            type: 'BalanceProviderError',
            message: err.message,
            name: err.name,
            stack: err.stack,
            cause: err
        });

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
