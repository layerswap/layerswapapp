import { GetExchangeFee, CalculateFee, CalculateReceiveAmount, CaluclateRefuelAmount } from '../../lib/fees';
import { useSettingsState } from '../../context/settings';
import { SwapFormValues } from '../DTOs/SwapFormValues';
import ClickTooltip from '../Tooltips/ClickTooltip';
import { truncateDecimals } from '../utils/RoundDecimals';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../Accordion';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { GetDefaultNetwork, GetNetworkCurrency } from '../../helpers/settingsHelper';
import { ApiResponse } from '../../Models/ApiResponse';
import LayerSwapApiClient, { Campaigns } from '../../lib/layerSwapApiClient';
import useSWR from 'swr'


export default function AmountAndFeeDetails({ values }: { values: SwapFormValues }) {
    const { networks, currencies, resolveImgSrc } = useSettingsState()
    const { currency, from, to } = values || {}

    let exchangeFee = parseFloat(GetExchangeFee(currency?.asset, from).toFixed(currency?.precision))
    let fee = CalculateFee(values, networks);
    const parsedFee = parseFloat(fee.toFixed(currency?.precision))
    let receive_amount = CalculateReceiveAmount(values, networks, currencies);
    const asset = currency?.asset
    const apiClient = new LayerSwapApiClient()
    //handle error case
    const { data: campaignsData, isLoading } = useSWR<ApiResponse<Campaigns[]>>('/campaigns', apiClient.fetcher)
    const campaign = campaignsData?.data?.find(c => c?.network === to?.internal_name)
    const parsedReceiveAmount = parseFloat(receive_amount.toFixed(currency?.precision))

    const campaignAsset = currencies.find(c => c?.asset === campaign?.asset)
    const feeinUsd = fee * currency?.usd_price
    const reward = truncateDecimals(((feeinUsd * campaign?.percentage / 100) / campaignAsset?.usd_price), campaignAsset?.precision)
    const isCampaignEnded = Math.round(((new Date(campaign?.end_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))) < 0 ? true : false

    const destination_native_currency = !to?.isExchange
        && GetDefaultNetwork(to, asset)?.native_currency

    const destinationNetworkCurrency = GetNetworkCurrency(to, currency?.asset)
    const refuel_native_currency = currencies.find(c => c.asset === destination_native_currency)
    const refuel = truncateDecimals(CaluclateRefuelAmount(values, currencies).refuelAmountInNativeCurrency, refuel_native_currency?.precision)
    const currencyName = currency?.asset || " "

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
                                        parsedReceiveAmount ?
                                            <div className="font-semibold md:font-bold text-right leading-4">
                                                <p>
                                                    <>{parsedReceiveAmount}</>
                                                    <span>
                                                        {
                                                            ` ${destinationNetworkCurrency?.name || ""}`
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
                                    <label className="inline-flex items-center text-left text-primary-text-placeholder">
                                        Layerswap fee
                                    </label>
                                    <span className="text-right">
                                        <>{parsedFee}</> <>{currencyName}</>
                                    </span>
                                </div>
                                {
                                    from?.isExchange &&
                                    <div className="mt-2 flex flex-row justify-between">
                                        <label className="flex items-center text-left grow text-primary-text-placeholder">
                                            Exchange Fee
                                            <ClickTooltip text="Some exchanges charge a fee to cover gas fees of on-chain transfers." />
                                        </label>
                                        <span className="text-right">
                                            {exchangeFee === 0 ? 'Check at the exchange' : <>{exchangeFee} {currency?.asset}</>}
                                        </span>
                                    </div>
                                }
                                <div className="mt-2 flex flex-row items-baseline justify-between">
                                    <label className="block text-left text-primary-text-placeholder">
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
                                    src={resolveImgSrc(campaign)}
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
