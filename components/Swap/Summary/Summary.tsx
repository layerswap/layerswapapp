import { ArrowDown, Fuel } from "lucide-react";
import { FC } from "react";
import { truncateDecimals } from "../../utils/RoundDecimals";
import LayerSwapApiClient, { Refuel } from "../../../lib/apiClients/layerSwapApiClient";
import { ApiResponse } from "../../../Models/ApiResponse";
import { Partner } from "../../../Models/Partner";
import useSWR from 'swr'
import { useQueryState } from "../../../context/query";
import { Network, Token } from "../../../Models/Network";
import { Exchange } from "../../../Models/Exchange";
import { addressFormat } from "../../../lib/address/formatter";
import { ExtendedAddress } from "../../Input/Address/AddressPicker/AddressWithIcon";
import { isValidAddress } from "../../../lib/address/validator";
import shortenAddress from "../../utils/ShortenAddress";
import { ImageWithFallback } from "@/components/Common/ImageWithFallback";

type SwapInfoProps = {
    sourceCurrency: Token,
    destinationCurrency: Token,
    source: Network,
    destination: Network;
    requestedAmount: number | undefined;
    receiveAmount: number | undefined;
    destinationAddress: string;
    refuel?: Refuel;
    fee?: number,
    exchange_account_connected: boolean;
    exchange_account_name?: string;
    destExchange?: Exchange;
    sourceExchange?: Exchange;
    sourceAccountAddress: string
}

const Summary: FC<SwapInfoProps> = ({ sourceAccountAddress, sourceCurrency, destinationCurrency, source: from, destination: to, requestedAmount, destinationAddress, refuel, exchange_account_connected, exchange_account_name, destExchange, sourceExchange, receiveAmount }) => {

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

    const source = (hideFrom && partner && account) ? partner : from
    const destination = (hideTo && partner && account) ? partner : to

    const requestedAmountInUsd = requestedAmount && (sourceCurrency?.price_in_usd * requestedAmount).toFixed(2)
    const receiveAmountInUsd = receiveAmount ? (destinationCurrency?.price_in_usd * receiveAmount).toFixed(2) : undefined
    const nativeCurrency = refuel?.token

    const truncatedRefuelAmount = nativeCurrency && !!refuel ?
        truncateDecimals(refuel.amount, nativeCurrency?.precision) : null
    const refuelAmountInUsd = nativeCurrency && ((nativeCurrency?.price_in_usd || 1) * (Number(truncatedRefuelAmount) || 0)).toFixed(2)

    const destAddress = (hideAddress && hideTo && account) ? account : destinationAddress

    return (
        <div className="font-normal flex flex-col w-full relative z-10 space-y-3">
            <div className="flex items-center justify-between w-full">
                <RouteTokenPair
                    route={sourceExchange || source}
                    exchange={sourceExchange}
                    network={from}
                    token={sourceCurrency}
                    address={sourceAccountAddress}
                />
                <div className="flex flex-col flex-1/3 items-end">
                    {
                        requestedAmount &&
                        <p className="text-primary-text text-sm">{truncateDecimals(requestedAmount, sourceCurrency.precision)} {sourceCurrency.symbol}</p>
                    }
                    <p className="text-secondary-text text-sm flex justify-end">${requestedAmountInUsd}</p>
                </div>
            </div>
            <div className="relative text-secondary-text">
                <hr className="border border-secondary-400 w-full rounded-full" />
                <ArrowDown className="absolute left-1/2 -translate-x-1/2 top-[-10px] h-6 w-6 p-1 bg-secondary-400 rounded-md text-secondary-text" />
            </div>
            <div className="flex items-center justify-between  w-full ">
                <RouteTokenPair
                    route={destExchange || destination}
                    exchange={destExchange}
                    network={to}
                    token={destinationCurrency}
                    address={destAddress}
                />
                {
                    receiveAmount != undefined ?
                        <div className="flex flex-col justify-end items-end w-full flex-1/3">
                            <p className="text-primary-text text-sm">{truncateDecimals(receiveAmount, destinationCurrency.precision)} {destinationCurrency.symbol}</p>
                            <p className="text-secondary-text text-sm">${receiveAmountInUsd}</p>
                        </div>
                        :
                        <div className="flex flex-col justify-end">
                            <div className="h-[10px] my-[5px] w-20 animate-pulse rounded-sm bg-gray-500" />
                            <div className="h-[10px] my-[5px] w-10 animate-pulse rounded-sm bg-gray-500 ml-auto" />
                        </div>
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
    )
}

const RouteTokenPair: FC<{ route: { logo: string, display_name: string }, network?: Network, exchange?: Exchange, token: Token, address?: string }> = ({ route, token, exchange, network, address }) => {
    return (
        <div className="flex grow gap-4 text-left items-center md:text-base relative">
            <div className="inline-flex items-center relative shrink-0 mb-1.5">
                <ImageWithFallback
                    src={token.logo}
                    alt="Token Logo"
                    height="32"
                    width="32"
                    loading="eager"
                    fetchPriority="high"
                    className="rounded-full object-contain"
                />
                <ImageWithFallback
                    src={route.logo}
                    alt="Route Logo"
                    height="20"
                    width="20"
                    loading="eager"
                    fetchPriority="high"
                    className="absolute -right-1.5 -bottom-1.5 object-contain rounded-md border-1 border-secondary-300"
                />
            </div>
            <div className="group-has-[.input-wide]:hidden flex flex-col font-medium text-primary-buttonTextColor overflow-hidden min-w-0">
                <span className="leading-4">{token.symbol}</span>
                <div className="flex items-center gap-1 leading-3 text-sm">
                    <p className="text-secondary-text text-sm truncate whitespace-nowrap">
                        {route.display_name}
                    </p>
                    {
                        (address && network && !exchange) ?
                            <div className="flex items-center gap-1 text-secondary-text">
                                <p>-</p>
                                {
                                    (isValidAddress(address, network) ?
                                        <div className="text-sm group/addressItem text-secondary-text">
                                            <ExtendedAddress address={addressFormat(address, network)} network={network} />
                                        </div>
                                        :
                                        <p className="text-sm text-secondary-text">{shortenAddress(address)}</p>)
                                }
                            </div>
                            : null
                    }
                </div>
            </div>
        </div>
    )
}

export default Summary