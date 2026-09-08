// Mirrors monorepo/bridge/src/PartnerAPI/Models/ExplorerAnalyticsModels.cs
// (GET /api/v2/explorer/analytics). One response contains every active network
// for the requested period; the network picker is handled client-side.

export type AnalyticsNetwork = {
    name: string;
    display_name: string;
    logo: string;
};

export type AnalyticsRange = {
    from: string;
    to: string;
    bucket_size: "hour" | "day" | "week" | string;
};

export type AnalyticsFlow = {
    transfer_count: number;
    amount_in_usd: number;
};

export type AnalyticsTotals = {
    inflow: AnalyticsFlow;
    outflow: AnalyticsFlow;
    net_amount_in_usd: number;
};

export type AnalyticsTimelinePoint = {
    bucket_start: string;
    inflow_transfer_count: number;
    outflow_transfer_count: number;
    inflow_amount_in_usd: number;
    outflow_amount_in_usd: number;
};

export type AnalyticsAssetFlow = {
    transfer_count: number;
    token_amount: number;
    amount_in_usd: number;
};

export type AnalyticsAsset = {
    asset: string;
    logo: string;
    inflow: AnalyticsAssetFlow;
    outflow: AnalyticsAssetFlow;
};

export type AnalyticsCounterparty = {
    network: AnalyticsNetwork;
    transfer_count: number;
    amount_in_usd: number;
};

export type NetworkAnalytics = {
    network: AnalyticsNetwork;
    totals: AnalyticsTotals;
    timeline: AnalyticsTimelinePoint[];
    assets: AnalyticsAsset[];
    source_chains: AnalyticsCounterparty[];
    destination_chains: AnalyticsCounterparty[];
};

export type AnalyticsResponse = {
    generated_at: string;
    range: AnalyticsRange;
    available_networks: AnalyticsNetwork[];
    networks: NetworkAnalytics[];
};

export type AnalyticsPeriod = "24h" | "7d" | "30d" | "90d";
export const ANALYTICS_PERIODS: AnalyticsPeriod[] = ["24h", "7d", "30d", "90d"];

// Use the shared Explorer theme tokens so charts follow palette overrides.
export const FLOW_COLORS = {
    inflow: "#AEB8D6",
    outflow: "var(--color-primary-400)",
    positive: "var(--color-primary-100)",
    negative: "var(--color-primary-400)",
    neutral: "var(--color-primary-text-tertiary)",
} as const;
