import { ChevronDownIcon } from '@heroicons/react/outline'
import { Disclosure } from "@headlessui/react";
import HoverTooltip from '../Tooltips/HoverTooltip';
import { Currency } from '../../Models/Currency';
import { Exchange } from '../../Models/Exchange';
import { GetExchangeFee, CalculateFee, CalculateReceiveAmount } from '../../lib/fees';
import { CryptoNetwork } from '../../Models/CryptoNetwork';
import { SwapType } from '../../lib/layerSwapApiClient';
import KnownInternalNames from '../../lib/knownIds';

type Props = {
    amount: number,
    currency: Currency,
    exchange: Exchange,
    swapType: SwapType,
    network: CryptoNetwork,
}

export default function AmountAndFeeDetails({ amount, currency, exchange, network, swapType }: Props) {
    let exchangeFee = GetExchangeFee(currency, exchange);
    let fee = CalculateFee(amount, currency, exchange, network, swapType);
    let receive_amount = CalculateReceiveAmount(amount, currency, exchange, network, swapType);

    return (
        <>
            <div className="mx-auto w-full rounded-lg border border-darkblue-500 hover:border-darkblue-50 bg-darkblue-700 px-3.5 py-3">
                <Disclosure>
                    {({ open }) => (
                        <>
                            <Disclosure.Button className="items-center flex w-full relative justify-between rounded-lg text-left text-base font-medium">
                                <span className="md:font-semibold text-sm md:text-base text-primary-text">You will receive</span>
                                <div className='flex items-center space-x-2'>
                                    <span className="text-sm md:text-base">
                                        {
                                            receive_amount ?
                                                <span className="font-semibold md:font-bold text-right leading-4">
                                                    <p>
                                                        {receive_amount.toFixed(currency?.precision)}
                                                        <span>
                                                            {
                                                                ` ${currency?.asset || ""}`
                                                            }
                                                        </span>
                                                    </p>
                                                    {
                                                        KnownInternalNames.Networks.BNBChainMainnet == network?.internal_name &&
                                                        <p className='text-[12px] text-slate-300'>
                                                            + 0.0015 BNB
                                                        </p>
                                                    }
                                                </span>
                                                : '-'
                                        }
                                    </span>
                                    <ChevronDownIcon
                                        className={`${open ? 'rotate-180 transform' : ''
                                            } h-4 w-4 text-primary-text`}
                                    />
                                </div>
                            </Disclosure.Button>
                            <Disclosure.Panel className="text-sm text-primary-text font-normal">
                                <>
                                    <div className="mt-2 flex flex-row items-baseline justify-between">
                                        <label className="inline-flex items-center text-left">
                                            Layerswap Fee
                                        </label>
                                        <span className="text-right">
                                            {fee.toFixed(currency?.precision)}
                                            <span>  {currency?.asset} </span>
                                        </span>
                                    </div>
                                    {
                                        swapType === SwapType.OnRamp &&
                                        <div className="mt-2 flex flex-row justify-between">
                                            <label className="flex items-center text-left grow">
                                                Exchange Fee
                                                <HoverTooltip text="Some exchanges charge a fee to cover gas fees of on-chain transfers." moreClassNames='w-36' />
                                            </label>
                                            <span className="text-right">
                                                {parseFloat(exchangeFee.toFixed(currency?.precision))} {currency?.asset}
                                            </span>
                                        </div>
                                    }

                                    <div className="mt-2 flex flex-row items-baseline justify-between">
                                        <label className="block text-left">
                                            Estimated arrival
                                        </label>
                                        <span className="text-right">
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