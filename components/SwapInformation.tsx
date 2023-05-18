import Image from "next/image";
import { useSettingsState } from "../context/settings";
import { ArrowDown, Fuel } from "lucide-react";
import shortenAddress from "./utils/ShortenAddress";
import { CalculateReceiveAmount } from "../lib/fees";
import { useAccount } from "wagmi";
import { Currency } from "../Models/Currency";
import { Layer } from "../Models/Layer";
import { FC } from "react";
import { truncateDecimals } from "./utils/RoundDecimals";

type SwapInfoProps = {
    currency: Currency,
    source: Layer,
    destination: Layer;
    requestedAmount: number;
    destinationAddress: string;
    refuelAmount?: number
}

const SwapInformation: FC<SwapInfoProps> = ({ currency, source, destination, requestedAmount, destinationAddress, refuelAmount }) => {
    const { resolveImgSrc, networks, currencies } = useSettingsState()
    const { isConnected, address } = useAccount();

    const sourceDisplayName = source?.display_name
    const destinationDisplayName = destination?.display_name
    let receive_amount = CalculateReceiveAmount({ amount: requestedAmount.toString(), destination_address: destinationAddress, currency: currency, from: source, to: destination }, networks, currencies);
    const requestedAmountInUsd = (currency?.usd_price * requestedAmount).toFixed(2)
    const receiveAmountInUsd = (currency?.usd_price * receive_amount).toFixed(2)
    const nativeCurrency = refuelAmount && destination?.isExchange === false && currencies.find(c => c.asset === destination?.native_currency)

    const truncatedRefuelAmount = truncateDecimals(refuelAmount, nativeCurrency?.precision)

    return (
        <div>
            <div className="bg-darkblue-700 rounded-md flex flex-col border border-darkblue-500 w-full relative z-10">
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
                        <p className="text-white">{requestedAmount} {currency.asset}</p>
                        <p className="text-primary-text text-xs flex justify-end">${requestedAmountInUsd}</p>
                    </div>
                </div>
                <ArrowDown className="h-4 w-4 text-primary-text absolute top-[calc(50%-8px)] left-[calc(50%-8px)]" />
                <div className="flex items-center justify-between w-full px-3 py-1.5">
                    <div className="flex items-center gap-2">
                        <Image src={resolveImgSrc(destination)} alt={destinationDisplayName} width={30} height={30} className="rounded-md" />
                        <div>
                            <p className="text-primary-text leading-5">{destinationDisplayName}</p>
                            <p className="text-xs text-primary-text">{shortenAddress(destinationAddress)}</p>
                        </div>
                    </div>
                    <div className="flex flex-col justify-end font-light">
                        <p className="text-white">{receive_amount} {currency.asset}</p>
                        <p className="text-primary-text text-xs flex justify-end">${receiveAmountInUsd}</p>
                    </div>
                </div>
            </div>
            {
                refuelAmount &&
                <div
                    className='w-full flex items-center justify-between rounded-b-lg bg-darkblue-700 relative bottom-2 z-[1] pt-4 pb-2 px-3.5 text-right'>
                    <div className='flex items-center gap-2'>
                        <Fuel className='h-4 w-4 text-primary' />
                        <p>Refuel</p>
                    </div>
                    <div className="text-white font-light ">
                        + {truncatedRefuelAmount} {nativeCurrency.asset}
                    </div>
                </div>
            }
        </div>
    )
}

export default SwapInformation