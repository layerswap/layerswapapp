import { Gift } from "lucide-react";
import { FC } from "react";
import { ApiResponse } from "@/Models/ApiResponse";
import LayerSwapApiClient, { Campaign } from "@/lib/apiClients/layerSwapApiClient";
import SpinIcon from "@/components/Icons/spinIcon";
import useSWR from 'swr'
import { Widget } from "@/components/Widget/Index";
import { ImageWithFallback } from "@/components/Common/ImageWithFallback";
import { LayerswapContextProps, LayerswapProvider } from "@/context/LayerswapProvider";

export const CampaignsComponent = ({ onCampaignSelect }: { onCampaignSelect: (campaign: Campaign) => void }) => {

    const apiClient = new LayerSwapApiClient()
    const { data: campaignsData, isLoading } = useSWR<ApiResponse<Campaign[]>>('/campaigns', apiClient.fetcher)
    const campaigns = campaignsData?.data

    const sortedCampaigns = campaigns?.sort((a, b) => {
        const dateA = new Date(a.end_date).getTime();
        const dateB = new Date(b.end_date).getTime();
        return dateA - dateB;
    });

    const activeCampaigns = sortedCampaigns?.filter(IsCampaignActive) || []
    const inactiveCampaigns = sortedCampaigns?.filter(c => !IsCampaignActive(c)) || []

    return (
        <>
            <Widget.Content>
                {!isLoading ?
                    <div className="space-y-5 h-full text-primary-text">
                        <div className="space-y-2">
                            <p className="font-bold text-left leading-5">Campaigns</p>
                            <div className="bg-secondary-500 divide-y divide-secondary-500 rounded-lg shadow-lg border border-secondary-500 hover:border-secondary-400 transition duration-200">
                                <div className="p-3 space-y-4">
                                    {
                                        activeCampaigns.length > 0 ?
                                            activeCampaigns.map(c =>
                                                <CampaignItem
                                                    onCampaignSelect={onCampaignSelect}
                                                    campaign={c}
                                                    key={c.id}
                                                />)
                                            :
                                            <div className="flex flex-col items-center justify-center space-y-2">
                                                <Gift className="h-10 w-10 text-primary" />
                                                <p className="font-bold text-center">There are no active campaigns right now</p>
                                            </div>
                                    }
                                </div>
                            </div>
                        </div>
                        {
                            inactiveCampaigns.length > 0 &&
                            <div className="space-y-2">
                                <p className="font-bold text-left leading-5">Old campaigns</p>
                                <div className="bg-secondary-500 divide-y divide-secondary-500 rounded-lg shadow-lg border border-secondary-500 hover:border-secondary-400 transition duration-200">
                                    <div className="p-3 dpsv flex flex-col space-y-4">
                                        {inactiveCampaigns?.map(c =>
                                            <CampaignItem
                                                onCampaignSelect={onCampaignSelect}
                                                campaign={c}
                                                key={c.id}
                                            />)}
                                    </div >
                                </div >
                            </div >
                        }
                    </div >
                    :
                    <div className="absolute top-[calc(50%-5px)] left-[calc(50%-5px)]">
                        <SpinIcon className="animate-spin h-5 w-5" />
                    </div>
                }
            </Widget.Content>
        </>
    )
}
type CampaignProps = {
    campaign: Campaign,
    onCampaignSelect: (campaign: Campaign) => void
}
const CampaignItem: FC<CampaignProps> = ({ campaign, onCampaignSelect }) => {

    const campaignDaysLeft = ((new Date(campaign.end_date).getTime() - new Date().getTime()) / 86400000).toFixed()
    const campaignIsActive = IsCampaignActive(campaign)

    return <div
        onClick={() => onCampaignSelect(campaign)}
        className="flex justify-between items-center">
        <span className="flex items-center gap-1 hover:opacity-70 active:scale-90 duration-200 transition-all">
            <span className="h-5 w-5 relative">
                {(campaign.logo_url || campaign.network.logo) && <ImageWithFallback
                    src={(campaign.logo_url || campaign.network.logo) as string}
                    alt="Project Logo"
                    height="40"
                    width="40"
                    loading="eager"
                    className="rounded-md object-contain" />}
            </span>
            <span className="font-semibold text-base text-left flex items-center">{campaign?.display_name} </span>
        </span>
        {
            campaignIsActive &&
            <span className="text-primary-text-tertiary text-right text-sm">
                {campaignDaysLeft} days left
            </span>
        }
    </div>
}

function IsCampaignActive(campaign: Campaign) {
    const now = new Date()
    return (new Date(campaign?.end_date).getTime() > now.getTime())
}

export const Campaigns: FC<LayerswapContextProps & { hideMenu?: boolean; goBack: () => void, onCampaignSelect: (campaign: Campaign) => void }> = (props) => {
    return (
        <LayerswapProvider {...props}>
            <Widget goBack={props.goBack} hideMenu={props.hideMenu}>
                <CampaignsComponent onCampaignSelect={props.onCampaignSelect} />
            </Widget>
        </LayerswapProvider>
    )
}