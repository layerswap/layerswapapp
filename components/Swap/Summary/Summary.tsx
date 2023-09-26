import Image from "next/image";
import { ArrowDown, Fuel } from "lucide-react";
import { useAccount } from "wagmi";
import { FC } from "react";
import { Currency } from "../../../Models/Currency";
import { Layer } from "../../../Models/Layer";
import { useSettingsState } from "../../../context/settings";
import { truncateDecimals } from "../../utils/RoundDecimals";
import shortenAddress, { shortenEmail } from "../../utils/ShortenAddress";
import { useQueryState } from "../../../context/query";
import LayerSwapApiClient from "../../../lib/layerSwapApiClient";
import { ApiResponse } from "../../../Models/ApiResponse";
import { Partner } from "../../../Models/Partner";
import useSWR from 'swr'
import { GetDefaultNetwork } from "../../../helpers/settingsHelper";
import { useWalletState } from "../../../context/wallet";
import KnownInternalNames from "../../../lib/knownIds";
import { NetworkType } from "../../../Models/CryptoNetwork";

type SwapInfoProps = {
    currency: Currency,
    source: Layer,
    destination: Layer;
    requestedAmount: number;
    receiveAmount: number;
    destinationAddress: string;
    hasRefuel?: boolean;
    refuelAmount?: number;
    fee: number,
    exchange_account_connected: boolean;
    exchange_account_name?: string;
}

const Summary: FC<SwapInfoProps> = ({ currency, source: from, destination: to, requestedAmount, receiveAmount, destinationAddress, hasRefuel, refuelAmount, fee, exchange_account_connected, exchange_account_name }) => {
    const { resolveImgSrc, currencies, networks } = useSettingsState()
    const { address: evmAddress } = useAccount();
    const { starknetAccount, imxAccount } = useWalletState()
    const {
        hideFrom,
        hideTo,
        account,
        addressSource,
        hideAddress
    } = useQueryState()

    const layerswapApiClient = new LayerSwapApiClient()
    const { data: partnerData } = useSWR<ApiResponse<Partner>>(addressSource && `/apps?name=${addressSource}`, layerswapApiClient.fetcher)
    const partner = partnerData?.data

    const source = hideFrom ? partner : from
    const destination = hideTo ? partner : to

    const sourceDisplayName = source?.display_name
    const destinationDisplayName = destination?.display_name

    const requestedAmountInUsd = (currency?.usd_price * requestedAmount).toFixed(2)
    const receiveAmountInUsd = (currency?.usd_price * receiveAmount).toFixed(2)
    const nativeCurrency = refuelAmount && to?.isExchange === false && currencies.find(c => c.asset === to?.native_currency)
    const truncatedRefuelAmount = hasRefuel && truncateDecimals(refuelAmount, nativeCurrency?.precision)
    const refuelAmountInUsd = (nativeCurrency?.usd_price * truncatedRefuelAmount).toFixed(2)

    const sourceNetworkType = GetDefaultNetwork(from, currency?.asset)?.type
    const sourceIsImmutableX = from?.internal_name?.toUpperCase() === KnownInternalNames.Networks.ImmutableXMainnet?.toUpperCase()
        || from?.internal_name === KnownInternalNames.Networks.ImmutableXGoerli?.toUpperCase()

    let sourceAccountAddress = ""
    if (hideFrom && account) {
        sourceAccountAddress = shortenAddress(account);
    }
    else if (sourceNetworkType === NetworkType.EVM && evmAddress && !from?.isExchange) {
        sourceAccountAddress = shortenAddress(evmAddress);
    }
    else if (sourceNetworkType === NetworkType.Starknet && starknetAccount && !from?.isExchange) {
        sourceAccountAddress = shortenAddress(starknetAccount?.account?.address);
    }
    else if (from?.internal_name === KnownInternalNames.Exchanges.Coinbase && exchange_account_connected) {
        sourceAccountAddress = shortenEmail(exchange_account_name, 10);
    }
    else if (sourceIsImmutableX && imxAccount) {
        sourceAccountAddress = shortenAddress(imxAccount);
    }
    else if (from?.isExchange){
        sourceAccountAddress = "Exchange"
    }
    else {
        sourceAccountAddress = "Network"
    }

    const destAddress = (hideAddress && hideTo && account) ? account : destinationAddress
    const sourceCurrencyName = networks?.find(n => n.internal_name === from?.internal_name)?.currencies?.find(c => c?.asset === currency?.asset).name || currency?.asset
    const destCurrencyName = networks?.find(n => n.internal_name === to?.internal_name)?.currencies?.find(c => c?.asset === currency?.asset).name || currency?.asset

    return (
        <div>
            <div className="bg-secondary-700 font-normal rounded-lg px-3 py-4 flex flex-col border border-secondary-500 w-full relative z-10 space-y-4">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                        <Image src={resolveImgSrc(source)} alt={sourceDisplayName} width={32} height={32} className="rounded-full" />
                        <div>
                            <p className="text-white text-sm leading-5">{sourceDisplayName}</p>
                            {
                                sourceAccountAddress &&
                                <p className="text-sm text-primary-text">{sourceAccountAddress}</p>
                            }
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <p className="text-white text-sm">{truncateDecimals(requestedAmount, currency.precision)} {sourceCurrencyName}</p>
                        <p className="text-primary-text text-sm flex justify-end">${requestedAmountInUsd}</p>
                    </div>
                </div>
                <div className="flex items-center justify-between  w-full ">
                    <div className="flex items-center gap-3">
                        <Image src={resolveImgSrc(destination)} alt={destinationDisplayName} width={32} height={32} className="rounded-full" />
                        <div>
                            <p className="text-white text-sm leading-5">{destinationDisplayName}</p>
                            <p className="text-sm text-primary-text">{shortenAddress(destAddress)}</p>
                        </div>
                    </div>
                    {
                        fee >= 0 ?
                            <div className="flex flex-col justify-end">
                                <p className="text-white text-sm">{truncateDecimals(receiveAmount, currency.precision)} {destCurrencyName}</p>
                                <p className="text-primary-text text-sm flex justify-end">${receiveAmountInUsd}</p>
                            </div>
                            :
                            <div className="flex flex-col justify-end">
                                <div className="h-[18px] my-[5px] w-20 animate-pulse rounded bg-gray-500" />
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
                            <p className="text-white text-sm">{truncatedRefuelAmount} {nativeCurrency.asset}</p>
                            <p className="text-primary-text text-sm flex justify-end">${refuelAmountInUsd}</p>
                        </div>
                    </div>
                }
            </div>
        </div>
    )
}



export default Summary