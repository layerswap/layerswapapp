
import useSWR from "swr"
import LayerSwapApiClient, { SwapItem, TransactionType } from "../../lib/layerSwapApiClient"
import { ApiResponse } from "../../Models/ApiResponse"
import { useSettingsState } from "../../context/settings"
import Image from 'next/image';
import { truncateDecimals } from "../utils/RoundDecimals"
import { useSwapDataState } from "../../context/swap"
import { useQueryState } from "../../context/query"
import { Currency } from "../../Models/Currency"
import { Layer } from "../../Models/Layer"
import { Partner } from "../../Models/Partner"
import shortenAddress, { shortenEmail } from "../utils/ShortenAddress"
import KnownInternalNames from "../../lib/knownIds"
import { ChevronRightIcon } from 'lucide-react'
import StatusIcon from "../SwapHistory/StatusIcons"
import { FC } from "react"

type SwapInfoProps = {
    currency: Currency,
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
    swap: SwapItem
}
const Summary: FC<SwapInfoProps> = ({ swap, currency, source: from, destination: to, requestedAmount, receiveAmount, destinationAddress, hasRefuel, refuelAmount, fee, exchange_account_connected, exchange_account_name }) => {
    const { resolveImgSrc } = useSettingsState()
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

    const sourceAddressFromInput = swap.transactions.find(t => t.type === TransactionType.Input)?.from;

    let sourceAccountAddress = ""
    if (sourceAddressFromInput) {
        sourceAccountAddress = shortenAddress(sourceAddressFromInput)
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
    const sourceCurrencyName = selectedAssetNetwork?.network?.currencies.find(c => c.asset === currency.asset)?.name || currency?.asset

    return (<>
        <div className="bg-secondary-800 rounded-lg cursor-pointer border border-secondary-500">
            <div className="bg-secondary-700 rounded-lg px-3 py-4 border border-secondary-500 w-full relative z-10 space-y-4">
                <div className="font-normal flex flex-col w-full relative z-10 space-y-4">
                    <div className="grid grid-cols-11 items-center w-full">
                        <div className="flex col-span-5 items-center gap-3 grow">
                            {
                                source &&
                                <Image
                                    src={resolveImgSrc(source)}
                                    alt={source.display_name}
                                    width={32}
                                    height={32}
                                    className="rounded-full" />
                            }
                            <div>
                                <p className="text-primary-text text-sm leading-5">
                                    {source?.display_name}
                                </p>
                                <p className="text-secondary-text text-sm">{sourceAccountAddress}</p>
                            </div>
                        </div>
                        <div><ChevronRightIcon className="text-secondary-text/30" /></div>
                        <div className="flex col-span-5 items-center gap-3 grow">
                            {destination && <Image src={resolveImgSrc(destination)} alt={destination.display_name} width={32} height={32} className="rounded-full" />}
                            <div>
                                <p className="text-primary-text text-sm leading-5">{destination?.display_name}</p>
                                <p className="text-sm text-secondary-text">{shortenAddress(destAddress as string)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="px-3 py-2">
                <span className="grow w-full grid grid-cols-11 items-center text-sm font-normal">
                    <span className="col-span-5 text-secondary-text/60">
                        <div>{truncateDecimals(requestedAmount, currency.precision)} {sourceCurrencyName}</div>
                    </span>
                    <span className="col-start-7 col-span-5 opacity-60 text-secondary-text">{<StatusIcon swap={swap} />}</span>
                </span>
            </div>
        </div>
    </>)
}

export default Summary
