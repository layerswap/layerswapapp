
'use client'
import useSWR from "swr"
import LayerSwapApiClient, { SwapResponse, TransactionType } from "@/lib/apiClients/layerSwapApiClient"
import { ApiResponse } from "@/Models/ApiResponse"
import { useInitialSettings } from "@/context/settings"
import { Partner } from "@/Models/Partner"
import { ChevronRightIcon } from 'lucide-react'
import StatusIcon from "./StatusIcons"
import { FC } from "react"
import { SwapStatus } from "@/Models/SwapStatus";
import { Wallet } from "@/types/wallet";
import { ImageWithFallback } from "@/components/Common/ImageWithFallback";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip"

type SwapInfoProps = {
    className?: string,
    swapResponse: SwapResponse,
    wallets: Wallet[]
}
const HistorySummary: FC<SwapInfoProps> = ({
    swapResponse,
    className
}) => {

    const {
        hideFrom,
        hideTo,
        appName
    } = useInitialSettings()

    const layerswapApiClient = new LayerSwapApiClient()
    const { data: partnerData } = useSWR<ApiResponse<Partner>>(appName && `/internal/apps?name=${appName}`, layerswapApiClient.fetcher)
    const partner = partnerData?.data
    const { swap, quote } = swapResponse

    const { source_network, destination_network, source_token, destination_token, source_exchange, destination_exchange, requested_amount } = swap || {}

    const source = hideFrom ? partner : (source_exchange || source_network)
    const destination = hideTo ? partner : (destination_exchange || destination_network)

    const destinationTransaction = swap.transactions?.find(t => t.type === TransactionType.Output)
    const calculatedReceiveAmount = destinationTransaction?.amount ?? quote?.receive_amount

    return (
        source_token && <>
            <div className={`${className || ""} bg-secondary-500 relative z-10 w-full rounded-xl overflow-hidden hover:bg-secondary-400`}>
                <div className="grid grid-cols-12 items-center gap-2 relative z-50">
                    <div className="col-span-6 flex items-center gap-2 p-3">
                        <div className="w-8 h-8 relative">
                            <div className="h-[30px] w-[30px] rounded-full overflow-hidden">
                                <ImageWithFallback
                                    src={source_token.logo}
                                    alt={`${source_token.symbol} logo`}
                                    width={30}
                                    height={30}
                                    className="rounded-full"
                                />
                            </div>
                            {source?.logo && (
                                <div className="absolute -bottom-0.5 -right-1 h-[18px] w-[18px] rounded-md overflow-hidden border border-secondary-500">
                                    <ImageWithFallback
                                        src={source.logo}
                                        alt={`${source.display_name} badge`}
                                        width={18}
                                        height={18}
                                        className=""
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex min-w-0 flex-col items-start space-y-0.5 overflow-hidden">
                            <div className="text-primary-text text-sm sm:text-lg leading-5 flex items-center min-w-0 gap-1 w-full">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="truncate block shrink">
                                            {requested_amount.toLocaleString('en-US', { maximumFractionDigits: 20 })}
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {requested_amount}
                                    </TooltipContent>
                                </Tooltip>

                                <span className="shrink-0">{source_token.symbol}</span>
                            </div>

                            <span className="text-secondary-text text-sm text-left leading-3.5">
                                {source?.display_name || ""}
                            </span>
                        </div>
                    </div>

                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none -z-10">
                        <div className="h-7 w-6 rounded-md bg-secondary-400 flex items-center justify-center">
                            <ChevronRightIcon className="h-5 w-5 text-primary-text" />
                        </div>
                    </div>

                    <div className="col-span-6 flex items-center justify-end gap-2 bg-secondary-400 p-3 rounded-xl">
                        <div className="flex min-w-0 flex-col items-end space-y-0.5 overflow-hidden">
                            <div className="text-primary-text text-sm sm:text-lg leading-5 flex items-center min-w-0 gap-1 w-full justify-end">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="truncate block shrink">
                                            {calculatedReceiveAmount.toLocaleString('en-US', { maximumFractionDigits: 20 })}
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {calculatedReceiveAmount}
                                    </TooltipContent>
                                </Tooltip>

                                <span className="shrink-0">{destination_token.symbol}</span>
                            </div>

                            <span className="text-secondary-text text-sm text-right leading-3.5">
                                {destination?.display_name || ""}
                            </span>
                        </div>

                        <div className="relative w-8 h-8">
                            <div className="h-[30px] w-[30px] rounded-full overflow-hidden">
                                <ImageWithFallback
                                    src={destination_token.logo}
                                    alt={`${destination_token.symbol} logo`}
                                    width={30}
                                    height={30}
                                    className="rounded-full"
                                />
                            </div>
                            {destination?.logo && (
                                <div className="absolute -bottom-0.5 -right-1 h-[18px] w-[18px] rounded-md overflow-hidden border border-secondary-500">
                                    <ImageWithFallback
                                        src={destination.logo}
                                        alt={`${destination.display_name} badge`}
                                        width={18}
                                        height={18}
                                        className=""
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {
                swap.status !== SwapStatus.Completed &&
                <div className="-mt-2 z-0 relative">
                    <StatusIcon swap={swap} withBg />
                </div>
            }
        </>
    )
}

export default HistorySummary