import Image from "next/image";
import { Fuel } from "lucide-react";
import { FC, useMemo } from "react";
import { Layer } from "../../../Models/Layer";
import { useSettingsState } from "../../../context/settings";
import { truncateDecimals } from "../../utils/RoundDecimals";
import shortenAddress, { shortenEmail } from "../../utils/ShortenAddress";
import LayerSwapApiClient from "../../../lib/layerSwapApiClient";
import { ApiResponse } from "../../../Models/ApiResponse";
import { Partner } from "../../../Models/Partner";
import useSWR from 'swr'
import KnownInternalNames from "../../../lib/knownIds";
import useWallet from "../../../hooks/useWallet";
import { useQueryState } from "../../../context/query";
import { Token } from "../../../Models/Network";
import { Exchange } from "../../../Models/Exchange";

type SwapInfoProps = {
    sourceCurrency: Token,
    destinationCurrency: Token,
    source: Layer,
    destination: Layer;
    requestedAmount: number | undefined;
    receiveAmount: number | undefined;
    destinationAddress: string;
    hasRefuel?: boolean;
    refuelAmount?: number;
    fee?: number,
    exchange_account_connected: boolean;
    exchange_account_name?: string;
    destExchange?: Exchange;
    sourceExchange?: Exchange;
    sourceAccountAddress: string
}

const Summary: FC<SwapInfoProps> = ({ sourceAccountAddress, sourceCurrency, destinationCurrency, source: from, destination: to, requestedAmount, destinationAddress, hasRefuel, refuelAmount, exchange_account_connected, exchange_account_name, destExchange, sourceExchange, receiveAmount }) => {
    const { resolveImgSrc } = useSettingsState()

    const {
        hideFrom,
        hideTo,
        account,
        appName,
        hideAddress
    } = useQueryState()

    const layerswapApiClient = new LayerSwapApiClient()
    const { data: partnerData } = useSWR<ApiResponse<Partner>>(appName && `/apps?name=${appName}`, layerswapApiClient.fetcher)
    const partner = partnerData?.data

    const source = hideFrom ? partner : from
    const destination = hideTo ? partner : to

    const requestedAmountInUsd = requestedAmount && (sourceCurrency?.price_in_usd * requestedAmount).toFixed(2)
    const receiveAmountInUsd = receiveAmount ? (destinationCurrency?.price_in_usd * receiveAmount).toFixed(2) : undefined
    const nativeCurrency = refuelAmount && to.assets.find(c => c.is_native)

    const truncatedRefuelAmount = nativeCurrency && (hasRefuel && refuelAmount) ?
        truncateDecimals(refuelAmount, nativeCurrency?.precision) : null
    const refuelAmountInUsd = nativeCurrency && ((nativeCurrency?.price_in_usd || 1) * (truncatedRefuelAmount || 0)).toFixed(2)

    const destAddress = (hideAddress && hideTo && account) ? account : destinationAddress

    return (
        <div>
            <div className="font-normal flex flex-col w-full relative z-10 space-y-4">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                        {sourceExchange ?
                            <Image src={resolveImgSrc(sourceExchange)} alt={sourceExchange.display_name} width={32} height={32} className="rounded-lg" />
                            : source ?
                                <Image src={resolveImgSrc(source)} alt={source.display_name} width={32} height={32} className="rounded-lg" />
                                :
                                null
                        }
                        <div>
                            <p className="text-primary-text text-sm leading-5">{sourceExchange ? sourceExchange?.display_name : source?.display_name}</p>
                            {sourceExchange ?
                                <p className="text-sm text-secondary-text">Exchange</p>
                                : sourceAccountAddress ?
                                    <p className="text-sm text-secondary-text">{sourceAccountAddress}</p>
                                    :
                                    null
                            }
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        {
                            requestedAmount &&
                            <p className="text-primary-text text-sm">{truncateDecimals(requestedAmount, sourceCurrency.precision)} {sourceCurrency.symbol}</p>
                        }
                        <p className="text-secondary-text text-sm flex justify-end">${requestedAmountInUsd}</p>
                    </div>
                </div>
                <div className="flex items-center justify-between  w-full ">
                    <div className="flex items-center gap-3">
                        {destExchange ?
                            <Image src={resolveImgSrc(destExchange)} alt={destExchange.display_name} width={32} height={32} className="rounded-lg" />
                            : destination ?
                                <Image src={resolveImgSrc(destination)} alt={destination.display_name} width={32} height={32} className="rounded-lg" />
                                :
                                null
                        }
                        <div>
                            <p className="text-primary-text text-sm leading-5">{destExchange ? destExchange?.display_name : destination?.display_name}</p>
                            <p className="text-sm text-secondary-text">{shortenAddress(destAddress)}</p>
                        </div>
                    </div>
                    {
                        receiveAmount != undefined ?
                            <div className="flex flex-col justify-end">
                                <p className="text-primary-text text-sm">{truncateDecimals(receiveAmount, destinationCurrency.precision)} {destinationCurrency.symbol}</p>
                                <p className="text-secondary-text text-sm flex justify-end">${receiveAmountInUsd}</p>
                            </div>
                            :
                            <div className="flex flex-col justify-end">
                                <div className="h-[10px] my-[5px] w-20 animate-pulse rounded bg-gray-500" />
                                <div className="h-[10px] my-[5px] w-10 animate-pulse rounded bg-gray-500 ml-auto" />
                            </div>
                    }
                </div>
                {
                    (hasRefuel && refuelAmount != undefined && nativeCurrency) ?
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

export default Summary