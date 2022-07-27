import { ChevronDownIcon } from '@heroicons/react/outline'
import { Disclosure } from "@headlessui/react";
import Tooltip from '../Tooltips/tooltip';
import { Currency } from '../../Models/Currency';
import { Exchange } from '../../Models/Exchange';

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

    let fee = amount ? Number(calculateFee(Number(amount?.toString()?.replace(",",".")), currency, exchange)?.toFixed(currency?.precision)) : 0;


    let receive_amount = 0;
    let fee_amount = Number(amount?.toString()?.replace(",", "."));
    if (fee_amount >= currency?.min_amount) {
        var exFee = exchangeFee(currency, exchange);
        var result = fee_amount - fee - exFee;
        receive_amount = Number(result.toFixed(currency?.precision));
    }
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
                                    <div className="mt-2 flex flex-row items-baseline justify-between">
                                        <label className="inline-flex font-normal text-pink-primary-300 text-left">
                                            Exchange Fee
                                            <Tooltip text="Some exchanges charge a fee to cover gas fees of on-chain transfers." moreClassNames='w-36 md:w-40 lg:w-40'/>
                                        </label>
                                        <span className="font-normal text-center text-white">
                                            {(() => {
                                                if (amount) {
                                                    return exchangeFee(currency, exchange)
                                                }
                                                return "0";
                                            })()}
                                            <span>  {currency?.asset} {exchange?.internal_name === "binance" && <span className='inline-flex text-pink-primary-300'>(Refundable) <Tooltip text="After initiating the withdrawal, this fee will be refunded to your Binance account." /></span>}</span>
                                        </span>
                                    </div>
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