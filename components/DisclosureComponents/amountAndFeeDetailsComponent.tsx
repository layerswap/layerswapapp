import { GetExchangeFee, CalculateFee, CalculateReceiveAmount, CaluclateRefuelAmount } from '../../lib/fees';
import { SwapType } from '../../lib/layerSwapApiClient';
import { useSettingsState } from '../../context/settings';
import { SwapFormValues } from '../DTOs/SwapFormValues';
import ClickTooltip from '../Tooltips/ClickTooltip';
import { truncateDecimals } from '../utils/RoundDecimals';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../Accordion';
import Image from 'next/image';
import { motion } from 'framer-motion';


export default function AmountAndFeeDetails({ values }: { values: SwapFormValues }) {
    const { networks, currencies, campaigns, discovery: { resource_storage_url } } = useSettingsState()
    const { currency, from, to, swapType } = values || {}

    let exchangeFee = swapType === SwapType.OnRamp && parseFloat(GetExchangeFee(currency?.baseObject?.asset, from?.baseObject).toFixed(currency?.baseObject?.precision))
    let fee = CalculateFee(values, networks);
    let receive_amount = CalculateReceiveAmount(values, networks, currencies);

    const campaign = campaigns?.find(c => c.network_name === to?.baseObject?.internal_name)
    const campaignAsset = currencies.find(c => c?.asset === campaign?.asset)
    const feeinUsd = fee * currency?.baseObject?.usd_price
    const reward = truncateDecimals(((feeinUsd * campaign?.percentage / 100) / campaignAsset?.usd_price), campaignAsset?.precision)
    const isCampaignEnded = Math.round(((new Date(campaign?.end_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))) < 0 ? true : false

    const destination_native_currency = swapType !== SwapType.OffRamp && to?.baseObject?.native_currency
    const destinationNetworkCurrency = to?.baseObject?.currencies.find(c => c.asset === currency?.baseObject?.asset);
    const refuel_native_currency = currencies.find(c => c.asset === destination_native_currency)
    const refuel = truncateDecimals(CaluclateRefuelAmount(values, networks, currencies).refuelAmountInNativeCurrency, refuel_native_currency?.precision)

    return (
        <>
            <div className="mx-auto relative w-full rounded-lg border border-darkblue-500 hover:border-darkblue-300 bg-darkblue-700 px-3.5 py-3 z-[1] transition-all duration-200">
                <Accordion type="single" collapsible>
                    <AccordionItem value={'item-1'}>
                        <AccordionTrigger className="items-center flex w-full relative gap-2 rounded-lg text-left text-base font-medium">
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
                                        {destinationNetworkCurrency?.status == 'insufficient_liquidity' ? "Up to 2 hours (delayed)" : " ~1-2 minutes"}
                                    </span>
                                </div>
                            </>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
            {campaign && !isCampaignEnded &&
                <motion.div
                    initial={{ y: "-100%" }}
                    animate={{
                        y: 0,
                        transition: { duration: 0.3, ease: [0.36, 0.66, 0.04, 1] },
                    }}
                    exit={{
                        y: "-100%",
                        transition: { duration: 0.4, ease: [0.36, 0.66, 0.04, 1] },
                    }}
                    className='w-full flex items-center justify-between rounded-b-lg bg-darkblue-700  relative bottom-2 z-0 pt-4 pb-2 px-3.5 text-right'>
                    <div className='flex items-center'>
                        <p>Est. {campaignAsset?.asset} Reward</p>
                        <ClickTooltip text={<span>The amount of onboarding reward that you’ll earn. <a target='_blank' href='/rewards' className='text-primary underline hover:no-underline decoration-primary cursor-pointer'>Learn more</a></span>} />
                    </div>
                    {
                        reward > 0 &&
                        <div className="flex items-center space-x-1">
                            <span>+</span>
                            <div className="h-5 w-5 relative">
                                <Image
                                    src={`${resource_storage_url}/layerswap/currencies/${campaign?.asset?.toLowerCase()}.png`}
                                    alt="Project Logo"
                                    height="40"
                                    width="40"
                                    loading="eager"
                                    className="rounded-md object-contain" />
                            </div>
                            <p>
                                {reward} {campaignAsset?.asset}
                            </p>
                        </div>
                    }
                </motion.div>}
        </>
    )
}
