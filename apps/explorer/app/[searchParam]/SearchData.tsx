"use client";

import useSWR from "swr";
import { ApiResponse } from '@layerswap/widget/types';
import { LayerswapApiClient } from '@layerswap/widget/internal';
import { SwapData, TransactionType } from "@/models/Swap";
import LoadingBlocks from "@/components/LoadingBlocks";
import NotFound from "@/components/notFound";
import { SwapListView, SwapDetailView } from "@/components/SwapDetails";

interface SearchDataProps {
    searchParam: string;
}

export default function SearchData({ searchParam }: SearchDataProps) {
    const basePath = process.env.NEXT_PUBLIC_APP_BASE_PATH;

    const apiClient = new LayerswapApiClient();
    const { data, error, isLoading } = useSWR<ApiResponse<SwapData[]>>(
        `/explorer/${searchParam}?version=${process.env.NEXT_PUBLIC_API_VERSION}`,
        apiClient.fetcher,
        { dedupingInterval: 60000 }
    );

    // Extract data from response
    const swapData = data?.data?.[0];
    const swap = swapData?.swap;
    const quote = swapData?.quote;
    const refuel = swapData?.refuel;

    // Find transactions by type
    const inputTransaction = swap?.transactions?.find(t => t?.type === TransactionType.Input);
    const outputTransaction = swap?.transactions?.find(t => t?.type === TransactionType.Output);
    const refuelTransaction = swap?.transactions?.find(t => t?.type === TransactionType.Refuel);
    const refundedTransaction = swap?.transactions?.find(t => t?.type === TransactionType.Refunded);

    // Filter swaps that have input transactions (for list view)
    const filteredSwaps = data?.data
        ?.filter(s => s?.swap?.transactions?.some(t => t?.type === TransactionType.Input))
        ?.map(s => s?.swap)
        ?.filter(Boolean) || [];

    // Check if data is empty
    const isEmptyData = data?.data?.every(s => !s?.swap?.transactions?.length);

    // Handle error and empty states
    if (error || isEmptyData) return <NotFound />;
    if (isLoading) return <LoadingBlocks />;

    // Multiple swaps found - show list view
    const hasMultipleSwaps = Number(data?.data?.length) > 1;

    if (hasMultipleSwaps) {
        return (
            <SwapListView
                swaps={filteredSwaps}
                destinationAddress={swap?.destination_address}
                basePath={basePath}
            />
        );
    }

    // Single swap found - show detail view
    if (swap && inputTransaction) {
        return (
            <SwapDetailView
                swap={swap}
                quote={quote}
                refuel={refuel}
                inputTransaction={inputTransaction}
                outputTransaction={outputTransaction}
                refuelTransaction={refuelTransaction}
                refundedTransaction={refundedTransaction}
            />
        );
    }

    return <NotFound />;
}
