import posthog from "posthog-js";
import { NetworkBalance, TokenBalance } from "@/Models/Balance";
import { BalanceProvider } from "@/Models/BalanceProvider";
import { NetworkWithTokens } from "@/Models/Network";
import { classifyNodeError } from "./nodeErrorClassifier";
import {
    BitcoinBalanceProvider,
    EVMBalanceProvider,
    FuelBalanceProvider,
    ImmutableXBalanceProvider,
    LoopringBalanceProvider,
    ParadexBalanceProvider,
    QueryBalanceProvider,
    SolanaBalanceProvider,
    StarknetBalanceProvider,
    TonBalanceProvider,
    TronBalanceProvider,
    ZkSyncBalanceProvider,
    HyperliquidBalanceProvider
} from "./providers";

type ErrorDetails = {
    message: string;
    name?: string;
    stack?: string;
    status?: number;
    statusText?: string;
    responseData?: unknown;
    requestUrl?: string;
    code?: string;
}

function extractErrorDetails(error: unknown): ErrorDetails {
    const err = error as Error & {
        response?: { status?: number; statusText?: string; data?: unknown };
        request?: { url?: string };
        code?: string;
        cause?: unknown;
    };

    return {
        message: err?.message || String(error),
        name: err?.name,
        stack: err?.stack,
        status: err?.response?.status,
        statusText: err?.response?.statusText,
        responseData: err?.response?.data,
        requestUrl: err?.request?.url,
        code: err?.code,
    };
}

function formatErrorBalances(errorBalances: TokenBalance[]) {
    return errorBalances.map(b => ({
        token: b.token,
        error: b.error,
        error_category: classifyNodeError(b.error),
    }));
}

export class BalanceResolver {

    private providers: BalanceProvider[] = [
        new QueryBalanceProvider(),
        new StarknetBalanceProvider(),
        new EVMBalanceProvider(),
        new FuelBalanceProvider(),
        new ImmutableXBalanceProvider(),
        new LoopringBalanceProvider(),
        new SolanaBalanceProvider(),
        new TonBalanceProvider(),
        new ZkSyncBalanceProvider(),
        new TronBalanceProvider(),
        new ParadexBalanceProvider(),
        new BitcoinBalanceProvider(),
        new HyperliquidBalanceProvider()
    ];

    async getBalance(network: NetworkWithTokens, address?: string, options?: { timeoutMs?: number, retryCount?: number }): Promise<NetworkBalance> {
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
                balanceError.name = "BalanceError";
                posthog.captureException(balanceError, {
                    $layerswap_exception_type: "Balance Error",
                    network: network.name,
                    node_url: network.node_url,
                    address: address,
                    failed_tokens: formatErrorBalances(errorBalances),
                    error_categories: [...new Set(errorBalances.map(b => classifyNodeError(b.error)))],
                });
            }

            return { balances };
        }
        catch (e) {
            const errorDetails = extractErrorDetails(e);
            const error = new Error(errorDetails.message);
            error.name = "BalanceError";
            error.cause = e;
            posthog.captureException(error, {
                $layerswap_exception_type: "Balance Error",
                network: network.name,
                node_url: network.node_url,
                address: address,
                error_category: classifyNodeError(e),
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
