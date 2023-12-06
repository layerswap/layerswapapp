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
import { useSwapDataState } from "../../../context/swap";
import { NetworkCurrency } from "../../../Models/CryptoNetwork";

type SwapInfoProps = {
    currency: NetworkCurrency,
    source: Layer,
    destination: Layer;
    requestedAmount: number;
    receiveAmount?: number;
    destinationAddress: string;
    hasRefuel?: boolean;
    refuelAmount?: number;
    fee?: number,
    exchange_account_connected: boolean;
    exchange_account_name?: string;
}

const Summary: FC<SwapInfoProps> = ({ currency, source: from, destination: to, requestedAmount, receiveAmount, destinationAddress, hasRefuel, refuelAmount, fee, exchange_account_connected, exchange_account_name }) => {
    const { resolveImgSrc, layers } = useSettingsState()
    const { getWithdrawalProvider: getProvider } = useWallet()
    const provider = useMemo(() => {
        return from && getProvider(from)
    }, [from, getProvider])

    const wallet = provider?.getConnectedWallet()

    const { selectedAssetNetwork } = useSwapDataState()

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

    const requestedAmountInUsd = (currency?.usd_price * requestedAmount).toFixed(2)
    const receiveAmountInUsd = receiveAmount ? (currency?.usd_price * receiveAmount).toFixed(2) : undefined
    const nativeCurrency = refuelAmount && to?.isExchange === false ?
        from.assets.find(c => c.is_native) : null

    const truncatedRefuelAmount = (hasRefuel && refuelAmount) ?
        truncateDecimals(refuelAmount, nativeCurrency?.precision) : null
    const refuelAmountInUsd = ((nativeCurrency?.usd_price || 1) * (truncatedRefuelAmount || 0)).toFixed(2)

    let sourceAccountAddress = ""
    if (hideFrom && account) {
        sourceAccountAddress = shortenAddress(account);
    }
    else if (wallet && !from?.isExchange) {
        sourceAccountAddress = shortenAddress(wallet.address);
    }
    else if (from?.internal_name === KnownInternalNames.Exchanges.Coinbase && exchange_account_connected) {
        sourceAccountAddress = shortenEmail(exchange_account_name, 10);
    }
    else if (from?.isExchange) {
        sourceAccountAddress = "Exchange"
    }
    else {
        sourceAccountAddress = "Network"
    }

    const destAddress = (hideAddress && hideTo && account) ? account : destinationAddress
    const sourceCurrencyName = currency?.asset
    const destCurrencyName = layers?.find(n => n.internal_name === to?.internal_name)?.assets?.find(c => c?.asset === currency?.asset)?.asset || currency?.asset

    return (
        <div>
            <div className="font-normal flex flex-col w-full relative z-10 space-y-4">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                        {source && <Image src={resolveImgSrc(source)} alt={source.display_name} width={32} height={32} className="rounded-full" />}
                        <div>
                            <p className="text-primary-text text-sm leading-5">{source?.display_name}</p>
                            {
                                sourceAccountAddress &&
                                <p className="text-sm text-secondary-text">{sourceAccountAddress}</p>
                            }
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <p className="text-primary-text text-sm">{truncateDecimals(requestedAmount, currency.precision)} {sourceCurrencyName}</p>
                        <p className="text-secondary-text text-sm flex justify-end">${requestedAmountInUsd}</p>
                    </div>
                </div>
                <div className="flex items-center justify-between  w-full ">
                    <div className="flex items-center gap-3">
                        {destination && <Image src={resolveImgSrc(destination)} alt={destination.display_name} width={32} height={32} className="rounded-full" />}
                        <div>
                            <p className="text-primary-text text-sm leading-5">{destination?.display_name}</p>
                            <p className="text-sm text-secondary-text">{shortenAddress(destAddress as string)}</p>
                        </div>
                    </div>
                    {
                        fee != undefined && receiveAmount != undefined && fee >= 0 ?
                            <div className="flex flex-col justify-end">
                                <p className="text-primary-text text-sm">{truncateDecimals(receiveAmount, currency.precision)} {destCurrencyName}</p>
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
                    refuelAmount &&
                    <div
                        className="flex items-center justify-between w-full ">
                        <div className='flex items-center gap-3 text-sm'>
                            <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full p-2 bg-primary/20">
                                <Fuel className="h-5 w-5 text-primary" aria-hidden="true" />
                            </span>
                            <p>Refuel</p>
                        </div>
                        <div className="flex flex-col">
                            <p className="text-primary-text text-sm">{truncatedRefuelAmount} {nativeCurrency?.asset}</p>
                            <p className="text-secondary-text text-sm flex justify-end">${refuelAmountInUsd}</p>
                        </div>
                    </div>
                }
            </div>
        </div>
    )
}



export default Summary