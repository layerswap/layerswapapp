// Mirrors monorepo/bridge/src/PartnerAPI/Models/ExplorerAnalyticsModels.cs
// (GET /api/v2/explorer/analytics). The API is always single-network scoped.

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

export type AnalyticsResponse = {
    selected_network: AnalyticsNetwork;
    available_networks: AnalyticsNetwork[];
    generated_at: string;
    range: AnalyticsRange;
    totals: AnalyticsTotals;
    timeline: AnalyticsTimelinePoint[];
    assets: AnalyticsAsset[];
    source_chains: AnalyticsCounterparty[];
    destination_chains: AnalyticsCounterparty[];
};

export type AnalyticsPeriod = "24h" | "7d" | "30d" | "90d";
export const ANALYTICS_PERIODS: AnalyticsPeriod[] = ["24h", "7d", "30d", "90d"];

// Palette from the Analytics design (PAL in Analytics.dc.html):
// inflow slate, outflow hot-pink; net sparkline green/red by sign.
export const FLOW_COLORS = {
    inflow: "#9aa6c1",
    outflow: "#e54072",
    positive: "#59e07d",
    negative: "#ff6161",
} as const;
