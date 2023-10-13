import { Gift } from "lucide-react";
import { useRouter } from "next/router";
import { FC, useCallback } from "react";
import { ApiResponse } from "../../Models/ApiResponse";
import LayerSwapApiClient, { Campaign } from "../../lib/layerSwapApiClient";
import HeaderWithMenu from "../HeaderWithMenu";
import SpinIcon from "../icons/spinIcon";
import useSWR from 'swr'
import { useSettingsState } from "../../context/settings";
import Image from "next/image";
import LinkWrapper from "../LinkWraapper";
import { Layer } from "../../Models/Layer";

const Rewards = () => {

    const { layers, resolveImgSrc } = useSettingsState()
    const router = useRouter();
    const apiClient = new LayerSwapApiClient()
    const { data: campaignsData, isLoading } = useSWR<ApiResponse<Campaign[]>>('/campaigns', apiClient.fetcher)
    const campaigns = campaignsData?.data
    const now = new Date()

    const activeCampaigns = campaigns?.filter(c => IsCampaignActive) || []
    const inactiveCampaigns = campaigns?.filter(c => !IsCampaignActive) || []
    const handleGoBack = useCallback(() => {
        router.back()
    }, [router])

    return (
        <div className='bg-secondary-900 pb-6 sm:shadow-card rounded-lg text-primary-text overflow-hidden relative min-h-[570px] h-full space-y-5'>
            <HeaderWithMenu goBack={handleGoBack} />
            {!isLoading ?
                <div className="space-y-5 h-full px-6">
                    <div className="space-y-2">
                        <p className="font-bold text-left leading-5">Campaigns</p>
                        <div className="bg-secondary-700 border border-secondary-700 hover:border-secondary-500 transition duration-200 rounded-lg shadow-lg">
                            <div className="p-3 space-y-4">
                                {
                                    activeCampaigns.length > 0 ?
                                        activeCampaigns.map(c =>
                                            <CampaignItem
                                                campaign={c}
                                                layers={layers}
                                                resolveImgSrc={resolveImgSrc}
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
                            <div className="bg-secondary-700 border border-secondary-700 hover:border-secondary-500 transition duration-200 rounded-lg shadow-lg">
                                <div className="p-3 dpsv flex flex-col space-y-4">
                                    {inactiveCampaigns.map(c => {
                                        const campaignLayer = layers.find(l => l.internal_name === c.network)
                                        return (
                                            <LinkWrapper href={`/campaigns/${c.name}`} className="flex items-center justify-between" key={c.name}>
                                                <span className="flex items-center gap-1 hover:opacity-70 active:scale-90 duration-200 transition-all">
                                                    <span className="h-5 w-5 relative">
                                                        {campaignLayer && <Image
                                                            src={resolveImgSrc(campaignLayer)}
                                                            alt="Project Logo"
                                                            height="40"
                                                            width="40"
                                                            loading="eager"
                                                            className="rounded-md object-contain" />}
                                                    </span>
                                                    <span className="font-semibold text-base text-left flex items-center">{c?.display_name} </span>
                                                </span>
                                            </LinkWrapper>
                                        )
                                    })}
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
            <div id="widget_root" />
        </div >
    )
}
type CampaignProps = {
    campaign: Campaign,
    layers: Layer[],
    resolveImgSrc: (item: Layer) => string
}
const CampaignItem: FC<CampaignProps> = ({ campaign, layers, resolveImgSrc }) => {

    const campaignLayer = layers.find(l => l.internal_name === campaign.network)
    const campaignDaysLeft = ((new Date(campaign.end_date).getTime() - new Date().getTime()) / 86400000).toFixed()
    const campaignIsActive = IsCampaignActive(campaign)

    return <LinkWrapper href={`/campaigns/${campaign.name}`}
        className="flex justify-between items-center">
        <span className="flex items-center gap-1 hover:opacity-70 active:scale-90 duration-200 transition-all">
            <span className="h-5 w-5 relative">
                {campaignLayer && <Image
                    src={resolveImgSrc(campaignLayer)}
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
            <span className="text-primary-text-muted text-right text-sm">
                {campaignDaysLeft} days left
            </span>
        }
    </LinkWrapper>
}

function IsCampaignActive(campaign: Campaign) {
    const now = new Date()
    return campaign.status == 'active' && (new Date(campaign?.end_date).getTime() - now.getTime()) > 0
}

export default Rewards