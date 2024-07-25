
import useSWR from "swr"
import LayerSwapApiClient, { SwapItem, TransactionType } from "../../lib/layerSwapApiClient"
import { ApiResponse } from "../../Models/ApiResponse"
import Image from 'next/image';
import { useQueryState } from "../../context/query"
import { Partner } from "../../Models/Partner"
import shortenAddress, { shortenEmail } from "../utils/ShortenAddress"
import KnownInternalNames from "../../lib/knownIds"
import { ChevronRightIcon } from 'lucide-react'
import StatusIcon from "../SwapHistory/StatusIcons"
import { FC } from "react"
import { truncateDecimals } from "../utils/RoundDecimals";

type SwapInfoProps = {
    swap: SwapItem,
}
const Summary: FC<SwapInfoProps> = ({
    swap,
}) => {

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

    const { source_network, destination_network, source_token, destination_token, source_exchange, destination_exchange, destination_address, exchange_account_connected, exchange_account_name, requested_amount } = swap || {}

    const source = hideFrom ? partner : (source_exchange || source_network)
    const destination = hideTo ? partner : (destination_exchange || destination_network)

    const sourceTransaction = swap.transactions?.find(t => t.type === TransactionType.Input)
    const sourceAddressFromInput = sourceTransaction?.from;

    let sourceAccountAddress = ""
    if (sourceAddressFromInput) {
        sourceAccountAddress = shortenAddress(sourceAddressFromInput)
    }
    else if (source_network?.name === KnownInternalNames.Exchanges.Coinbase && exchange_account_connected) {
        sourceAccountAddress = shortenEmail(exchange_account_name, 10);
    }
    else if (source_exchange) {
        sourceAccountAddress = "Exchange"
    }
    else {
        sourceAccountAddress = "Network"
    }
    const destAddress = (hideAddress && hideTo && account) ? account : destination_address

    return (source_token && <>
        <div className="bg-secondary-800 rounded-lg cursor-pointer border border-secondary-500">
            <div className="bg-secondary-700 rounded-lg px-3  border border-secondary-500 w-full relative z-10 space-y-4">
                <div className="font-normal flex flex-col w-full relative z-10 space-y-4">
                    <div className="grid grid-cols-11 items-center w-full">

                        <div className="flex col-span-5 py-4 items-center gap-3 grow">
                            {
                                source &&
                                <Image
                                    src={source.logo}
                                    alt={source.display_name}
                                    width={24}
                                    height={24}
                                    className="rounded-full" />
                            }
                            <div>
                                <p className="font-semibold text-primary-text text-base leading-5">
                                    {truncateDecimals(requested_amount, source_token.precision)} {source_token.symbol}
                                </p>
                                <p className="text-secondary-text text-sm">{source?.display_name}</p>
                            </div>
                        </div>
                        {/* <div className="relative left-[50%] w-px bg-secondary-500 h-full">
                        </div> */}
                        <ChevronRightIcon className="mx-auto text-secondary-text/30" />

                        <div className="col-start-7 flex col-span-5 items-center gap-3 grow">
                            {
                                destination &&
                                <Image
                                    src={destination.logo}
                                    alt={destination.display_name}
                                    width={24}
                                    height={24}
                                    className="rounded-full" />
                            }
                            <div>
                                <p className="font-semibold text-primary-text text-base leading-5">{truncateDecimals(10, destination_token.precision)} {destination_token.symbol}</p>
                                <p className="text-sm text-secondary-text">{destination?.display_name}</p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            <div className="px-3 py-2">
                <span className="grow w-full grid grid-cols-11 items-center text-sm font-normal">
                    <span className="col-span-5 opacity-60 text-primary-text">
                        {<StatusIcon swap={swap} />}
                    </span>
                    {/* <div><ChevronDownIcon className="mx-auto col-start-6 text-secondary-text/20 pt-1" /></div> */}
                    <span className="col-start-7 col-span-5">
                        <p className="text-sm text-primary-text font-medium">{shortenAddress(destAddress as string)}</p>
                    </span>
                </span>

            </div>
        </div>
    </>)
}

export default Summary