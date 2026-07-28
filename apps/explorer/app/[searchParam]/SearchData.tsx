"use client";

import useSWRInfinite from "swr/infinite";
import { ApiResponse } from '@layerswap/widget/types';
import { LayerswapApiClient } from '@layerswap/widget/internal';
import { SwapData, TransactionType } from "@/models/Swap";
import LoadingBlocks from "@/components/LoadingBlocks";
import NotFound from "@/components/notFound";
import { SwapListView, SwapDetailView } from "@/components/SwapDetails";

interface SearchDataProps {
    searchParam: string;
}

const apiClient = new LayerswapApiClient();

export default function SearchData({ searchParam }: SearchDataProps) {
    const basePath = process.env.NEXT_PUBLIC_APP_BASE_PATH;


    const getKey = (pageIndex: number, previousPageData: ApiResponse<SwapData[]> | null) => {
        if (previousPageData && (!previousPageData.data || previousPageData.data.length === 0)) return null;
        return `/explorer/${searchParam}?version=${process.env.NEXT_PUBLIC_API_VERSION}&page=${pageIndex + 1}&statuses=Completed&statuses=PendingWithdrawal&statuses=PendingRefund&statuses=Refunded`;
    };

    const { data, error, isLoading, size, setSize, isValidating } = useSWRInfinite<ApiResponse<SwapData[]>>(
        getKey,
        apiClient.fetcher,
        { dedupingInterval: 60000, revalidateFirstPage: false }
    );

    const allData = data ? data.flatMap(d => d?.data || []) : [];
    const lastPage = data?.[data.length - 1];
    const isLoadingMore = isValidating && size > 1;
    const isReachingEnd = !!data && (!lastPage?.data || lastPage.data.length === 0);

    // Extract data from response
    const swapData = allData[0];
    const swap = swapData?.swap;
    const quote = swapData?.quote;
    const refuel = swapData?.refuel;

    // Find transactions by type
    const inputTransaction = swap?.transactions?.find(t => t?.type === TransactionType.Input);
    const outputTransaction = swap?.transactions?.find(t => t?.type === TransactionType.Output);
    const refuelTransaction = swap?.transactions?.find(t => t?.type === TransactionType.Refuel);
    const refundedTransaction = swap?.transactions?.find(t => t?.type === TransactionType.Refunded);

    // Filter swaps that have input transactions (for list view)
    const filteredSwaps = allData
        .filter(s => s?.swap?.transactions?.some(t => t?.type === TransactionType.Input))
        .map(s => s?.swap)
        .filter(Boolean);

    // Check if data is empty
    const isEmptyData = !!data && allData.every(s => !s?.swap?.transactions?.length);

    // Handle error and empty states
    if (error || isEmptyData) return <NotFound />;
    if (isLoading) return <LoadingBlocks />;

    // Multiple swaps found - show list view
    const hasMultipleSwaps = allData.length > 1;

    if (hasMultipleSwaps) {
        return (
            <SwapListView
                swaps={filteredSwaps}
                destinationAddress={swap?.destination_address}
                basePath={basePath}
                onLoadMore={() => setSize(size + 1)}
                isLoadingMore={isLoadingMore}
                isReachingEnd={isReachingEnd}
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
