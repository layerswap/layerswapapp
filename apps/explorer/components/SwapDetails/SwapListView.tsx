"use client";

import { useRouter, usePathname } from "next/navigation";
import CopyButton from "../buttons/copyButton";
import BackBtn from "@/helpers/BackButton";
import SwapTableRow from "./SwapTableRow";
import { Swap, TransactionType } from "@/models/Swap";

interface SwapListViewProps {
    swaps: Swap[];
    destinationAddress?: string;
    basePath?: string;
}

export default function SwapListView({
    swaps,
    destinationAddress,
    basePath,
}: SwapListViewProps) {
    const router = useRouter();
    const pathname = usePathname();

    const isHomePage = pathname === '/' || pathname === basePath || pathname === `${basePath}/`;
    const hasScrollableList = swaps.length > 5;

    return (
        <div className="px-4 sm:px-6 lg:px-8 w-full">
            {/* Back Button */}
            {!isHomePage && (
                <div className="hidden lg:block w-fit mb-1 hover:bg-secondary-600 hover:text-accent-foreground rounded ring-offset-background transition-colors -ml-5">
                    <BackBtn />
                </div>
            )}

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
                        <div className="shadow ring-1 ring-white/5 sm:rounded-lg">
                            <table className="min-w-full divide-y divide-secondary-500 relative">
                                <thead className="bg-secondary-800 sticky -top-1 z-10 sm:rounded-lg">
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
                                <tbody className="divide-y divide-secondary-400 bg-secondary">
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
            </div>
        </div>
    );
}

