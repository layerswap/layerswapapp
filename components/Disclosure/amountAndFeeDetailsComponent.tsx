import { ChevronDownIcon } from '@heroicons/react/outline'
import { Disclosure } from "@headlessui/react";
import HoverTooltip from '.././Tooltips/HoverTooltip';
import { Currency } from '../../Models/Currency';
import { Exchange } from '../../Models/Exchange';
import { SwapType } from '../DTOs/SwapFormValues';
import { CalculateFullExchangeFee, CalculateFee, CalculateReceiveAmount } from '../../lib/fees';

type Props = {
    amount: number,
    currency: Currency,
    exchange: Exchange,
    swapType: SwapType,
}

export default function AmountAndFeeDetails({ amount, currency, exchange, swapType }: Props) {
    let exchangeFee = CalculateFullExchangeFee(amount, currency, exchange);
    let fee = CalculateFee(amount, currency, exchange, swapType);
    let receive_amount = CalculateReceiveAmount(amount, currency, exchange, swapType);

    return (
        <>
            <div className="mx-auto w-full rounded-lg border border-darkblue-100 hover:border-darkblue-200 bg-darkblue-500 p-2">
                <Disclosure>
                    {({ open }) => (
                        <>
                            <Disclosure.Button className="items-center flex w-full relative justify-between rounded-lg p-1.5 text-left text-base font-medium">
                                <span className="font-medium text-pink-primary-300">You will receive</span>
                                <span className="absolute right-9">
                                    {
                                        receive_amount ?
                                            <span className="font-medium text-center strong-highlight">
                                                {receive_amount}
                                                <span>
                                                    {
                                                        ` ${currency?.asset || ""}`
                                                    }
                                                </span>
                                            </span>
                                            : '-'
                                    }

                                </span>
                                <ChevronDownIcon
                                    className={`${open ? 'rotate-180 transform' : ''
                                        } h-4 w-4 text-pink-primary-300`}
                                />
                            </Disclosure.Button>
                            <Disclosure.Panel className="p-2 text-sm">
                                <>
                                    <div className="mt-2 flex flex-row items-baseline justify-between">
                                        <label className="inline-flex font-normal items-center text-pink-primary-300 text-left">
                                            Layerswap Fee
                                        </label>
                                        <span className="font-normal text-center text-white">
                                            {fee.toLocaleString()}
                                            <span>  {currency?.asset} </span>
                                        </span>
                                    </div>
                                    {
                                        swapType === "onramp" &&
                                        <div className="mt-2 flex flex-row items-baseline justify-between">
                                            <label className="inline-flex font-normal text-pink-primary-300 text-left">
                                                Exchange Fee
                                                <HoverTooltip text="Some exchanges charge a fee to cover gas fees of on-chain transfers." moreClassNames='w-36' />
                                            </label>
                                            <span className="font-normal text-center text-white">
                                                {exchangeFee.toLocaleString()}
                                                <span>  {currency?.asset} {exchange?.internal_name === "binance" && <span className='inline-flex text-pink-primary-300'>(Refundable) <HoverTooltip text="After initiating the withdrawal, this fee will be refunded to your Binance account." moreClassNames='w-36' /></span>}</span>
                                            </span>
                                        </div>
                                    }

                                    <div className="mt-2 flex flex-row items-baseline justify-between">
                                        <label className="block font-normal text-pink-primary-300 text-center">
                                            Time Of Arrival
                                        </label>
                                        <span className="font-normal text-center text-white">
                                            ~1-2 minutes
                                        </span>
                                    </div>
                                </>
                            </Disclosure.Panel>
                        </>
                    )}
                </Disclosure>
            </div>
        </>
    )
}