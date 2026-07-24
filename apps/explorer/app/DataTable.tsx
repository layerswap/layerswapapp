"use client"
import { ApiResponse } from '@layerswap/widget/types'
import useSWR from "swr"
import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import LoadingBlocks from "@/components/LoadingBlocks";
import { SwapStatus } from "@/models/SwapStatus";
import { useRouter } from "next/navigation";
import Error500 from "@/components/Error500";
import { SwapData, Swap, TransactionType } from "@/models/Swap";
import { LayerswapApiClient } from '@layerswap/widget/internal'
import { formatAmount } from "@/helpers/formatAmount";
import { CheckCircleFilled } from "@/components/icons/CheckCircleFilled";

export default function DataTable() {
    const apiClient = new LayerswapApiClient()


    const { data, error, isLoading } = useSWR<ApiResponse<SwapData[]>>(`/explorer?version=${process.env.NEXT_PUBLIC_API_VERSION}&statuses=1&statuses=4`, apiClient.fetcher, { dedupingInterval: 60000 });
    const swapsData = data?.data?.map(d => d.swap);
    const router = useRouter();

    if (error) return <Error500 />
    if (isLoading) return <LoadingBlocks />

    return (
        <div className="px-4 sm:px-6 lg:px-8 w-full">
            <div className="mt-8 flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8 h-full max-h-[60dvh] 2xl:max-h-[70dvh] dataTable">
                    <div className="inline-block h-screen min-w-full pb-2 align-middle sm:px-6 lg:px-8">
                        <div className="shadow ring-1 ring-white/5 sm:rounded-lg">
                            <table className="min-w-full divide-y divide-secondary-500 relative">
                                <thead className="bg-secondary-700 sticky -top-1 z-10 sm:rounded-lg">
                                    <tr>
                                        <th scope="col" className="sticky top-0 px-3 py-3.5 text-left text-sm font-semibold text-primary-text rounded-tl-lg">
                                            Status
                                        </th>
                                        <th scope="col" className="sticky top-0 px-3 py-3.5 text-left text-sm font-semibold text-primary-text">
                                            Source
                                        </th>
                                        <th scope="col" className="sticky top-0 px-3 py-3.5 text-left text-sm font-semibold text-primary-text rounded-tr-lg">
                                            Destination
                                        </th>
                                        <th scope="col" className="sticky top-0 px-4 py-3.5 text-left text-sm font-semibold text-primary-text rounded-tr-lg">

                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-400 bg-secondary-600 overflow-y-scroll">
                                    {swapsData?.filter(s => s.transactions?.some(t => t?.type == TransactionType.Input))?.map((swap, index) => {
                                        const input_transaction = swap?.transactions?.find(t => t?.type == TransactionType.Input)
                                        const output_transaction = swap?.transactions?.find(t => t?.type == TransactionType.Output)

                                        const sourceNetwork = swap?.source_network
                                        const sourceToken = swap?.source_token

                                        const sourceExchange = swap?.source_exchange
                                        const destinationExchange = swap?.destination_exchange

                                        const destinationNetwork = swap?.destination_network
                                        const destinationToken = swap?.destination_token

                                        return (
                                            <tr key={index} onClick={() => router.push(`/${encodeURIComponent(String(input_transaction?.transaction_hash))}`)} className="cursor-pointer hover:bg-secondary-500">
                                                <td className="whitespace-nowrap py-2 px-3 text-sm font-medium text-primary-text flex flex-col">
                                                    <div className="flex flex-row items-center text-btn-success bg-btn-success py-1 rounded">
                                                        {DestTxStatus(swap)}
                                                    </div>
                                                    <span className="text-secondary-text">{new Date(swap.created_date).toLocaleString()}</span>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2 text-sm text-primary-text">
                                                    <div className="flex flex-row">
                                                        <div className="flex flex-col items-start mr-4">
                                                            <span className="text-sm md:text-base font-normal text-secondary-text place-items-end mb-1">Token:</span>
                                                            <span className="text-sm md:text-base font-normal text-secondary-text place-items-end min-w-[70px]">Source:</span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <div className="text-sm md:text-base flex flex-row mb-1">
                                                                <div className="flex flex-row items-center">
                                                                    <div className="relative h-4 w-4 md:h-5 md:w-5">
                                                                        <span>
                                                                            <Image alt={`Source token icon ${index}`} src={sourceToken?.logo || ''} width={20} height={20} decoding="async" data-nimg="responsive" className="rounded-md" />
                                                                        </span>
                                                                    </div>
                                                                    <div className="mx-2.5">
                                                                        <span className="text-primary-text">{formatAmount(input_transaction?.amount)}</span>
                                                                        <span className="mx-1 text-primary-text">{sourceToken?.symbol}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-sm md:text-base flex flex-row items-center">
                                                                <div className="relative h-4 w-4 md:h-5 md:w-5">
                                                                    <span>
                                                                        <Image alt={`Source chain icon ${index}`} src={sourceExchange ? sourceExchange?.logo : sourceNetwork?.logo || ''} width={20} height={20} decoding="async" data-nimg="responsive" className="rounded-md" />
                                                                    </span>
                                                                </div>
                                                                <div className="mx-2 text-primary-text">
                                                                    <Link href={`${sourceNetwork?.transaction_explorer_template?.replace('{0}', (input_transaction?.transaction_hash || ''))}`} onClick={(e) => e.stopPropagation()} target="_blank" className="hover:text-gray-300 inline-flex items-center w-fit">
                                                                        <span className="mx-0.5 hover:text-gray-300 underline hover:no-underline">{sourceExchange ? sourceExchange?.display_name : sourceNetwork?.display_name}</span>
                                                                    </Link>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2 text-sm text-primary-text">
                                                    <div className="flex flex-row">
                                                        <div className="flex flex-col items-start">
                                                            <span className="text-sm md:text-base font-normal text-secondary-text place-items-end mb-1">Token:</span>
                                                            <span className="text-sm md:text-base font-normal text-secondary-text place-items-end min-w-[70px]">Destination:</span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <div className="text-sm md:text-base flex flex-row">
                                                                <div className="flex flex-row items-center ml-4 mb-1">
                                                                    <div className="relative h-4 w-4 md:h-5 md:w-5">
                                                                        <span>
                                                                            <Image alt={`Destination token icon ${index}`} src={destinationToken?.logo || ''} width={20} height={20} decoding="async" data-nimg="responsive" className="rounded-md" />
                                                                        </span>
                                                                    </div>
                                                                    {output_transaction?.amount ?
                                                                        <div className="mx-2.5">
                                                                            <span className="text-primary-text">{formatAmount(output_transaction?.amount)}</span>
                                                                            <span className="mx-1 text-primary-text">{destinationToken?.symbol}</span>
                                                                        </div>
                                                                        :
                                                                        <span className="ml-2.5">-</span>
                                                                    }
                                                                </div>
                                                            </div>
                                                            <div className="text-sm md:text-base flex flex-row items-center ml-4">
                                                                <div className="relative h-4 w-4 md:h-5 md:w-5">
                                                                    <span>
                                                                        <Image alt={`Destination chain icon ${index}`} src={destinationExchange ? destinationExchange?.logo : destinationNetwork?.logo || ''} width={20} height={20} decoding="async" data-nimg="responsive" className="rounded-md" />
                                                                    </span>
                                                                </div>
                                                                <div className="mx-2 text-primary-text">
                                                                    {
                                                                        output_transaction?.transaction_hash ?
                                                                            <Link href={`${destinationNetwork?.transaction_explorer_template?.replace('{0}', (output_transaction?.transaction_hash || ''))}`} onClick={(e) => e.stopPropagation()} target="_blank" className={`${!output_transaction ? "disabled" : ""} hover:text-gray-300 inline-flex items-center w-fit`}>
                                                                                <span className={`underline mx-0.5 hover:text-gray-300 hover:no-underline`}>{destinationExchange ? destinationExchange?.display_name : destinationNetwork?.display_name}</span>
                                                                            </Link>
                                                                            :
                                                                            <span className={`mx-0.5`}>{destinationExchange ? destinationExchange?.display_name : destinationNetwork?.display_name}</span>
                                                                    }
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap text-sm mr-4 text-primary-text">
                                                    <ChevronRight />
                                                </td>
                                            </tr>
                                        )
                                    }
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export function DestTxStatus(swap: Swap) {
    const swapStatus = swap?.status;
    const input_transaction = swap?.transactions?.find(t => t?.type == TransactionType.Input);
    if (swapStatus == SwapStatus.LsTransferPending) {
        return <div className="flex items-center space-x-1 px-2 py-1 rounded-lg text-warning-foreground bg-warning-background">
            <span className="w-3 h-3 rounded-full bg-warning-foreground"></span>
            <span className="font-medium md:text-sm text-base">In Progress</span>
        </div>
    } else if (swapStatus == SwapStatus.Failed && input_transaction) {
        return <div className="flex items-center space-x-1 px-2 py-1 rounded-lg text-error-foreground bg-error-background">
            <span className="font-medium md:text-sm text-base">Failed</span>
        </div>
    } else if (swapStatus == SwapStatus.Refunded) {
        return <div className="flex items-center space-x-1 px-2 py-1 rounded-lg text-error-foreground bg-error-background">
            <span className="font-medium md:text-sm text-base">Refunded</span>
        </div>
    } else if (swapStatus == SwapStatus.Completed) {
        return <div className="flex items-center space-x-1 px-2 py-1 rounded-lg text-success-foreground bg-success-background">
            <CheckCircleFilled className="w-3.5 h-3.5" />
            <span className="font-medium md:text-sm text-base">Completed</span>
        </div>
    }
}