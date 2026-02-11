import { NetworkBalance, TokenBalance } from "@/Models/Balance";
import { BalanceProvider } from "@/types/balance";
import { NetworkWithTokens } from "@/Models/Network";
import { ErrorHandler } from "@/lib/ErrorHandler";
import { classifyNodeError } from "./nodeErrorClassifier";
import { extractErrorDetails } from "./errorUtils";
import KnownInternalNames from "../knownIds";

const SKIP_BALANCE_NETWORKS = [
    KnownInternalNames.Networks.ParadexMainnet,
    KnownInternalNames.Networks.ParadexTestnet,
];

function formatErrorBalances(errorBalances: TokenBalance[]) {
    return errorBalances.map(b => ({
        token: b.token,
        error_message: b.error?.message,
        error_name: b.error?.name,
        error_code: b.error?.code,
        error_category: b.error?.category,
        response_status: b.error?.status,
        response_status_text: b.error?.statusText,
        request_url: b.error?.requestUrl,
        // Include first 500 chars of stack trace for debugging
        error_stack: b.error?.stack?.substring(0, 500),
        // Include response data if available (truncated for size)
        response_data: b.error?.responseData
            ? JSON.stringify(b.error.responseData).substring(0, 1000)
            : undefined
    }));
}

export class BalanceResolver {

    private providers: BalanceProvider[];

    constructor(providers?: BalanceProvider[]) {
        this.providers = providers || []
    }

    async getBalance(network: NetworkWithTokens, address?: string, options?: { timeoutMs?: number, retryCount?: number }): Promise<NetworkBalance> {
        if (SKIP_BALANCE_NETWORKS.includes(network.name)) {
            return { balances: [] }
        }

        try {
            if (!address)
                throw new Error(`No address provided for network ${network.name}`)
            const provider = this.providers.find(p => p.supportsNetwork(network))
            //TODO: create interface for balance providers in case of empty state they shoudl throw error 
            //never return undefined as SWR does not set loading state if undefined is returned
            if (!provider) throw new Error(`No balance provider found for network ${network.name}`)
            const balances = await provider.fetchBalance(address, network, { timeoutMs: options?.timeoutMs, retryCount: options?.retryCount })

            const errorBalances = balances?.filter(b => b.error)
            if (errorBalances?.length) {
                const balanceError = new Error(`Could not fetch balance for ${errorBalances.map(t => t.token).join(", ")} in ${network.name}`);

                ErrorHandler({
                    type: 'BalanceResolverError',
                    name: balanceError.name,
                    stack: balanceError.stack,
                    cause: balanceError.cause,
                    message: balanceError.message,
                    network: network.name,
                    node_url: network.node_url,
                    nodes: network.nodes,
                    address: address,
                    error_categories: [...new Set(errorBalances.map(b => classifyNodeError(b.error)))],
                    error_codes: [...new Set(errorBalances.map(b => b.error?.code).filter(Boolean))],
                    http_statuses: [...new Set(errorBalances.map(b => b.error?.status).filter(Boolean))],
                    failed_tokens: formatErrorBalances(errorBalances),
                });

            }

            return { balances };
        }
        catch (e) {
            const errorDetails = extractErrorDetails(e);
            const errorCategory = classifyNodeError(e);
            const error = new Error(errorDetails.message);
            error.name = "BalanceError";
            error.cause = e;
            ErrorHandler({
                type: 'BalanceResolverError',
                message: error.message,
                name: error.name,
                stack: error.stack,
                cause: error.cause,
                network: network.name,
                node_url: network.node_url,
                nodes: network.nodes,
                address: address,
                error_category: errorCategory,
                error_code: errorDetails.code,
                response_status: errorDetails.status,
                response_status_text: errorDetails.statusText,
                response_data: errorDetails.responseData,
                request_url: errorDetails.requestUrl,
            });
            return { balances: [] }
        }
    }
}
