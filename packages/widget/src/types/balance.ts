import { TokenBalance } from "@/Models/Balance";
import { Network, NetworkWithTokens, Token } from "@/Models/Network";
import { log } from "@/context/ErrorProvider";

export abstract class BalanceProvider {
    abstract supportsNetwork: (network: NetworkWithTokens) => boolean
    abstract fetchBalance: (address: string, network: NetworkWithTokens, options?: { timeoutMs?: number, retryCount?: number }) => Promise<TokenBalance[] | null | undefined>
    protected resolveTokenBalanceFetchError = (err: Error, token: Token, network: Network, isNativeCurrency?: boolean) => {
        const errorMessage = `${err.message || err}`

        log({
            type: 'BalanceProviderError',
            props: {
                where: "BalanceProvider",
                network: network.name,
                $exception_type: "Balance Fetch Error",
                token: token.symbol ?? undefined,
                message: `Could not fetch balance for ${token.symbol} in ${network.name}, err: ${errorMessage}`,
                cause: (err as any)?.cause,
                timeoutError:
                    errorMessage.toLowerCase().includes("timeout") ||
                    errorMessage.toLowerCase().includes("took too long"),
            },
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
