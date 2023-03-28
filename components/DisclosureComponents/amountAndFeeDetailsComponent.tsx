import { ChevronDown } from 'lucide-react'
import { Disclosure } from "@headlessui/react";
import { GetExchangeFee, CalculateFee, CalculateReceiveAmount, CaluclateRefuelAmount } from '../../lib/fees';
import { SwapType } from '../../lib/layerSwapApiClient';
import { useSettingsState } from '../../context/settings';
import { SwapFormValues } from '../DTOs/SwapFormValues';
import ClickTooltip from '../Tooltips/ClickTooltip';
import { truncateDecimals } from '../utils/RoundDecimals';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../Accordion';


export default function AmountAndFeeDetails({ values }: { values: SwapFormValues }) {
    const { networks, currencies } = useSettingsState()
    const { currency, from, to, swapType } = values || {}

    let exchangeFee = swapType === SwapType.OnRamp && parseFloat(GetExchangeFee(currency?.baseObject?.asset, from?.baseObject).toFixed(currency?.baseObject?.precision))
    let fee = CalculateFee(values, networks);
    let receive_amount = CalculateReceiveAmount(values, networks, currencies);

    const destination_native_currency = swapType !== SwapType.OffRamp && to?.baseObject?.native_currency
    const refuel_native_currency = currencies.find(c => c.asset === destination_native_currency)
    const refuel = truncateDecimals(CaluclateRefuelAmount(values, networks, currencies).refuelAmountInNativeCurrency, refuel_native_currency?.precision)

    return (
        <>
            <div className="mx-auto w-full rounded-lg border border-darkblue-500 hover:border-darkblue-50 bg-darkblue-700 px-3.5 py-3">
                <Accordion type="single" collapsible>
                    <AccordionItem value={'item-1'}>
                        <AccordionTrigger className="items-center flex w-full relative gap-1 rounded-lg text-left text-base font-medium">
                            <span className="md:font-semibold text-sm md:text-base text-primary-text leading-8 md:leading-8 flex-1">You will receive</span>
                            <div className='flex items-center space-x-2'>
                                <span className="text-sm md:text-base">
                                    {
                                        receive_amount ?
                                            <div className="font-semibold md:font-bold text-right leading-4">
                                                <p>
                                                    {parseFloat(receive_amount.toFixed(currency?.baseObject?.precision))}
                                                    <span>
                                                        {
                                                            ` ${currency?.baseObject?.asset || ""}`
                                                        }
                                                    </span>
                                                </p>
                                                {
                                                    refuel > 0 &&
                                                    <p className='text-[12px] text-slate-300'>
                                                        + {refuel} {destination_native_currency}
                                                    </p>
                                                }
                                            </div>
                                            : '-'
                                    }
                                </span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-primary-text font-normal">
                            <>
                                <div className="mt-2 flex flex-row items-baseline justify-between">
                                    <label className="inline-flex items-center text-left">
                                        Layerswap Fee
                                    </label>
                                    <span className="text-right">
                                        {parseFloat(fee.toFixed(currency?.baseObject?.precision))} {currency?.baseObject?.asset}
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
                                            {exchangeFee === 0 ? 'Check at the exchange' : <>{exchangeFee} {currency?.baseObject?.asset}</>}
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
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </>
    )
}
