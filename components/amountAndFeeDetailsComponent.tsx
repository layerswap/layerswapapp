import { ChevronDownIcon, InformationCircleIcon } from '@heroicons/react/outline'
import { Disclosure } from "@headlessui/react";
import Tooltip from './tooltip';
import { SwapFormValues } from './DTOs/SwapFormValues';
import { useSwapDataState } from '../context/swap';
import { Currency } from '../Models/Currency';
import { Exchange } from '../Models/Exchange';

function exchangeFee(currency: Currency, exchange: Exchange): number {
    return currency?.exchanges?.find(e => e.exchange_id == exchange.id)?.fee || 0;
}

function calculateFee(amount: number, currency: Currency, exchange: Exchange): number {

    var exchangeFee = Number(amount?.toString()?.replace(",", ".")) * exchange?.fee_percentage;
    var overallFee = currency?.fee + exchangeFee;

    return overallFee || 0;
}

type Props = {
    amount: string,
    currency: Currency,
    exchange: Exchange
}

export default function AmountAndFeeDetails({ amount, currency, exchange }: Props) {

    let fee = amount ? Number(calculateFee(Number(amount), currency, exchange)?.toFixed(currency?.precision)) : 0;

    
    let receive_amount = 0;
    let fee_amount = Number(amount?.toString()?.replace(",", "."));
    if (fee_amount >= currency?.min_amount) {
        var exFee = exchangeFee(currency, exchange);
        var result = fee_amount - fee - exFee;
        receive_amount = Number(result.toFixed(currency?.precision));
    }
    return (
        <>
            <div className="mx-auto w-full rounded-lg bg-darkblue-500 p-2">
                <Disclosure>
                    {({ open }) => (
                        <>
                            <Disclosure.Button className="items-center flex w-full relative justify-between rounded-lg p-1.5 text-left text-base font-medium border border-darkblue-500 hover:border-darkblue-100">
                                <span className="font-medium text-pink-primary-300">You will receive</span>
                                <span className="absolute right-9">
                                    {
                                        receive_amount ?
                                            <span className="font-medium text-center strong-highlight">
                                                {receive_amount}
                                                <span>
                                                    {
                                                        ` ${currency?.name || ""}`
                                                    }
                                                </span>
                                            </span>
                                            : '-'
                                    }

                                </span>
                                <ChevronDownIcon
                                    className={`${open ? 'rotate-180 transform' : ''
                                        } h-4 w-4 text-light-blue`}
                                />
                            </Disclosure.Button>
                            <Disclosure.Panel className="p-2 text-sm">
                                <>
                                    <div className="mt-2 flex flex-col md:flex-row items-baseline justify-between">
                                        <label className="inline-flex font-normal items-center text-pink-primary-300 text-left">
                                            Layerswap Fee
                                            {Tooltip("Layerswap Fee is used to cover the gas costs of relaying and executing your swap on Layerswap.")}
                                        </label>
                                        <span className="font-normal text-center text-white">
                                            {fee.toLocaleString()}
                                            <span>  {currency?.name} </span>
                                        </span>
                                    </div>
                                    <div className="mt-2 flex flex-col md:flex-row items-baseline justify-between">
                                        <label className="inline-flex font-normal text-pink-primary-300 text-left">
                                            Exchange Fee
                                            {Tooltip("test")}
                                        </label>
                                        <span className="font-normal text-center text-white">
                                            {(() => {
                                                if (amount) {
                                                    return exchangeFee(currency, exchange)
                                                }
                                                return "0";
                                            })()}
                                            <span>  {currency?.name} {exchange?.internal_name === "binance" && <span className='inline-flex'>( Refundable {Tooltip("test")} )</span>}</span>
                                        </span>
                                    </div>
                                    <div className="mt-2 flex flex-col md:flex-row items-baseline justify-between">
                                        <label className="block font-normal text-pink-primary-300 text-center">
                                            Estimated Time Of Arrival
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