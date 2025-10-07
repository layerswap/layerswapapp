
import useSWR from "swr"
import LayerSwapApiClient, { SwapResponse, TransactionType } from "../../lib/apiClients/layerSwapApiClient"
import { ApiResponse } from "../../Models/ApiResponse"
import { useQueryState } from "../../context/query"
import { Partner } from "../../Models/Partner"
import { addressEnding, shortenEmail } from "../utils/ShortenAddress"
import KnownInternalNames from "../../lib/knownIds"
import { ChevronRightIcon } from 'lucide-react'
import StatusIcon from "./StatusIcons"
import { FC } from "react"
import { SwapStatus } from "../../Models/SwapStatus";
import { Wallet } from "../../Models/WalletProvider";
import { ImageWithFallback } from "../Common/ImageWithFallback";
import { Tooltip, TooltipContent, TooltipTrigger } from "../shadcn/tooltip"

type SwapInfoProps = {
    className?: string,
    swapResponse: SwapResponse,
    wallets: Wallet[]
}
const HistorySummary: FC<SwapInfoProps> = ({
    swapResponse,
    wallets,
    className
}) => {

    const {
        hideFrom,
        hideTo,
        account,
        appName,
        hideAddress
    } = useQueryState()

    const layerswapApiClient = new LayerSwapApiClient()
    const { data: partnerData } = useSWR<ApiResponse<Partner>>(appName && `/internal/apps?name=${appName}`, layerswapApiClient.fetcher)
    const partner = partnerData?.data
    const { swap, quote } = swapResponse

    const { source_network, destination_network, source_token, destination_token, source_exchange, destination_exchange, destination_address, exchange_account_connected, exchange_account_name, requested_amount } = swap || {}

    const source = hideFrom ? partner : (source_exchange || source_network)
    const destination = hideTo ? partner : (destination_exchange || destination_network)

    const sourceTransaction = swap.transactions?.find(t => t.type === TransactionType.Input)
    const destinationTransaction = swap.transactions?.find(t => t.type === TransactionType.Output)
    const sourceAddressFromInput = sourceTransaction?.from;
    const calculatedReceiveAmount = destinationTransaction?.amount ?? quote?.receive_amount

    let sourceAccountAddress: string | undefined = undefined
    if (source_exchange) {
        sourceAccountAddress = "Exchange"
    }
    else if (sourceAddressFromInput) {
        sourceAccountAddress = addressEnding(sourceAddressFromInput)
    }
    else if (source_network?.name === KnownInternalNames.Exchanges.Coinbase && exchange_account_connected) {
        sourceAccountAddress = shortenEmail(exchange_account_name, 10);
    }

    const destAddress = (hideAddress && hideTo && account) ? account : destination_address
    
    return (
        source_token && <>
            <div className={`${className || ""} bg-secondary-500 relative z-10 w-full rounded-xl overflow-hidden hover:bg-secondary-400`}>
                <div className="grid grid-cols-12 items-center gap-2 relative z-50">
                    <div className="col-span-6 flex items-center gap-2 p-3">
                        <div className="w-8 h-8 relative">
                            <ImageWithFallback
                                src={source_token.logo}
                                alt={`${source_token.symbol} logo`}
                                width={30}
                                height={30}
                                className="rounded-full"
                            />
                            {source?.logo && (
                                <ImageWithFallback
                                    src={source.logo}
                                    alt={`${source.display_name} badge`}
                                    width={18}
                                    height={18}
                                    className="absolute -bottom-1 -right-1 h-[18px] w-[18px] rounded-md"
                                />
                            )}
                        </div>

                        <div className="flex min-w-0 flex-col items-start space-y-0.5">
                            <span className="text-white text-lg leading-5 flex min-w-0">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="truncate overflow-hidden whitespace-nowrap max-w-[100px]">
                                            {requested_amount.toLocaleString('en-US', { maximumFractionDigits: 20 })}
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {requested_amount}
                                    </TooltipContent>
                                </Tooltip>

                                &nbsp;{source_token.symbol}
                            </span>

                            <span className="text-secondary-text text-sm leading-[14px]">
                                {source?.display_name || ""}
                            </span>
                        </div>
                    </div>

                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none -z-10">
                        <div className="h-7 w-6 rounded-md bg-secondary-400 flex items-center justify-center">
                            <ChevronRightIcon className="h-5 w-5 text-white" />
                        </div>
                    </div>

                    <div className="col-span-6 flex items-center justify-end gap-2 bg-secondary-400 p-3 rounded-xl">
                        <div className="flex min-w-0 flex-col items-end space-y-0.5">
                            <span className="text-white text-lg leading-5 flex min-w-0">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="truncate overflow-hidden whitespace-nowrap max-w-[100px]">
                                            {calculatedReceiveAmount.toLocaleString('en-US', { maximumFractionDigits: 20 })}
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {calculatedReceiveAmount}
                                    </TooltipContent>
                                </Tooltip>

                                &nbsp;{destination_token.symbol}
                            </span>

                            <span className="text-secondary-text text-sm leading-[14px]">
                                {destination?.display_name || ""}
                            </span>
                        </div>

                        <div className="relative w-8 h-8">
                            <ImageWithFallback
                                src={destination_token.logo}
                                alt={`${destination_token.symbol} logo`}
                                width={30}
                                height={30}
                                className="rounded-full"
                            />
                            {destination?.logo && (
                                <ImageWithFallback
                                    src={destination.logo}
                                    alt={`${destination.display_name} badge`}
                                    width={18}
                                    height={18}
                                    className="absolute -bottom-1 -right-1 h-[18px] w-[18px] rounded-md"
                                />
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