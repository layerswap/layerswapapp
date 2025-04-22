import { FC } from "react"
import useSWR from "swr"
import FeeDetails from "./FeeDetailsComponent"
import LayerSwapApiClient, { Campaign, QuoteReward } from "../../../../../lib/layerSwapApiClient";
import useSWRNftBalance from "../../../../../lib/nft/useSWRNftBalance";
import { Network } from "../../../../../Models/Network";
import ClickTooltip from "../../../../Common/ClickTooltip";
import { ApiResponse } from "../../../../../Models/ApiResponse";

type CampaignProps = {
    destination: Network,
    reward: QuoteReward | undefined,
    destinationAddress?: string
}

const Comp: FC<CampaignProps> = ({
    destination,
    reward,
    destinationAddress
}) => {
    const apiClient = new LayerSwapApiClient()
    const { data: campaignsData } = useSWR<ApiResponse<Campaign[]>>('/campaigns', apiClient.fetcher)

    const now = new Date().getTime()

    const campaign = campaignsData
        ?.data
        ?.find(c =>
            c?.network.name === destination?.name
            && new Date(c?.end_date).getTime() - now > 0)

    if (!campaign || !reward || !destinationAddress)
        return <></>

    return <CampaignDisplay
        campaign={campaign}
        reward={reward}
        destinationAddress={destinationAddress}
        destination={destination}
    />
}

type CampaignDisplayProps = {
    campaign: Campaign,
    reward: QuoteReward,
    destinationAddress: string,
    destination: Network
}

const CampaignDisplay: FC<CampaignDisplayProps> = ({ campaign, reward, destinationAddress, destination }) => {
    const token = campaign.token

    const shouldCheckNFT = reward.campaign_type === "for_nft_holders" && reward.nft_contract_address;

    const { balance: nftBalance, isLoading, error } = useSWRNftBalance(
        destinationAddress,
        destination,
        reward.nft_contract_address || ''
    );

    if (shouldCheckNFT && (isLoading || error || nftBalance <= 0)) {
        return null;
    }

    return <FeeDetails.Item>
        <div className='w-full flex items-center justify-between rounded-b-lg bg-secondary-700 relative text-right'>
            <div className='flex items-center text-primary-buttonTextColor'>
                <p>{token?.symbol} reward</p>
                <ClickTooltip text={<span className="!text-start">
                    {reward.campaign_type === "for_nft_holders" 
                        ? "The amount of reward that you'll earn as an NFT holder." 
                        : "The amount of reward that you'll earn."}
                </span>} />
            </div>
            <div className="flex items-center space-x-1 text-secondary-text">
                <p>{reward.amount}</p>
                <div className="h-5 w-5 relative">
                    <img
                        src={token?.logo || ''}
                        alt="Project Logo"
                        height="40"
                        width="40"
                        loading="eager"
                        className="rounded-md object-contain" />
                </div>
                <p>
                    {token?.symbol}
                </p>
            </div>
        </div>
    </FeeDetails.Item>
}

export default Comp