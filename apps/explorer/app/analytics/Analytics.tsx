"use client";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { AnalyticsNetwork, AnalyticsPeriod, AnalyticsResponse, NetworkAnalytics, } from "@/models/Analytics";
import Link from "next/link";
import ChainSelector from "./components/ChainSelector";
import RangeTabs from "./components/RangeTabs";
import SummaryCards from "./components/SummaryCards";
import VolumeChart from "./components/VolumeChart";
import FlowSection from "./components/FlowSection";
import AssetsTable from "./components/AssetsTable";
import { fillTimelineGaps, fmtUsd, generatedAtLabel } from "./components/format";
import { useSearchParams } from "next/navigation";
import { ApiResponse, NetworkWithTokens } from "@layerswap/widget/types";
import { apiClient } from "@/lib/apiClient";

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
    "24h": "Last 24 hours",
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "90d": "Last 90 days",
};

function buildKey(period: AnalyticsPeriod) {
    const params = new URLSearchParams();
    if (process.env.NEXT_PUBLIC_API_VERSION)
        params.set("version", process.env.NEXT_PUBLIC_API_VERSION);
    params.set("period", period);
    return `/explorer/analytics?${params.toString()}`;
}

function responseStatus(error: unknown): number | undefined {
    return (error as { response?: { status?: number } })?.response?.status;
}

function responseMessage(error: unknown): string | undefined {
    const data = (
        error as {
            response?: {
                data?: {
                    message?: string;
                    error?: { message?: string };
                };
            };
        }
    )?.response?.data;

    return data?.message ?? data?.error?.message;
}

function emptyNetworkAnalytics(network: AnalyticsNetwork): NetworkAnalytics {
    return {
        network,
        totals: {
            inflow: { transfer_count: 0, amount_in_usd: 0 },
            outflow: { transfer_count: 0, amount_in_usd: 0 },
            net_amount_in_usd: 0,
        },
        timeline: [],
        assets: [],
        source_chains: [],
        destination_chains: [],
    };
}

function SectionSkeleton() {
    return (
        <div className="flex animate-pulse flex-col gap-3.5" aria-label="Loading analytics">
            <div className="h-[118px] rounded-2xl border border-secondary-300 bg-secondary-500" />
            <div className="h-[352px] rounded-2xl border border-secondary-300 bg-secondary-500" />
            <div className="h-[220px] rounded-2xl border border-secondary-300 bg-secondary-500" />
            <div className="h-[320px] rounded-2xl border border-secondary-300 bg-secondary-500" />
        </div>
    );
}

