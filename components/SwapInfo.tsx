import Image from "next/image";
import { useSettingsState } from "../context/settings";
import { ArrowDown } from "lucide-react";
import shortenAddress from "./utils/ShortenAddress";
import { CalculateReceiveAmount } from "../lib/fees";
import { useAccount } from "wagmi";
import { useSwapDataState } from "../context/swap";

const SwapInfo = () => {
    const { swap } = useSwapDataState()
    const { resolveImgSrc, networks, currencies, layers } = useSettingsState()
    const { isConnected, address } = useAccount();

    const currency = currencies.find(c => c.asset === swap?.destination_network_asset)
    const source = swap?.source_exchange ? layers?.find(e => e.internal_name === swap?.source_exchange) : layers?.find(e => e.internal_name === swap?.source_network)
    const sourceDisplayName = source?.display_name
    const destination = swap?.destination_exchange ? layers?.find(e => e.internal_name === swap?.destination_exchange) : layers?.find(e => e.internal_name === swap?.destination_network)
    const destinationDisplayName = destination?.display_name
    let receive_amount = CalculateReceiveAmount({ amount: swap?.requested_amount?.toString(), destination_address: swap?.destination_address, currency: currency, from: source, to: destination }, networks, currencies);
    const requestedAmountInUsd = (currency?.usd_price * swap?.requested_amount).toFixed(2)
    const receiveAmountInUsd = (currency?.usd_price * receive_amount).toFixed(2)

    return (
        <div className="bg-darkblue-700 rounded-md flex flex-col border border-darkblue-500 w-full relative">
            <div className="flex items-center justify-between w-full px-3 py-1.5 border-b border-darkblue-500">
                <div className="flex items-center gap-2">
                    <Image src={resolveImgSrc(source)} alt={sourceDisplayName} width={30} height={30} className="rounded-md" />
                    <div>
                        <p className="text-primary-text leading-5">{sourceDisplayName}</p>
                        {
                            isConnected && !source.isExchange &&
                            <p className="text-xs text-primary-text">{shortenAddress(address)}</p>
                        }
                    </div>
                </div>
                <div className="flex flex-col font-light">
                    <p className="text-white">{swap?.requested_amount} <span className="text-sm">{swap?.destination_network_asset}</span></p>
                    <p className="text-primary-text text-xs flex justify-end">${requestedAmountInUsd}</p>
                </div>
            </div>
            <ArrowDown className="h-4 w-4 text-primary-text absolute top-[calc(50%-8px)] left-[calc(50%-8px)]" />
            <div className="flex items-center justify-between w-full px-3 py-1.5">
                <div className="flex items-center gap-2">
                    <Image src={resolveImgSrc(destination)} alt={destinationDisplayName} width={30} height={30} className="rounded-md" />
                    <div>
                        <p className="text-primary-text leading-5">{destinationDisplayName}</p>
                        <p className="text-xs text-primary-text">{shortenAddress(swap?.destination_address)}</p>
                    </div>
                </div>
                <div className="flex flex-col justify-end font-light">
                    <p className="text-white">{receive_amount} <span className="text-sm">{swap?.destination_network_asset}</span></p>
                    <p className="text-primary-text text-xs flex justify-end">${receiveAmountInUsd}</p>
                </div>
            </div>
        </div>
    )
}

export default SwapInfo