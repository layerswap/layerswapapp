
import useSWR from "swr"
import LayerSwapApiClient, { SwapResponse, TransactionType } from "../../lib/layerSwapApiClient"
import { ApiResponse } from "../../Models/ApiResponse"
import Image from 'next/image';
import { useQueryState } from "../../context/query"
import { Partner } from "../../Models/Partner"
import { addressEnding, shortenEmail } from "../utils/ShortenAddress"
import KnownInternalNames from "../../lib/knownIds"
import { ChevronRightIcon } from 'lucide-react'
import StatusIcon from "./StatusIcons"
import { FC } from "react"
import { findIndexOfFirstNonZeroAfterComma, truncateDecimalsToFloor } from "../utils/RoundDecimals";
import useWallet from "../../hooks/useWallet";
import AddressIcon from "../AddressIcon";
import { addressFormat } from "../../lib/address/formatter";
import { SwapStatus } from "../../Models/SwapStatus";

type SwapInfoProps = {
    swapResponse: SwapResponse,
}
const Summary: FC<SwapInfoProps> = ({
    swapResponse,
}) => {

    const {
        hideFrom,
        hideTo,
        account,
        appName,
        hideAddress
    } = useQueryState()

    const { wallets } = useWallet()

    const layerswapApiClient = new LayerSwapApiClient()
    const { data: partnerData } = useSWR<ApiResponse<Partner>>(appName && `/apps?name=${appName}`, layerswapApiClient.fetcher)
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

    const source_wallet = sourceAddressFromInput ? wallets.find(w => (addressFormat(w.address, source_network) === addressFormat(sourceAddressFromInput, source_network))) : null
    const destination_wallet = wallets.find(w => addressFormat(w.address, destination_network) === addressFormat(destAddress, destination_network))

    return (
        source_token && <>
            <div className="bg-secondary-700 p-3 w-full relative z-10 font-normal space-y-3 hover:bg-secondary-600 rounded-xl overflow-hidden cursor-pointer">
                <div className="flex gap-3 w-full items-center">
                    {source?.display_name !== destination?.display_name ?
                        <div className="h-11 w-11 relative min-w-11">
                            {
                                source &&
                                <Image
                                    src={source.logo}
                                    alt={source.display_name}
                                    width={28}
                                    height={28}
                                    className="rounded" />
                            }
                            {
                                destination &&
                                <Image
                                    src={destination.logo}
                                    alt={destination.display_name}
                                    width={28}
                                    height={28}
                                    className="rounded absolute left-4 top-4" />
                            }
                        </div>
                        :
                        <div className="w-11 h-11">
                            {
                                source &&
                                <Image
                                    src={source.logo}
                                    alt={source.display_name}
                                    width={44}
                                    height={44}
                                    className="rounded-md" />
                            }
                        </div>
                    }
                    <div className="flex flex-col gap-0.5 w-full">

                        <div className="flex items-baseline justify-between w-full overflow-hidden">
                            <p className="text-secondary-text text-base truncate max-w-[55%]">
                                {
                                    source?.display_name === destination?.display_name ?
                                        <>
                                            <span>Swap in</span> <span>{source?.display_name}</span>
                                        </>
                                        :
                                        <>
                                            <span>{source?.display_name} </span> <span>to</span> <span>{destination?.display_name}</span>
                                        </>
                                }
                            </p>

                            <p className="font-light text-secondary-text text-sm">{truncateDecimalsToFloor(sourceTransaction?.amount || swap.requested_amount, findIndexOfFirstNonZeroAfterComma((0.01 / Number(source_token?.price_in_usd.toFixed()))) || 0)} {source_token.symbol}</p>
                        </div>
                        <div className="flex w-full justify-between items-start text-end">
                            <div className="flex items-center gap-0.5">
                                {
                                    sourceAccountAddress &&
                                    <div className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-secondary-950 rounded-md">
                                        {
                                            source_wallet?.icon ?
                                                <source_wallet.icon className="h-3.5 w-3.5" />
                                                :
                                                (
                                                    sourceAddressFromInput && !source_exchange ?
                                                        <div className='flex bg-secondary-400 text-primary-text  items-center justify-center rounded h-3.5 overflow-hidden w-3.5'>
                                                            <AddressIcon className="scale-150 h-3.5 w-3.5" address={sourceAddressFromInput} size={14} />
                                                        </div>
                                                        :
                                                        null
                                                )
                                        }
                                        <p className="text-secondary-text text-xs">{sourceAccountAddress}</p>
                                    </div>
                                }
                                {
                                    addressFormat(destAddress, destination_network) !== (sourceAddressFromInput ? addressFormat(sourceAddressFromInput, source_network) : null) &&
                                    <>
                                        <ChevronRightIcon className="h-3 w-3" />
                                        <div className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-secondary-950 rounded-md">
                                            {
                                                destination_wallet?.icon ?
                                                    <destination_wallet.icon className="h-3.5 w-3.5" />
                                                    :
                                                    !destination_exchange &&
                                                    <div className='flex bg-secondary-400 text-primary-text  items-center justify-center rounded h-3.5 overflow-hidden w-3.5'>
                                                        <AddressIcon className="scale-150 h-3.5 w-3.5" address={destAddress} size={14} />
                                                    </div>
                                            }
                                            <p className="text-secondary-text text-xs">{destination_exchange ? 'Exchange' : addressEnding(destAddress)}</p>
                                        </div>

                                    </>
                                }
                            </div>
                            <p className="font-medium text-primary-text text-lg leading-5">{truncateDecimalsToFloor(calculatedReceiveAmount, findIndexOfFirstNonZeroAfterComma((0.01 / Number(destination_token?.price_in_usd.toFixed()))) || 0)} {destination_token.symbol}</p>
                        </div>
                    </div>
                </div>
                {
                    swap.status !== SwapStatus.Completed &&
                    <StatusIcon swap={swap} withBg />
                }
            </div>
        </>
    )
}

export default Summary