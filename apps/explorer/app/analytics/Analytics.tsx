"use client";

import { useState } from "react";
import useSWR from "swr";
import {
    AnalyticsNetwork,
    AnalyticsPeriod,
    AnalyticsResponse,
} from "@/models/Analytics";
import Error500 from "@/components/Error500";
import ChainSelector from "./components/ChainSelector";
import RangeTabs from "./components/RangeTabs";
import SummaryCards from "./components/SummaryCards";
import VolumeChart from "./components/VolumeChart";
import FlowSection from "./components/FlowSection";
import AssetsTable from "./components/AssetsTable";
import { ApiResponse } from "@layerswap/widget/types";
import { LayerswapApiClient } from "@layerswap/widget/internal";

const apiClient = new LayerswapApiClient();
const version = process.env.NEXT_PUBLIC_API_VERSION;

function buildKey(network: string | null, period: AnalyticsPeriod) {
    const params = new URLSearchParams();
    if (version) params.set("version", version);
    if (network) params.set("network", network);
    params.set("period", period);
    return `/explorer/analytics?${params.toString()}`;
}

function SectionSkeleton() {
    return (
        <div className="animate-pulse flex flex-col gap-3.5">
            <div className="h-[118px] bg-[#171f31] border border-[#283247] rounded-2xl" />
            <div className="h-[352px] bg-[#171f31] border border-[#283247] rounded-2xl" />
            <div className="h-[220px] bg-[#171f31] border border-[#283247] rounded-2xl" />
            <div className="h-[320px] bg-[#171f31] border border-[#283247] rounded-2xl" />
        </div>
    );
}

export default function Analytics() {
    // `network` is null until the user picks one; the API then defaults to the
    // top network and echoes it back in `selected_network`.
    const [network, setNetwork] = useState<string | null>(null);
    const [period, setPeriod] = useState<AnalyticsPeriod>("7d");

    const { data, error, isLoading } = useSWR<ApiResponse<AnalyticsResponse>>(
        buildKey(network, period),
        apiClient.fetcher,
        { dedupingInterval: 60000, keepPreviousData: true }
    );

    const analytics = data?.data;
    const status = (error as any)?.response?.status;
    const isWarming = status === 503;

    const onSelectNetwork = (n: AnalyticsNetwork) => setNetwork(n.name);

    return (
        <main className="w-full pb-10 px-6 xl:px-0 flex flex-col">
            <div className="mx-auto w-full max-w-6xl lg:px-8 flex flex-col">
                {/* Controls */}
                <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                    <ChainSelector
                        networks={analytics?.available_networks ?? []}
                        selected={analytics?.selected_network ?? null}
                        onSelect={onSelectNetwork}
                    />
                    <RangeTabs value={period} onChange={setPeriod} disabled={isLoading && !analytics} />
                </div>

                {isWarming && (
                    <div className="bg-[#2f2b1d] border border-[#ffc94a]/30 text-[#ffc94a] rounded-2xl px-5 py-4 text-sm mb-4">
                        Analytics are warming up. This can take a moment on first load — the page
                        will refresh automatically once ready.
                    </div>
                )}

                {error && !isWarming && !analytics ? (
                    <Error500 />
                ) : !analytics ? (
                    <SectionSkeleton />
                ) : (
                    <div className="flex flex-col gap-3.5">
                        <SummaryCards totals={analytics.totals} timeline={analytics.timeline} assetsCount={analytics.assets.length} />
                        <VolumeChart timeline={analytics.timeline} range={analytics.range} />
                        <FlowSection
                            network={analytics.selected_network}
                            sourceChains={analytics.source_chains}
                            destinationChains={analytics.destination_chains}
                        />
                        <AssetsTable assets={analytics.assets} />
                    </div>
                )}
            </div>
        </main>
    );
}
