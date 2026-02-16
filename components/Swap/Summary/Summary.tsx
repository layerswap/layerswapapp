import { ArrowDown, Fuel } from "lucide-react";
import { FC } from "react";
import { truncateDecimals } from "@/components/utils/RoundDecimals";
import LayerSwapApiClient, { Quote, SwapBasicData, SwapResponse } from "@/lib/apiClients/layerSwapApiClient";
import { ApiResponse } from "@/Models/ApiResponse";
import { Partner } from "@/Models/Partner";
import useSWR from 'swr'
import { useQueryState } from "@/context/query";
import { ImageWithFallback } from "@/components/Common/ImageWithFallback";
import NumberFlow from "@number-flow/react";
import { PriceImpact } from "@/components/Input/Amount/PriceImpact";
import { Token } from "@/Models/Network";

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
        appName
    } = useQueryState()

    const layerswapApiClient = new LayerSwapApiClient()
    const { data: partnerData } = useSWR<ApiResponse<Partner>>(appName && `/internal/apps?name=${appName}`, layerswapApiClient.fetcher)
    const partner = partnerData?.data

    const source = (hideFrom && partner && account) ? partner : from
    const destination = (hideTo && partner && account) ? partner : to

    const requestedAmountInUsd = requestedAmount && (sourceCurrency?.price_in_usd * Number(requestedAmount)).toFixed(2)
    const receiveAmountInUsd = receiveAmount ? (destinationCurrency?.price_in_usd * receiveAmount).toFixed(2) : undefined
    const nativeCurrency = refuel?.token

    const truncatedRefuelAmount = nativeCurrency && !!refuel ?
        truncateDecimals(refuel.amount, nativeCurrency?.precision) : null
    const refuelAmountInUsd = nativeCurrency && ((nativeCurrency?.price_in_usd || 1) * (Number(truncatedRefuelAmount) || 0)).toFixed(2)

    return (
        <div className="bg-secondary-500 rounded-2xl px-3 py-4 w-full relative z-10 space-y-4">

            <div className="font-normal flex flex-col w-full relative z-10 space-y-3">
                <div className="w-full grid grid-cols-10">
                    <RouteTokenPair
                        route={sourceExchange || source}
                        token={sourceCurrency}
                    />
                    <div className="flex flex-col col-start-6 col-span-6 items-end min-w-0">
                        {
                            requestedAmount &&
                            <p className="text-primary-text text-xl leading-6 font-normal flex items-center justify-end min-w-0 w-full">
                                <span className="truncate min-w-0">{truncateDecimals(Number(requestedAmount), sourceCurrency.precision)}</span>
                                <span className="shrink-0">{` ${sourceCurrency.symbol}`}</span>
                            </p>
                        }
                        <p className="text-secondary-text text-sm leading-5 flex font-medium justify-end"><NumberFlow value={requestedAmountInUsd || 0} prefix="$" trend={0} /></p>
                    </div>
                </div>
                <div className="relative text-secondary-text">
                    <hr className="border border-secondary-400 w-full rounded-full" />
                    <ArrowDown className="absolute left-1/2 -translate-x-1/2 top-[-10px] h-6 w-6 p-1 bg-secondary-400 rounded-md text-secondary-text" />
                </div>
                <div className="w-full grid grid-cols-10">
                    <RouteTokenPair
                        route={destination}
                        token={destinationCurrency}
                    />
                    {
                        receiveAmount && (
                            <div className="flex flex-col justify-end items-end w-full col-start-7 col-span-4 h-[44px]">
                                <p className="text-primary-text text-xl font-normal text-end">
                                    <NumberFlow value={receiveAmount} suffix={` ${destinationCurrency.symbol}`} trend={0} format={{ maximumFractionDigits: quote.quote.destination_token?.decimals || 2 }} />
                                </p>
                                <p className="text-secondary-text text-sm flex items-center gap-1 font-medium">
                                    <PriceImpact className="text-sm" quote={swapQuote} refuel={refuel} />
                                    <NumberFlow value={receiveAmountInUsd || 0} prefix="$" trend={0} />
                                </p>
                            </div>
                        )
                    }
                </div>
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

type RouteTokenPairProps = {
    route: { logo: string, display_name: string },
    token: Token,
}

const RouteTokenPair: FC<RouteTokenPairProps> = ({ route, token }) => {

    return (
        <div className="flex grow gap-4 text-left items-center md:text-base relative col-span-5 align-center">
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
            <div className="text-primary-text overflow-hidden">
                <p className="text-xl leading-6 font-normal">{token.symbol}</p>
                <p className="text-secondary-text text-sm truncate whitespace-nowrap font-medium leading-5">
                    {route.display_name}
                </p>
            </div>
        </div>
    )
}

export default Summary