import type {
    InternalConnector,
    RequestAdditionalConnectorsParams,
    RequestAdditionalConnectorsResult,
    WalletConnectionProvider,
} from "@/types/wallet";

export type ProviderPaginationState = {
    loaded: boolean;
    nextPage: number | null;
    totalCount: number;
    pageSize: number;
    isLoading: boolean;
}

export type PaginationByProvider = Record<string, ProviderPaginationState>

export type RequestCapableWalletProvider = WalletConnectionProvider & {
    requestAdditionalConnectors: NonNullable<WalletConnectionProvider["requestAdditionalConnectors"]>;
}

export type ProviderPageResult = {
    providerName: string;
    result: RequestAdditionalConnectorsResult | undefined;
}

export const DEFAULT_BROWSE_PAGE_SIZE = 40
export const SEARCH_PAGE_SIZE = 100

export const canRequestAdditionalConnectors = (
    provider: WalletConnectionProvider
): provider is RequestCapableWalletProvider => (
    typeof provider.requestAdditionalConnectors === "function"
)

export const requestCapableProviderNamesKey = (
    providers: WalletConnectionProvider[]
) => providers
    .filter(canRequestAdditionalConnectors)
    .map(provider => provider.name)
    .join("|")

export const paginationCursorKey = (
    providers: WalletConnectionProvider[],
    pagination: PaginationByProvider
) => providers
    .map(provider => `${provider.name}:${pagination[provider.name]?.nextPage ?? "end"}`)
    .join("|")

export const setProvidersLoading = (
    previous: PaginationByProvider,
    providerNames: string[],
    pageSize: number
) => {
    const next = { ...previous }

    for (const providerName of providerNames) {
        next[providerName] = {
            loaded: previous[providerName]?.loaded ?? false,
            nextPage: previous[providerName]?.nextPage ?? null,
            totalCount: previous[providerName]?.totalCount ?? 0,
            pageSize: previous[providerName]?.pageSize ?? pageSize,
            isLoading: true,
        }
    }

    return next
}

export const applyPageResults = (
    previous: PaginationByProvider,
    results: ProviderPageResult[],
    pageSize: number
) => {
    const next = { ...previous }

    for (const { providerName, result } of results) {
        next[providerName] = {
            loaded: true,
            nextPage: result?.nextPage ?? null,
            totalCount: result?.totalCount ?? previous[providerName]?.totalCount ?? 0,
            pageSize: previous[providerName]?.pageSize ?? pageSize,
            isLoading: false,
        }
    }

    return next
}

export const requestProviderPages = (
    providers: RequestCapableWalletProvider[],
    getParams: (provider: RequestCapableWalletProvider) => RequestAdditionalConnectorsParams
) => Promise.all(providers.map(async provider => {
    try {
        const result = await provider.requestAdditionalConnectors(getParams(provider))
        return { providerName: provider.name, result }
    } catch {
        return { providerName: provider.name, result: undefined }
    }
}))

export const withProviderName = (
    providerName: string,
    connectors: InternalConnector[]
) => connectors.map(connector => ({ ...connector, providerName }))
