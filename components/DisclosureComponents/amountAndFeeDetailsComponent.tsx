import { ChevronDownIcon } from '@heroicons/react/outline'
import { Disclosure } from "@headlessui/react";
import { GetExchangeFee, CalculateFee, CalculateReceiveAmount } from '../../lib/fees';
import { SwapType } from '../../lib/layerSwapApiClient';
import KnownInternalNames from '../../lib/knownIds';
import { useSettingsState } from '../../context/settings';
import { SwapFormValues } from '../DTOs/SwapFormValues';
import ClickTooltip from '../Tooltips/ClickTooltip';


export default function AmountAndFeeDetails({ values }: { values: SwapFormValues }) {
    const { networks } = useSettingsState()

    const { currency, exchange, network, swapType } = values || {}

    let exchangeFee = GetExchangeFee(currency?.baseObject?.asset, exchange?.baseObject);
    let fee = CalculateFee(values, networks);
    let receive_amount = CalculateReceiveAmount(values, networks);

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
                                                        {receive_amount.toFixed(currency?.baseObject?.precision)}
                                                        <span>
                                                            {
                                                                ` ${currency?.baseObject?.asset || ""}`
                                                            }
                                                        </span>
                                                    </p>
                                                    {
                                                        KnownInternalNames.Networks.BNBChainMainnet == network?.baseObject?.internal_name &&
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
                                            {fee.toFixed(currency?.baseObject?.precision)}
                                            <span>  {currency?.baseObject?.asset} </span>
                                        </span>
                                    </div>
                                    {
                                        swapType === SwapType.OnRamp &&
                                        <div className="mt-2 flex flex-row justify-between">
                                            <label className="flex items-center text-left grow">
                                                Exchange Fee
                                                <ClickTooltip text="Some exchanges charge a fee to cover gas fees of on-chain transfers." />
                                            </label>
                                            <span className="text-right">
                                                {parseFloat(exchangeFee.toFixed(currency?.baseObject?.precision))} {currency?.baseObject?.asset}
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