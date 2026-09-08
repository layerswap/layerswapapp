"use client";

import { useRouter } from "next/navigation";
import CopyButton from "../buttons/copyButton";
import SwapTableRow from "./SwapTableRow";
import { Swap, TransactionType } from "@/models/Swap";

interface SwapListViewProps {
    swaps: Swap[];
    destinationAddress?: string;
    onLoadMore?: () => void;
    isLoadingMore?: boolean;
    isReachingEnd?: boolean;
}

export default function SwapListView({
    swaps,
    destinationAddress,
    onLoadMore,
    isLoadingMore = false,
    isReachingEnd = true,
}: SwapListViewProps) {
    const router = useRouter();
    const hasScrollableList = swaps.length > 5;

    return (
        <div className="px-4 sm:px-6 lg:px-8 w-full">
            <div className="flow-root w-full">
                {/* Address Header */}
                <div className="inline-block min-w-full align-middle">
                    <h1 className="h5 mb-4 text-primary-text flex gap-1">
                        <span className="font-bold text-primary-text">Address: </span>
                        <span className="break-all">
                            {destinationAddress}
                            <CopyButton
                                toCopy={destinationAddress || ''}
                                iconHeight={16}
                                iconClassName="order-2"
                                iconWidth={16}
                                className="inline-flex items-center ml-1 align-middle"
                            />
                        </span>
                    </h1>
                </div>

                {/* Table Container */}
                <div className={`
                    ${hasScrollableList ? "overflow-y-scroll h-full max-h-[55vh] 2xl:max-h-[65vh] dataTable" : "overflow-hidden"}
                    -mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8
                `}>
                    <div className="inline-block min-w-full pb-2 align-middle sm:px-6 lg:px-8">
                        <div className="overflow-hidden rounded-3xl bg-secondary-700 p-1">
                            <table className="relative min-w-full divide-y divide-secondary-300">
                                <thead className="sticky -top-1 z-10 bg-secondary-500">
                                    <tr>
                                        <th scope="col" className="sticky top-0 px-3 py-3.5 text-left text-sm font-semibold text-primary-text sm:rounded-tl-lg">
                                            Source Tx Hash
                                        </th>
                                        <th scope="col" className="sticky top-0 px-3 py-3.5 text-left text-sm font-semibold text-primary-text">
                                            Source
                                        </th>
                                        <th scope="col" className="sticky top-0 px-3 py-3.5 text-left text-sm font-semibold text-primary-text">
                                            Destination
                                        </th>
                                        <th scope="col" className="sticky top-0 px-4 py-3.5 text-left text-sm font-semibold text-primary-text rounded-tr-lg">
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-500 bg-secondary-700">
                                    {swaps.map((swap, index) => {
                                        const inputTransaction = swap.transactions?.find(t => t?.type === TransactionType.Input);
                                        const outputTransaction = swap.transactions?.find(t => t?.type === TransactionType.Output);

                                        if (!inputTransaction) return null;

                                        return (
                                            <SwapTableRow
                                                key={inputTransaction.transaction_hash || index}
                                                swap={swap}
                                                inputTransaction={inputTransaction}
                                                outputTransaction={outputTransaction}
                                                index={index}
                                                onRowClick={() => router.push(`/${encodeURIComponent(inputTransaction.transaction_hash)}`)}
                                            />
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {!isReachingEnd && onLoadMore && (
                    <div className="flex justify-center py-4">
                        <button
                            onClick={onLoadMore}
                            disabled={isLoadingMore}
                            className="min-h-12 rounded-xl bg-secondary-300 px-4 py-3 text-sm font-medium text-primary-text transition hover:bg-secondary-400 active:animate-press-down disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isLoadingMore ? 'Loading...' : 'Load more'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
