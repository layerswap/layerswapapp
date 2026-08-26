import { TokenBalance } from "./balanceModels";
import { Network, NetworkWithTokens, Token } from "../types";
import { ErrorHandler } from "../errorHandler";
import { extractErrorDetails } from "./errorUtils";
import { classifyNodeError } from "./nodeErrorClassifier";

export abstract class BalanceProvider {
    abstract supportsNetwork: (network: NetworkWithTokens) => boolean
    abstract fetchBalance: (address: string, network: NetworkWithTokens, options?: { timeoutMs?: number, retryCount?: number }) => Promise<TokenBalance[] | null | undefined>
    protected resolveTokenBalanceFetchError = (err: Error, token: Token, network: Network, isNativeCurrency?: boolean) => {
        ErrorHandler({
            type: 'BalanceProviderError',
            message: err.message,
            name: err.name,
            stack: err.stack,
            cause: err
        });

        const errorDetails = extractErrorDetails(err);
        const category = classifyNodeError(err);
        
        const tokenBalance: TokenBalance = {
            network: network.name,
            token: token.symbol,
            amount: undefined,
            request_time: new Date().toJSON(),
            decimals: Number(token?.decimals),
            isNativeCurrency: isNativeCurrency ?? !token.contract,
            error: {
                message: errorDetails.message,
                name: errorDetails.name,
                stack: errorDetails.stack,
                code: errorDetails.code,
                status: errorDetails.status,
                statusText: errorDetails.statusText,
                responseData: errorDetails.responseData,
                requestUrl: errorDetails.requestUrl,
                category: category
            }
        }

        return tokenBalance
    }
}
