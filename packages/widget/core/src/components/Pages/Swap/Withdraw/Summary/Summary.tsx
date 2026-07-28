'use client'
import { ArrowDown, Fuel } from "lucide-react";
import { FC, ReactNode } from "react";
import { truncateDecimals } from "@/components/utils/RoundDecimals";
import LayerSwapApiClient, { Quote, SwapBasicData, SwapResponse } from "@/lib/apiClients/layerSwapApiClient";
import { ApiResponse } from "@/Models/ApiResponse";
import { Partner } from "@/Models/Partner";
import useSWR from 'swr'
import { useInitialSettings } from "@/context/settings";
import { Token } from "@/Models/Network";
import { ImageWithFallback } from "@/components/Common/ImageWithFallback";
import NumFlowWithFallback from "@/components/Common/NumFlowWithFallback";
import { PriceImpact } from "@/components/Input/Amount/PriceImpact";
import { useUsdModeStore } from "@/stores/usdModeStore";

type SwapInfoProps = Omit<SwapResponse, 'quote' | 'swap'> & {
    swap: SwapBasicData
    quote: Quote,
    sourceAccountAddress: string,
    receiveAmount?: number
    quoteIsLoading: boolean
}

const Summary: FC<SwapInfoProps> = (props) => {
    const { swap, quote, receiveAmount } = props
    const { refuel, quote: swapQuote } = quote
    const { source_token: sourceCurrency, destination_token: destinationCurrency, source_network: from, destination_network: to, requested_amount: requestedAmount, destination_address: destinationAddress, source_exchange: sourceExchange } = swap
    const {
        hideFrom,
        hideTo,
        account,
        appName,
    } = useInitialSettings()

    const layerswapApiClient = new LayerSwapApiClient()
    const { data: partnerData } = useSWR<ApiResponse<Partner>>(appName && `/internal/apps?name=${appName}`, layerswapApiClient.fetcher)
    const partner = partnerData?.data

    const isUsdMode = useUsdModeStore(s => s.isUsdMode);
    const source = (hideFrom && partner && account) ? partner : from
    const destination = (hideTo && partner && account) ? partner : to

    const sourcePriceInUsd = swapQuote?.source_token?.price_in_usd ?? sourceCurrency?.price_in_usd
    const destinationPriceInUsd = swapQuote?.destination_token?.price_in_usd ?? destinationCurrency?.price_in_usd
    const requestedAmountInUsd = requestedAmount && sourcePriceInUsd ? (sourcePriceInUsd * Number(requestedAmount)).toFixed(2) : undefined
    const receiveAmountInUsd = receiveAmount && destinationPriceInUsd ? (destinationPriceInUsd * receiveAmount).toFixed(2) : undefined
    const nativeCurrency = refuel?.token

    const truncatedRefuelAmount = nativeCurrency && !!refuel ?
        truncateDecimals(refuel.amount, nativeCurrency?.precision) : null
    const refuelAmountInUsd = nativeCurrency && ((nativeCurrency?.price_in_usd || 1) * (Number(truncatedRefuelAmount) || 0)).toFixed(2)

    return (
        <div className="bg-secondary-500 rounded-2xl px-3 py-4 w-full relative z-10">

            <div className="font-normal flex flex-col w-full relative z-10 space-y-3">
                <SwapRow
                    route={sourceExchange || source}
                    token={sourceCurrency}
                    primary={requestedAmount ? (isUsdMode ? (
                        <NumFlowWithFallback value={Number(requestedAmountInUsd) || 0} prefix="$" trend={0} />
                    ) : (
                        <span>{truncateDecimals(Number(requestedAmount), sourceCurrency.precision)}{` ${sourceCurrency.symbol}`}</span>
                    )) : null}
                    secondary={requestedAmount ? (isUsdMode ? (
                        <span>{truncateDecimals(Number(requestedAmount), sourceCurrency.precision)}{` ${sourceCurrency.symbol}`}</span>
                    ) : (
                        <NumFlowWithFallback value={Number(requestedAmountInUsd) || 0} prefix="$" trend={0} />
                    )) : null}
                />
                <div className="relative text-secondary-text">
                    <hr className="border border-secondary-400 w-full rounded-full" />
                    <ArrowDown className="absolute left-1/2 -translate-x-1/2 -top-2.5 h-6 w-6 p-1 bg-secondary-400 rounded-md text-secondary-text" />
                </div>
                <SwapRow
                    route={destination}
                    token={destinationCurrency}
                    primary={receiveAmount ? (isUsdMode ? (
                        <NumFlowWithFallback value={Number(receiveAmountInUsd) || 0} prefix="$" trend={0} />
                    ) : (
                        <NumFlowWithFallback value={Number(receiveAmount) || 0} suffix={` ${destinationCurrency.symbol}`} trend={0} format={{ maximumFractionDigits: quote.quote.destination_token?.decimals || 2 }} />
                    )) : null}
                    secondary={receiveAmount ? (
                        <>
                            <PriceImpact className="text-sm" quote={swapQuote} refuel={refuel} />
                            {isUsdMode ? (
                                <NumFlowWithFallback value={Number(receiveAmount) || 0} suffix={` ${destinationCurrency.symbol}`} trend={0} format={{ maximumFractionDigits: quote.quote.destination_token?.decimals || 2 }} />
                            ) : (
                                <NumFlowWithFallback value={Number(receiveAmountInUsd) || 0} prefix="$" trend={0} />
                            )}
                        </>
                    ) : null}
                />
                {
                    (!!refuel != undefined && nativeCurrency) ?
                        <div className="flex items-center justify-between w-full ">
                            <div className='flex items-center gap-3 text-sm'>
                                <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-lg p-2 bg-primary/20">
                                    <Fuel className="h-5 w-5 text-primary" aria-hidden="true" />
                                </span>
                                <p>Refuel</p>
                            </div>
                            <div className="flex flex-col items-end">
                                <p className="text-primary-text text-sm">{truncatedRefuelAmount} {nativeCurrency?.symbol}</p>
                                <p className="text-secondary-text text-sm flex justify-end">${refuelAmountInUsd}</p>
                            </div>
                        </div>
                        :
                        <></>
                }
            </div>
        </div>
    )
}

