"use client";

import { shortenAddress } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import StatusIcon from "../SwapHistory/StatusIcons";
import { formatAmount } from "@/helpers/formatAmount";
import { Transaction, Swap } from "@/models/Swap";

interface SwapTableRowProps {
    swap: Swap;
    inputTransaction: Transaction;
    outputTransaction?: Transaction;
    index: number;
    onRowClick: () => void;
}

export default function SwapTableRow({
    swap,
    inputTransaction,
    outputTransaction,
    index,
    onRowClick,
}: SwapTableRowProps) {
    const { source_network, source_token, source_exchange } = swap;
    const { destination_network, destination_token, destination_exchange } = swap;

    const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

    return (
        <tr
            onClick={onRowClick}
            className="hover:bg-secondary-600 hover:cursor-pointer"
        >
            {/* Transaction Hash & Status */}
            <td className="whitespace-nowrap py-2 px-3 text-sm font-medium text-primary-text flex flex-col">
                <Link
                    href={`/${inputTransaction.transaction_hash}`}
                    onClick={stopPropagation}
                    className="hover:text-gray-300 inline-flex items-center w-fit"
                >
                    {shortenAddress(inputTransaction.transaction_hash)}
                </Link>
                <StatusIcon swap={swap.status} />
                <span className="text-primary-text">
                    {new Date(swap.created_date).toLocaleString()}
                </span>
            </td>

            {/* Source Info */}
            <td className="whitespace-nowrap px-3 py-2 text-sm text-primary-text">
                <div className="flex flex-row">
                    <div className="flex flex-col items-start">
                        <span className="text-sm md:text-base font-normal text-secondary-text mb-1">Token:</span>
                        <span className="text-sm md:text-base font-normal text-secondary-text min-w-[70px]">Source:</span>
                    </div>
                    <div className="flex flex-col">
                        {/* Token Row */}
                        <div className="text-sm md:text-base flex flex-row mb-1">
                            <div className="flex flex-row items-center ml-4 whitespace-nowrap">
                                <div className="relative h-4 w-4 md:h-5 md:w-5">
                                    <Image
                                        alt={`Source token icon ${index}`}
                                        src={source_token?.logo || ''}
                                        width={20}
                                        height={20}
                                        className="rounded-md"
                                    />
                                </div>
                                <div className="mx-2.5">
                                    <span className="text-primary-text">{formatAmount(inputTransaction.amount)}</span>
                                    <span className="mx-1 text-primary-text">{source_token?.symbol}</span>
                                </div>
                            </div>
                        </div>
                        {/* Network Row */}
                        <div className="text-sm md:text-base flex flex-row items-center ml-4">
                            <div className="relative h-4 w-4 md:h-5 md:w-5">
                                <Image
                                    alt={`Source chain icon ${index}`}
                                    src={source_exchange?.logo || source_network?.logo || ''}
                                    width={20}
                                    height={20}
                                    className="rounded-md"
                                />
                            </div>
                            <div className="mx-2 text-primary-text">
                                <Link
                                    href={source_network?.transaction_explorer_template?.replace('{0}', inputTransaction.from || '') || '#'}
                                    onClick={stopPropagation}
                                    target="_blank"
                                    className="hover:text-gray-300 inline-flex items-center w-fit"
                                >
                                    <span className="mx-0.5 hover:text-gray-300 underline">
                                        {source_exchange?.display_name || source_network?.display_name}
                                    </span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </td>

            {/* Destination Info */}
            <td className="whitespace-nowrap px-3 py-2 text-sm text-primary-text">
                <div className="flex flex-row">
                    <div className="flex flex-col items-start">
                        <span className="text-sm md:text-base font-normal text-secondary-text mb-1">Token:</span>
                        <span className="text-sm md:text-base font-normal text-secondary-text min-w-[70px]">Destination:</span>
                    </div>
                    <div className="flex flex-col">
                        {/* Token Row */}
                        <div className="text-sm md:text-base flex flex-row">
                            <div className="flex flex-row items-center ml-4 mb-1 whitespace-nowrap">
                                <div className="relative h-4 w-4 md:h-5 md:w-5">
                                    <Image
                                        alt={`Destination token icon ${index}`}
                                        src={destination_token?.logo || ''}
                                        width={20}
                                        height={20}
                                        className="rounded-md"
                                    />
                                </div>
                                {outputTransaction?.amount ? (
                                    <div className="mx-2.5">
                                        <span className="text-primary-text mx-0.5">{formatAmount(outputTransaction.amount)}</span>
                                        <span className="text-primary-text">{destination_token?.symbol}</span>
                                    </div>
                                ) : (
                                    <span className="ml-2.5">-</span>
                                )}
                            </div>
                        </div>
                        {/* Network Row */}
                        <div className="text-sm md:text-base flex flex-row items-center ml-4">
                            <div className="relative h-4 w-4 md:h-5 md:w-5">
                                <Image
                                    alt={`Destination chain icon ${index}`}
                                    src={destination_exchange?.logo || destination_network?.logo || ''}
                                    width={20}
                                    height={20}
                                    className="rounded-md"
                                />
                            </div>
                            <div className="mx-2 text-primary-text">
                                <Link
                                    href={destination_network?.transaction_explorer_template?.replace('{0}', outputTransaction?.transaction_hash || '') || '#'}
                                    onClick={stopPropagation}
                                    target="_blank"
                                    className={`${!outputTransaction ? "disabled" : ""} hover:text-gray-300 inline-flex items-center w-fit`}
                                >
                                    <span className={`${outputTransaction?.transaction_hash ? "underline" : ""} mx-0.5 hover:text-gray-300`}>
                                        {destination_exchange?.display_name || destination_network?.display_name}
                                    </span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </td>

            {/* Arrow */}
            <td className="whitespace-nowrap text-sm mr-4 text-primary-text">
                <ChevronRight />
            </td>
        </tr>
    );
}

