import type {
    InternalConnector,
    WalletConnectionProvider,
} from "@/types/wallet";

export type ProviderPaginationState = {
    loaded: boolean;
    nextPage: number | null;
    totalCount: number;
    pageSize: number;
    isLoading: boolean;
};

export type RequestCapableWalletProvider = WalletConnectionProvider & {
    requestAdditionalConnectors: NonNullable<
        WalletConnectionProvider["requestAdditionalConnectors"]
    >;
};

export const DEFAULT_BROWSE_PAGE_SIZE = 40;
export const SEARCH_PAGE_SIZE = 100;

export const canRequestAdditionalConnectors = (
    provider: WalletConnectionProvider,
): provider is RequestCapableWalletProvider =>
    typeof provider.requestAdditionalConnectors === "function";

export const requestCapableProviderNamesKey = (
    providers: WalletConnectionProvider[],
) =>
    providers
        .filter(canRequestAdditionalConnectors)
        .map((provider) => provider.name)
        .join("|");

export const upsertLoadingState = (
    previous: Record<string, ProviderPaginationState>,
    providerNames: string[],
    pageSize: number,
) => {
    const next = { ...previous };

    for (const providerName of providerNames) {
        next[providerName] = {
            loaded: previous[providerName]?.loaded ?? false,
            nextPage: previous[providerName]?.nextPage ?? null,
            totalCount: previous[providerName]?.totalCount ?? 0,
            pageSize: previous[providerName]?.pageSize ?? pageSize,
            isLoading: true,
        };
    }

    return next;
};

export const withProviderName = (
    providerName: string,
    connectors: InternalConnector[],
) => connectors.map((connector) => ({ ...connector, providerName }));