type SwapRowProps = {
    route: { logo: string, display_name: string },
    token: Token,
    primary: ReactNode,
    secondary: ReactNode,
}

const SwapRow: FC<SwapRowProps> = ({ route, token, primary, secondary }) => {

    return (
        <div className="w-full flex items-center gap-4 text-left md:text-base min-w-0">
            <div className="inline-flex items-center relative shrink-0 h-8 w-8">
                <ImageWithFallback
                    src={token.logo}
                    alt="Token Logo"
                    height="28"
                    width="28"
                    loading="eager"
                    fetchPriority="high"
                    className="rounded-full object-contain"
                />
                <div className="absolute -right-0.5 -bottom-0.5 rounded border border-secondary-500 bg-secondary-400 overflow-hidden">
                    <ImageWithFallback
                        src={route.logo}
                        alt="Route Logo"
                        height="16"
                        width="16"
                        loading="eager"
                        fetchPriority="high"
                        className="object-contain"
                    />
                </div>
            </div>
            <div className="flex flex-col grow min-w-0">
                <div className="flex items-center gap-2 h-8">
                    <p className="text-primary-text text-xl leading-6 font-normal grow truncate min-w-0">{token.symbol}</p>
                    <div className="text-primary-text text-xl leading-6 font-normal flex items-center justify-end shrink-0 whitespace-nowrap">{primary}</div>
                </div>
                <div className="flex items-center gap-2 h-5">
                    <p className="text-secondary-text text-sm truncate whitespace-nowrap font-medium leading-5 grow min-w-0">
                        {route.display_name}
                    </p>
                    <div className="text-secondary-text text-sm flex items-center justify-end gap-1 font-medium shrink-0 whitespace-nowrap">{secondary}</div>
                </div>
            </div>
        </div>
    )
}

export default Summary