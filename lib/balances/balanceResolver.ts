import posthog from "posthog-js";
import { NetworkBalance, TokenBalance } from "@/Models/Balance";
import { BalanceProvider } from "@/Models/BalanceProvider";
import { NetworkType, NetworkWithTokens } from "@/Models/Network";
import { classifyNodeError } from "./nodeErrorClassifier";
import { extractErrorDetails } from "./errorUtils";
import KnownInternalNames from "../knownIds";
import { getExtendedProviderForNetwork } from "@/lib/extendedRoutes/registry";

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
    private providerInstances: Partial<Record<ProviderKind, BalanceProvider>> = {};
    private pendingLoads: Partial<Record<ProviderKind, Promise<BalanceProvider>>> = {};

    private async getProviderInstance(kind: ProviderKind): Promise<BalanceProvider> {
        if (this.providerInstances[kind]) {
            return this.providerInstances[kind]!;
        }

        if (this.pendingLoads[kind]) {
            return this.pendingLoads[kind]!;
        }

        const loadPromise = this.loadProvider(kind);
        this.pendingLoads[kind] = loadPromise;

        try {
            const provider = await loadPromise;
            this.providerInstances[kind] = provider;
            return provider;
        } finally {
            delete this.pendingLoads[kind];
        }
    }

    private async loadProvider(kind: ProviderKind): Promise<BalanceProvider> {
        switch (kind) {
            case "query": {
                const { QueryBalanceProvider } = await import("./providers/queryBalanceProvider");
                return new QueryBalanceProvider();
            }
            case "starknet": {
                const { StarknetBalanceProvider } = await import("./providers/starknetBalanceProvider");
                return new StarknetBalanceProvider();
            }
            case "evm": {
                const { EVMBalanceProvider } = await import("./providers/evmBalanceProvider");
                return new EVMBalanceProvider();
            }
            case "fuel": {
                const { FuelBalanceProvider } = await import("./providers/fuelBalanceProvider");
                return new FuelBalanceProvider();
            }
            case "solana": {
                const { SolanaBalanceProvider } = await import("./providers/solanaBalanceProvider");
                return new SolanaBalanceProvider();
            }
            case "ton": {
                const { TonBalanceProvider } = await import("./providers/tonBalanceProvider");
                return new TonBalanceProvider();
            }
            case "tron": {
                const { TronBalanceProvider } = await import("./providers/tronBalanceProvider");
                return new TronBalanceProvider();
            }
            case "bitcoin": {
                const { BitcoinBalanceProvider } = await import("./providers/bitcoinBalanceProvider");
                return new BitcoinBalanceProvider();
            }
            case "hyperliquid": {
                const { HyperliquidBalanceProvider } = await import("./providers/hyperliquidBalanceProvider");
                return new HyperliquidBalanceProvider();
            }
            case "polymarket": {
                const { PolymarketBalanceProvider } = await import("./providers/polymarketBalanceProvider");
                return new PolymarketBalanceProvider();
            }
            default:
                throw new Error(`Unsupported balance provider kind: ${kind}`);
        }
    }

    private async resolveProvider(network: NetworkWithTokens): Promise<BalanceProvider | undefined> {
        const prioritizedKinds = this.resolvePrioritizedProviderKinds(network);

        // Try likely providers first (cheap in most cases due caching).
        for (const kind of prioritizedKinds) {
            const provider = await this.getProviderInstance(kind);
            if (provider.supportsNetwork(network)) {
                return provider;
            }
        }

        // Fallback: preserve previous behavior by trying every known provider.
        const tried = new Set(prioritizedKinds);
        for (const kind of allProviderKinds) {
            if (tried.has(kind)) continue;
            const provider = await this.getProviderInstance(kind);
            if (provider.supportsNetwork(network)) {
                return provider;
            }
        }

        return undefined;
    }

    private resolvePrioritizedProviderKinds(network: NetworkWithTokens): ProviderKind[] {
        const prioritized: ProviderKind[] = ["query"];

        if (network.name === KnownInternalNames.Networks.StarkNetMainnet
            || network.name === KnownInternalNames.Networks.StarkNetGoerli
            || network.name === KnownInternalNames.Networks.StarkNetSepolia) {
            prioritized.push("starknet");
        }
        if (network.name === KnownInternalNames.Networks.TONMainnet
            || network.name === KnownInternalNames.Networks.TONTestnet) {
            prioritized.push("ton");
        }
        if (network.name === KnownInternalNames.Networks.TronMainnet
            || network.name === KnownInternalNames.Networks.TronTestnet) {
            prioritized.push("tron");
        }
        if (network.name === KnownInternalNames.Networks.BitcoinMainnet
            || network.name === KnownInternalNames.Networks.BitcoinTestnet) {
            prioritized.push("bitcoin");
        }
        if (network.name === KnownInternalNames.Networks.FuelMainnet
            || network.name === KnownInternalNames.Networks.FuelTestnet
            || network.name === KnownInternalNames.Networks.FuelDevnet) {
            prioritized.push("fuel");
        }
        // Extended sources (Hyperliquid, Polymarket, …) declare themselves via the
        // registry; their provider id is the matching balance-provider kind.
        const extendedProvider = getExtendedProviderForNetwork(network.name);
        if (extendedProvider && (allProviderKinds as string[]).includes(extendedProvider.id)) {
            prioritized.push(extendedProvider.id as ProviderKind);
        }

        if (network.type === NetworkType.Solana) {
            prioritized.push("solana");
        }
        if (network.type === NetworkType.EVM) {
            prioritized.push("evm");
        }

        return [...new Set(prioritized)];
    }

    async getBalance(network: NetworkWithTokens, address?: string, options?: { timeoutMs?: number, retryCount?: number }): Promise<NetworkBalance> {
        if (SKIP_BALANCE_NETWORKS.includes(network.name)) {
            return { balances: [] }
        }

        try {
            if (!address)
                throw new Error(`No address provided for network ${network.name}`)
            const provider = await this.resolveProvider(network)
            //TODO: create interface for balance providers in case of empty state they shoudl throw error 
            //never return undefined as SWR does not set loading state if undefined is returned
            if (!provider) throw new Error(`No balance provider found for network ${network.name}`)
            const balances = await provider.fetchBalance(address, network, { timeoutMs: options?.timeoutMs, retryCount: options?.retryCount })

            const errorBalances = balances?.filter(b => b.error)
            if (errorBalances?.length) {
                const balanceError = new Error(`Could not fetch balance for ${errorBalances.map(t => t.token).join(", ")} in ${network.name}`);
                posthog.captureException(balanceError, {
                    $layerswap_exception_type: "Balance Error",
                    network: network.name,
                    node_url: network.node_url,
                    nodes: network.nodes,
                    address: address,
                    failed_tokens: formatErrorBalances(errorBalances),
                    error_categories: [...new Set(errorBalances.map(b => b.error?.category).filter(Boolean))],
                    error_codes: [...new Set(errorBalances.map(b => b.error?.code).filter(Boolean))],
                    http_statuses: [...new Set(errorBalances.map(b => b.error?.status).filter(Boolean))]
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
            posthog.captureException(error, {
                $layerswap_exception_type: "Balance Error",
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

type ProviderKind =
    | "query"
    | "starknet"
    | "evm"
    | "fuel"
    | "solana"
    | "ton"
    | "tron"
    | "bitcoin"
    | "hyperliquid"
    | "polymarket";

const allProviderKinds: ProviderKind[] = [
    "query",
    "starknet",
    "evm",
    "fuel",
    "solana",
    "ton",
    "tron",
    "bitcoin",
    "hyperliquid",
    "polymarket",
];