function AnalyticsUnavailable({
    deploymentMissing,
    isRetrying,
    onRetry,
}: {
    deploymentMissing: boolean;
    isRetrying: boolean;
    onRetry: () => void;
}) {
    const title = deploymentMissing
        ? "Network analytics aren’t available yet"
        : "Network analytics are temporarily unavailable";
    const description = deploymentMissing
        ? "This API deployment does not include analytics data. Transfers and transaction search are still available."
        : "The analytics service could not be reached. Try loading it again.";

    return (
        <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-secondary-300 bg-secondary-600 px-6 py-12 text-center">
            <div className="max-w-md">
                <div
                    className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary-400/30 bg-primary-400/10 text-xl text-primary-400"
                    aria-hidden="true"
                >
                    ↗
                </div>
                <h2 className="text-xl font-semibold text-primary-text">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-secondary-text">{description}</p>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                    <button
                        type="button"
                        onClick={onRetry}
                        disabled={isRetrying}
                        className="rounded-lg bg-primary-400 px-4 py-2.5 text-sm font-semibold text-primary-buttonTextColor transition-colors hover:bg-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60 disabled:cursor-wait disabled:opacity-60"
                    >
                        {isRetrying ? "Trying again…" : "Try again"}
                    </button>
                    <Link
                        href="/"
                        className="rounded-lg border border-secondary-300 bg-secondary-500 px-4 py-2.5 text-sm font-semibold text-primary-text transition-colors hover:border-secondary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60"
                    >
                        View transfers
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function Analytics() {
    const searchParams = useSearchParams();
    const networkName = searchParams.get("network");
    const [period, setPeriod] = useState<AnalyticsPeriod>("7d");

    const { data, error, isLoading, isValidating, mutate } = useSWR<ApiResponse<AnalyticsResponse>>(
        buildKey(period),
        apiClient.fetcher,
        {
            dedupingInterval: 60000,
            keepPreviousData: true,
            onErrorRetry: (retryError, _key, _config, revalidate, { retryCount }) => {
                const status = responseStatus(retryError);
                if ((status && status < 500) || retryCount >= 5) return;

                window.setTimeout(
                    () => revalidate({ retryCount }),
                    status === 503 ? 30000 : 5000
                );
            },
        }
    );

    const { data: networksData } = useSWR<ApiResponse<NetworkWithTokens[]>>("/networks", apiClient.fetcher, { dedupingInterval: 60000 });

    const response = data?.data;
    const availableNetworks = useMemo<AnalyticsNetwork[]>(
        () =>
            (networksData?.data ?? [])
                .map((network) => ({
                    name: network.name,
                    display_name: network.display_name,
                    logo: network.logo,
                }))
                .sort((a, b) => a.display_name.localeCompare(b.display_name)),
        [networksData]
    );

    const selectedNetwork = useMemo(() => {
        const requested = availableNetworks.find((network) => network.name === networkName);

        return (
            requested ??
            response?.networks[0]?.network ??
            availableNetworks[0] ??
            null
        );
    }, [availableNetworks, networkName, response]);

    const networkAnalytics = useMemo(() => {
        if (!response || !selectedNetwork) return null;

        return (
            response.networks.find(
                (item) => item.network.name === selectedNetwork.name
            ) ?? emptyNetworkAnalytics(selectedNetwork)
        );
    }, [response, selectedNetwork]);

    const timeline = useMemo(
        () =>
            response && networkAnalytics
                ? fillTimelineGaps(networkAnalytics.timeline, response.range)
                : [],
        [networkAnalytics, response]
    );

    const hasActivity = Boolean(
        response &&
        selectedNetwork &&
        response.networks.some((item) => item.network.name === selectedNetwork.name)
    );
    const status = responseStatus(error);
    const isWarming = status === 503;
    const isFatalError = Boolean(error && !response && !isWarming);
    const deploymentMissing =
        status === 400 && responseMessage(error)?.toLowerCase() === "no swaps found";

    const onSelectNetwork = (network: AnalyticsNetwork) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("network", network.name);
        window.history.replaceState(null, "", `?${params.toString()}`);
    };

    return (
        <main className="flex w-full flex-col px-4 pb-10 pt-8 sm:px-6 xl:px-0">
            <div className="mx-auto flex w-full max-w-6xl flex-col lg:px-8">
                <header className="mb-6">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <h1 className="text-3xl font-semibold tracking-[-0.035em] text-primary-text sm:text-[34px]">
                                Network analytics
                            </h1>
                            <p className="mt-2 max-w-xl text-sm leading-6 text-secondary-text">
                                Compare completed transfer volume entering and leaving each
                                network across Layerswap.
                            </p>
                        </div>
                        {response ? (
                            <div className="flex flex-col gap-1 sm:items-end">
                                {networkAnalytics && selectedNetwork ? (
                                    <span className="text-sm text-secondary-text">
                                        {`${selectedNetwork.display_name} · ${PERIOD_LABELS[period]} · Total volume `}
                                        <span className="font-semibold tabular-nums text-primary-text">
                                            {fmtUsd(networkAnalytics.totals.inflow.amount_in_usd + networkAnalytics.totals.outflow.amount_in_usd)}
                                        </span>
                                    </span>
                                ) : null}
                                <time
                                    dateTime={response.generated_at}
                                    className="text-xs tabular-nums text-primary-text-tertiary"
                                >
                                    {generatedAtLabel(response.generated_at)}
                                </time>
                            </div>
                        ) : null}
                    </div>
                    <div
                        className="mt-5 h-px w-full bg-secondary-300"
                        aria-hidden="true"
                    />
                </header>

                {!isFatalError ? (
                    <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <ChainSelector
                            networks={availableNetworks}
                            selected={selectedNetwork}
                            onSelect={onSelectNetwork}
                            disabled={availableNetworks.length === 0}
                        />
                        <div className="flex w-full items-center gap-3 sm:w-auto">
                            <RangeTabs
                                value={period}
                                onChange={setPeriod}
                                disabled={isLoading && !response}
                            />
                        </div>
                    </div>
                ) : null}

                {isWarming ? (
                    <div
                        className="mb-4 rounded-2xl border border-primary-100/30 bg-primary-900 px-5 py-4 text-sm text-primary-100"
                        role="status"
                    >
                        Analytics are warming up. This can take a moment on first load — the page
                        will refresh automatically once ready.
                    </div>
                ) : null}

                {error && !isWarming && response ? (
                    <div
                        className="mb-4 rounded-2xl border border-primary-400/25 bg-primary-900 px-5 py-4 text-sm text-primary-100"
                        role="status"
                    >
                        Couldn’t refresh analytics. Showing the most recently loaded data.
                    </div>
                ) : null}

                {isFatalError ? (
                    <AnalyticsUnavailable
                        deploymentMissing={deploymentMissing}
                        isRetrying={isValidating}
                        onRetry={() => void mutate()}
                    />
                ) : !response || !networkAnalytics || !selectedNetwork ? (
                    <SectionSkeleton />
                ) : (
                    <div className="flex flex-col gap-3.5">
                        {!hasActivity ? (
                            <div className="rounded-2xl border border-secondary-300 bg-secondary-500 px-5 py-4 text-sm text-secondary-text">
                                No completed transfers for {selectedNetwork.display_name} in this
                                period. Try a longer range or choose another network.
                            </div>
                        ) : null}
                        <SummaryCards
                            totals={networkAnalytics.totals}
                            assets={networkAnalytics.assets}
                        />
                        <VolumeChart timeline={timeline} range={response.range} />
                        <FlowSection
                            network={selectedNetwork}
                            sourceChains={networkAnalytics.source_chains}
                            destinationChains={networkAnalytics.destination_chains}
                        />
                        <AssetsTable assets={networkAnalytics.assets} />
                    </div>
                )}
            </div>
        </main>
    );
}
