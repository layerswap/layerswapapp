import { FC } from "react"
import BackgroundField from "@/components/backgroundField";
import { Clock } from "lucide-react"
import LayerSwapApiClient, { Campaign, Reward, RewardPayout } from "@/lib/apiClients/layerSwapApiClient"
import { RewardsComponentSceleton } from "@/components/Sceletons"
import useSWR from "swr"
import { ApiResponse } from "@/Models/ApiResponse"
import ClickTooltip from "@/components/Tooltips/ClickTooltip"
import shortenString from "@/components/utils/ShortenString"
import { Progress } from "@/components/ProgressBar";
import useWallet from "@/hooks/useWallet";
import { ImageWithFallback } from "@/components/Common/ImageWithFallback";
import { getExplorerUrl } from "@/lib/address";

type Props = {
    campaign: Campaign
}

const Rewards: FC<Props> = ({ campaign }) => {
    const network = campaign?.network

    const { provider } = useWallet(network, 'autofill')
    const wallet = provider?.activeWallet

    const address = wallet?.address

    const apiClient = new LayerSwapApiClient()

    const { data: rewardsData, isLoading: rewardsIsLoading } = useSWR<ApiResponse<Reward>>(`/campaigns/${campaign.id}/rewards/${address}`, apiClient.fetcher, { dedupingInterval: 60000 })
    const { data: payoutsData, isLoading: payoutsIsLoading } = useSWR<ApiResponse<RewardPayout[]>>(`/campaigns/${campaign.id}/payouts/${address}`, apiClient.fetcher, { dedupingInterval: 60000 })

    if (rewardsIsLoading || payoutsIsLoading) {
        return <RewardsComponentSceleton />
    }

    const payouts = payoutsData?.data || []

    const rewards = rewardsData?.data
    const campaignEndDate = new Date(campaign.end_date)
    const now = new Date()
    const next = rewards?.next_airdrop_date ? new Date(rewards?.next_airdrop_date) : null

    const difference_in_days = next ?
        Math.floor(Math.abs(((next.getTime() - now.getTime())) / (1000 * 3600 * 24))) : null

    const difference_in_hours = (next && difference_in_days) ?
        Math.round(Math.abs(((next.getTime() - now.getTime())) / (1000 * 3600) - (difference_in_days * 24)))
        : null

    const campaignIsEnded = (campaignEndDate.getTime() - now.getTime()) < 0


    return <>
        <div className="space-y-4">
            <div className="text-secondary-text">
                <span>
                    {campaign.description ?
                        <span>{campaign.description}</span>
                        :
                        <>
                            <span>Onboarding incentives that are earned by transferring to&nbsp;</span>
                            {network?.display_name}
                            <span>.&nbsp;</span>
                        </>
                    }
                </span>
            </div>
            <div className="bg-secondary-500 divide-y divide-secondary-500 rounded-lg shadow-lg border border-secondary-500 hover:border-secondary-400 transition duration-200">
                {!campaignIsEnded &&
                    <BackgroundField header={<span className="flex justify-between"><span className="flex items-center"><span>Pending Earnings&nbsp;</span><ClickTooltip text={`${campaign.token.symbol} tokens that will be airdropped periodically.`} /> </span><span>Next Airdrop</span></span>} withoutBorder>
                        <div className="flex justify-between w-full text-2xl">
                            <div className="flex items-center space-x-1">
                                <div className="h-5 w-5 relative">
                                    <ImageWithFallback
                                        src={campaign.token?.logo || ''}
                                        alt="Project Logo"
                                        height="40"
                                        width="40"
                                        loading="eager"
                                        className="rounded-full object-contain" />
                                </div>
                                <p>
                                    {rewards?.user_reward.total_pending_amount} <span className="text-base sm:text-2xl">{campaign.token.symbol}</span>
                                </p>
                            </div>
                            <div className="flex items-center space-x-1">
                                <Clock className="h-5" />
                                <p>
                                    {difference_in_days}d {difference_in_hours}h
                                </p>
                            </div>
                        </div>
                    </BackgroundField>
                }
                <BackgroundField header={<span className="flex justify-between"><span className="flex items-center"><span>Total Earnings&nbsp;</span><ClickTooltip text={`${campaign.token.symbol} tokens that you've earned so far (including Pending Earnings).`} /></span><span>Current Value</span></span>} withoutBorder>
                    <div className="flex justify-between w-full text-slate-300 text-2xl">
                        <div className="flex items-center space-x-1">
                            <div className="h-5 w-5 relative">
                                <ImageWithFallback
                                    src={campaign.token?.logo || ''}
                                    alt="Project Logo"
                                    height="40"
                                    width="40"
                                    loading="eager"
                                    className="rounded-full object-contain" />
                            </div>
                            <p>
                                {rewards?.user_reward.total_amount} <span className="text-base sm:text-2xl">{campaign.token.symbol}</span>
                            </p>
                        </div>
                        <p>
                            <span>$</span><span>{rewards?.user_reward?.total_amount_in_usd.toFixed(rewards?.user_reward?.total_amount_in_usd > 0 ? 2 : 0) || 0}</span>
                        </p>
                    </div>
                </BackgroundField>
            </div>
        </div>
        <ProgressComponent
            campaign={campaign}
            rewardsData={rewardsData?.data}
        />
        {
            payouts.length > 0 &&
            <div className="space-y-1">
                <p className="font-bold text-lg text-left">Payouts</p>
                <div className=" bg-secondary-700 divide-y divide-secondary-300 rounded-lg shadow-lg border border-secondary-700 hover:border-secondary-500 transition duration-200">
                    <div className="inline-block min-w-full align-middle">
                        <div className="overflow-hidden shadow-sm ring-1 ring-black/5 sm:rounded-lg">
                            <table className="min-w-full divide-y divide-secondary-500">
                                <thead className="bg-secondary-800/70">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 text-left text-sm font-semibold  sm:pl-6">
                                            Tx Id
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold ">
                                            Amount
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold ">
                                            Date
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-600">
                                    {payouts.map((payout) => (
                                        <tr key={payout.transaction_id}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-primary-text sm:pl-6 underline hover:no-underline">
                                                <a target={"_blank"} href={getExplorerUrl(network?.transaction_explorer_template, payout.transaction_id)}>{shortenString(payout.transaction_id)}</a>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-100">{payout.amount}</td>
                                            <td className="px-3 py-4 text-sm text-gray-100">{new Date(payout.date).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        }
    </>
}

const ProgressComponent: FC<{ campaign: Campaign, rewardsData: Reward | undefined }> = ({ campaign, rewardsData }) => {

    if (campaign.max_payout_amount) {

        const weeklyEarned = rewardsData?.user_reward.period_pending_amount || 0

        return <div className="bg-secondary-700 rounded-lg shadow-lg border border-secondary-700 hover:border-secondary-500 transition duration-200">
            <BackgroundField header={
                <p>
                    Weekly reward earned
                </p>
            } withoutBorder>
                <div className="flex flex-col w-full gap-2">
                    <Progress value={weeklyEarned === Infinity ? 0 : weeklyEarned} />
                    <div className="flex justify-between w-full font-semibold text-sm ">
                        <div className="text-primary"><span className="text-primary-text">{weeklyEarned.toFixed(0)}</span> <span>/</span> {campaign.max_payout_amount} {campaign.token.symbol}</div>
                        <div>
                            <span>Refreshes every </span> <span className="font-semibold">{campaign.reward_limit_period}</span> <span> days</span>
                        </div>
                    </div>
                </div>
            </BackgroundField>
        </div>
    }

    const DistributedAmount = ((campaign.distributed_amount / campaign.total_budget) * 100)
    const totalBudget = campaign.total_budget

    return (
        <div className="bg-secondary-700 rounded-lg shadow-lg border border-secondary-700 hover:border-secondary-500 transition duration-200">
            <BackgroundField header={
                <>
                    <div className="flex items-center">
                        <span>{campaign.token.symbol} pool</span>
                        <ClickTooltip text={`The amount of ${campaign.token.symbol} to be distributed during this round of the campaign.`} />
                    </div>
                </>
            } withoutBorder>
                <div className="flex flex-col w-full gap-2">
                    <Progress value={DistributedAmount === Infinity ? 0 : DistributedAmount} />
                    <div className="flex justify-between w-full font-semibold text-sm ">
                        <div className="text-primary"><span className="text-primary-text">{campaign?.distributed_amount.toFixed(0)}</span> <span>/</span> {totalBudget} {campaign.token.symbol}</div>
                    </div>
                </div>
            </BackgroundField>
        </div>
    )
}

export default Rewards