import { FC } from "react"
import LayerSwapApiClient, { Campaign, QuoteReward } from "../../lib/layerSwapApiClient"
import useSWR from "swr"
import { ApiResponse } from "../../Models/ApiResponse"
import ClickTooltip from "../Tooltips/ClickTooltip"
import Image from 'next/image';
import { Network } from "../../Models/Network"

type CampaignProps = {
    destination: Network,
    reward: QuoteReward | undefined,
}
const Comp: FC<CampaignProps> = ({
    destination,
    reward: fee,
}) => {
    const apiClient = new LayerSwapApiClient()
    const { data: campaignsData } = useSWR<ApiResponse<Campaign[]>>('/campaigns', apiClient.fetcher)

    const now = new Date().getTime()

    const campaign = campaignsData
        ?.data
        ?.find(c =>
            c?.network.name === destination?.name
            && new Date(c?.end_date).getTime() - now > 0)

    if (!campaign || !fee)
        return <></>

    return <CampaignDisplay
        campaign={campaign}
        reward={fee}
    />
}
type CampaignDisplayProps = {
    campaign: Campaign,
    reward: QuoteReward,
}
const CampaignDisplay: FC<CampaignDisplayProps> = ({ campaign, reward }) => {

    const token = campaign.token

    return <div className='w-full flex items-center justify-between rounded-b-lg bg-secondary-700 relative bottom-2 pt-4 pb-2 px-3.5 text-right'>
        <div className='flex items-center'>
            <p>Est. {token?.symbol} Reward</p>
            <ClickTooltip text={<span><span>The amount of onboarding reward that you’ll earn.&nbsp;</span><a target='_blank' href='/campaigns' className='text-primary underline hover:no-underline decoration-primary cursor-pointer'>Learn more</a></span>} />
        </div>
        {
            Number(reward.amount) > 0 &&
            <div className="flex items-center space-x-1">
                <span>+</span>
                <div className="h-5 w-5 relative">
                    <Image
                        src={token?.logo || ''}
                        alt="Project Logo"
                        height="40"
                        width="40"
                        loading="eager"
                        className="rounded-md object-contain" />
                </div>
                <p>
                    {reward.amount} {token?.symbol}
                </p>
            </div>
        }
    </div>
}

export default Comp