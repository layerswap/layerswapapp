import { FC } from "react"
import LayerSwapApiClient, { Campaign } from "../../lib/layerSwapApiClient"
import useSWR from "swr"
import { ApiResponse } from "../../Models/ApiResponse"
import { useSettingsState } from "../../context/settings"
import { truncateDecimals } from "../utils/RoundDecimals"
import { motion } from "framer-motion"
import ClickTooltip from "../Tooltips/ClickTooltip"
import Image from 'next/image';
import { Network, Token } from "../../Models/Network"

type CampaignProps = {
    destination: Network,
    reward: number | undefined,
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
    reward: number,
}
const CampaignDisplay: FC<CampaignDisplayProps> = ({ campaign, reward }) => {

    const network = campaign.network
    const token = campaign.token

    return <motion.div
        initial={{ y: "-100%" }}
        animate={{
            y: 0,
            transition: { duration: 0.3, ease: [0.36, 0.66, 0.04, 1] },
        }}
        exit={{
            y: "-100%",
            transition: { duration: 0.4, ease: [0.36, 0.66, 0.04, 1] },
        }}
        className='w-full flex items-center justify-between rounded-b-lg bg-secondary-700  relative bottom-2 z-0 pt-4 pb-2 px-3.5 text-right'>
        <div className='flex items-center'>
            <p>Est. {token?.symbol} Reward</p>
            <ClickTooltip text={<span><span>The amount of onboarding reward that you’ll earn.&nbsp;</span><a target='_blank' href='/campaigns' className='text-primary underline hover:no-underline decoration-primary cursor-pointer'>Learn more</a></span>} />
        </div>
        {
            Number(reward) > 0 &&
            <div className="flex items-center space-x-1">
                <span>+</span>
                <div className="h-5 w-5 relative">
                    <Image
                        src={network?.logo || ''}
                        alt="Project Logo"
                        height="40"
                        width="40"
                        loading="eager"
                        className="rounded-md object-contain" />
                </div>
                <p>
                    {reward} {token?.symbol}
                </p>
            </div>
        }
    </motion.div>
}

export default Comp