import { FC, useCallback } from "react"
import { Gift } from "lucide-react"
import LayerSwapApiClient, { Campaign } from "../../../../lib/layerSwapApiClient"
import useSWR from "swr"
import { ApiResponse } from "../../../../Models/ApiResponse"
import SubmitButton from "../../../Buttons/submitButton";
import WalletIcon from "../../../Icons/WalletIcon";
import { Widget } from "../../../Widget/Index";
import Leaderboard from "./Leaderboard"
import Rewards from "./Rewards";
import SpinIcon from "../../../Icons/spinIcon"
import useWallet from "../../../../hooks/useWallet"
import AppWrapper, { AppPageProps } from "../../../AppWrapper"

export const CampaignDetailsComponent: FC<{ campaignName: string }> = ({ campaignName }) => {

    const apiClient = new LayerSwapApiClient()
    const { data: campaignsData, isLoading } = useSWR<ApiResponse<Campaign[]>>('/campaigns', apiClient.fetcher)
    const campaign = campaignsData?.data?.find(c => c.name === campaignName)
    const network = campaign?.network

    const { provider } = useWallet(network, 'autofil')

    const handleConnect = useCallback(async () => {
        await provider?.connectWallet()
    }, [provider, network])

    const wallet = provider?.activeWallet
    const isConnected = !!wallet?.address

    if (isLoading) {
        return <Loading />
    }

    if (!campaign) {
        return <NotFound />
    }

    return (
        <>
            <Widget.Content>
                <div className="space-y-5">
                    <div className="flex items-center gap-1">
                        <div className="h-7 w-7 relative">
                            {(campaign.logo_url || network?.logo) && <img
                                src={(campaign.logo_url || network?.logo) as string}
                                alt="Project Logo"
                                height="40"
                                width="40"
                                loading="eager"
                                className="rounded-md object-contain" />}
                        </div>
                        <p className="font-bold text-xl text-left flex items-center text-primary-text">
                            {campaign.display_name}
                        </p>
                    </div>
                    {
                        isConnected ?
                            <Rewards campaign={campaign} />
                            :
                            <BriefInformation campaign={campaign} />
                    }
                    <Leaderboard campaign={campaign} />
                </div>
            </Widget.Content>
            <>
                {
                    !isConnected &&
                    <Widget.Footer>
                        <SubmitButton isDisabled={false} isSubmitting={false} onClick={handleConnect} icon={<WalletIcon className="stroke-2 w-6 h-6" />}>
                            Connect a wallet
                        </SubmitButton>
                    </Widget.Footer>
                }
            </>
        </>
    )
}

type BriefInformationProps = {
    campaign: Campaign,
}
const BriefInformation: FC<BriefInformationProps> = ({ campaign }) =>
    <p className="text-secondary-text text-base">
        {campaign.description ?
            campaign.description
            :
            <>
                <span>You can earn $</span>
                <span>{campaign?.token.symbol}</span>
                <span>&nbsp;tokens by transferring assets to&nbsp;</span>
                <span>{campaign.network.display_name}.</span>
                <span> For each transaction, you&#39;ll receive&nbsp;</span>
                <span>{campaign?.percentage}</span>
                <span>% of paid fees back.&nbsp;</span>
            </>
        }
    </p>

const Loading = () => <Widget.Content>
    <div className="absolute top-[calc(50%-5px)] left-[calc(50%-5px)]">
        <SpinIcon className="animate-spin h-5 w-5" />
    </div>
</Widget.Content>

const NotFound = () => <Widget.Content>
    <div className="h-[364px] flex flex-col items-center justify-center space-y-4">
        <Gift className="h-20 w-20 text-primary" />
        <p className="font-bold text-center">Campaign not found</p>
        <a className="text-xs underline hover:no-underline" href='/campaigns'>See all campaigns</a>
    </div>
</Widget.Content>


export const CampaignDetailsPage: FC<AppPageProps & { campaignName: string }> = (props) => {
    return (
        <AppWrapper {...props}>
            <Widget>
                <CampaignDetailsComponent campaignName={props.campaignName} />
            </Widget>
        </AppWrapper>
    )
}