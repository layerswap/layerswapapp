import Image from "next/image";
import { Fuel, Info } from "lucide-react";
import { FC, useMemo } from "react";
import { Layer } from "../../../Models/Layer";
import { useSettingsState } from "../../../context/settings";
import { truncateDecimals } from "../../utils/RoundDecimals";
import shortenAddress, { shortenEmail } from "../../utils/ShortenAddress";
import LayerSwapApiClient, { WithdrawType } from "../../../lib/layerSwapApiClient";
import { ApiResponse } from "../../../Models/ApiResponse";
import { Partner } from "../../../Models/Partner";
import useSWR from 'swr'
import { useQueryState } from "../../../context/query";
import { NetworkCurrency } from "../../../Models/CryptoNetwork";
import { Exchange } from "../../../Models/Exchange";
import NetworkGas from "../Withdraw/Wallet/WalletTransfer/networkGas";
import { Fee } from "../../../context/feeContext";
import ResizablePanel from "../../ResizablePanel";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../shadcn/tooltip";
import ClickTooltip from "../../Tooltips/ClickTooltip";
import useWindowDimensions from "../../../hooks/useWindowDimensions";

type SwapInfoProps = {
    sourceCurrency: NetworkCurrency,
    destinationCurrency: NetworkCurrency,
    source: Layer,
    destination: Layer;
    requestedAmount: number | undefined;
    receiveAmount: number | undefined;
    destinationAddress: string;
    hasRefuel?: boolean;
    refuelAmount?: number;
    fee?: Fee,
    exchange_account_connected: boolean;
    exchange_account_name?: string;
    destExchange?: Exchange;
    sourceExchange?: Exchange;
    sourceAccountAddress: string;
    withdrawType: WithdrawType | undefined
}

const Summary: FC<SwapInfoProps> = ({ sourceAccountAddress, sourceCurrency, destinationCurrency, source: from, destination: to, requestedAmount, destinationAddress, hasRefuel, refuelAmount, destExchange, sourceExchange, receiveAmount, fee, withdrawType }) => {
    const { resolveImgSrc } = useSettingsState()
    const { isMobile } = useWindowDimensions()
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

    const requestedAmountInUsd = requestedAmount && (sourceCurrency?.usd_price * requestedAmount).toFixed(2)
    const receiveAmountInUsd = receiveAmount ? (destinationCurrency?.usd_price * receiveAmount).toFixed(2) : undefined
    const nativeCurrency = refuelAmount && to.assets.find(c => c.is_native)

    const truncatedRefuelAmount = nativeCurrency && (hasRefuel && refuelAmount) ?
        truncateDecimals(refuelAmount, nativeCurrency?.precision) : null
    const refuelAmountInUsd = nativeCurrency && ((nativeCurrency?.usd_price || 1) * (truncatedRefuelAmount || 0)).toFixed(2)

    const destAddress = (hideAddress && hideTo && account) ? account : destinationAddress
    const displayFee = withdrawType === WithdrawType.Manually ? fee?.manualFeeInUsd : fee?.walletFeeInUsd

    return (
        <ResizablePanel>
            <div className="bg-secondary-700 rounded-lg px-3 py-4 border border-secondary-500 w-full relative z-10 space-y-4">

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
                                <p className="text-primary-text text-sm">{truncateDecimals(requestedAmount, sourceCurrency.precision)} {sourceCurrency.display_asset ?? sourceCurrency.asset}</p>
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
                                    <p className="text-primary-text text-sm">{truncateDecimals(receiveAmount, destinationCurrency.precision)} {destinationCurrency.display_asset ?? destinationCurrency.asset}</p>
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
                                    <p className="text-primary-text text-sm">{truncatedRefuelAmount} {nativeCurrency.display_asset ?? nativeCurrency?.asset}</p>
                                    <p className="text-secondary-text text-sm flex justify-end">${refuelAmountInUsd}</p>
                                </div>
                            </div>
                            :
                            <></>
                    }
                </div>
            </div>
            <div className="flex flex-col w-full gap-1 pt-2 px-1">
                {
                    displayFee && (
                        isMobile ?
                            <div className="flex flex-row justify-between w-full items-center text-sm cursor-default">
                                <div className="flex items-center">
                                    <p>Fee</p>
                                    <ClickTooltip text={<FeeTooltip fee={fee} withdrawType={withdrawType} />} />
                                </div>
                                <p className="text-primary-actionButtonText">${truncateDecimals(displayFee, 2)}</p>
                            </div>
                            :
                            <Tooltip>
                                <TooltipTrigger>
                                    <div className="flex flex-row justify-between w-full items-center text-sm cursor-default">
                                        <p>Fee</p>
                                        <p className="text-primary-actionButtonText">${truncateDecimals(displayFee, 2)}</p>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <FeeTooltip fee={fee} withdrawType={withdrawType} />
                                </TooltipContent>
                            </Tooltip>
                    )
                }
                {
                    from && sourceCurrency &&
                    <NetworkGas network={from} selected_currency={sourceCurrency} />
                }
            </div>
        </ResizablePanel>
    )
}

const FeeTooltip = ({ withdrawType, fee }: { withdrawType: WithdrawType | undefined, fee: Fee | undefined }) => {


    return (
        <div className="max-w-sm p-2 space-y-3">
            {
                withdrawType === WithdrawType.Manually &&
                <div className="min-w-60 ">
                    <div className="flex flex-col gap-1 w-full text-base">
                        {
                            fee?.walletFeeInUsd && <div className="flex items-center justify-between">
                                <p>
                                    Bridge fee
                                </p>
                                <p className="text-primary-buttonTextColor">
                                    ${truncateDecimals(fee.walletFeeInUsd, 2)}
                                </p>
                            </div>
                        }
                        {
                            fee?.manualFeeInUsd && fee.walletFeeInUsd && <div className="flex items-center justify-between">
                                <p>
                                    Deposit address fee
                                </p>
                                <p className="text-primary-buttonTextColor">
                                    ${truncateDecimals(fee.manualFeeInUsd - fee.walletFeeInUsd, 2)}
                                </p>
                            </div>
                        }
                    </div>
                    <hr className="border-secondary-500 mt-4" />
                </div>
            }
            <div className="text-sm">
                Bridge fee is paid to Layerswap to provide the best experience. It i already included in the quote.
            </div>
        </div>
    )
}

export default Summary