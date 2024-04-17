import { FC } from "react"
import LayerSwapApiClient, { Campaign, QuoteReward } from "../../lib/layerSwapApiClient"
import useSWR from "swr"
import { ApiResponse } from "../../Models/ApiResponse"
import ClickTooltip from "../Tooltips/ClickTooltip"
import Image from 'next/image';
import { Network } from "../../Models/Network"
import FeeDetails from "./FeeDetailsComponent"

type CampaignProps = {
    destination: Network,
    reward: QuoteReward | undefined,
}
const Comp: FC<CampaignProps> = ({
    destination,
    reward,
}) => {
    const apiClient = new LayerSwapApiClient()
    const { data: campaignsData } = useSWR<ApiResponse<Campaign[]>>('/campaigns', apiClient.fetcher)

    const now = new Date().getTime()

    const campaign = campaignsData
        ?.data
        ?.find(c =>
            c?.network.name === destination?.name
            && new Date(c?.end_date).getTime() - now > 0)

    if (!campaign || !reward)
        return <></>

    return <CampaignDisplay
        campaign={campaign}
        reward={reward}
    />
}
type CampaignDisplayProps = {
    campaign: Campaign,
    reward: QuoteReward,
}
const CampaignDisplay: FC<CampaignDisplayProps> = ({ campaign, reward }) => {

    const token = campaign.token

    return <FeeDetails.Item>
        <div className='w-full flex items-center justify-between rounded-b-lg bg-secondary-700 relative text-right'>
            <div className='flex items-center text-primary-buttonTextColor'>
                <p>Est. {token?.symbol} Reward</p>
                <ClickTooltip text={<span className="!text-start">The amount of onboarding reward that you’ll earn.</span>} />
            </div>
            <div className="flex items-center space-x-1 text-secondary-text">
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
        </div>
    </FeeDetails.Item>
}

export default Comp