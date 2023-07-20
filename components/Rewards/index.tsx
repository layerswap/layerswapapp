import { Gift } from "lucide-react";
import { useRouter } from "next/router";
import { useCallback } from "react";
import { ApiResponse } from "../../Models/ApiResponse";
import LayerSwapApiClient, { Campaigns } from "../../lib/layerSwapApiClient";
import HeaderWithMenu from "../HeaderWithMenu";
import SpinIcon from "../icons/spinIcon";
import useSWR from 'swr'
import Link from "next/link";
import { useSettingsState } from "../../context/settings";
import Image from "next/image";

const Rewards = () => {

    const { layers, resolveImgSrc } = useSettingsState()
    const router = useRouter();
    const apiClient = new LayerSwapApiClient()
    const { data: campaignsData, isLoading } = useSWR<ApiResponse<Campaigns[]>>('/campaigns', apiClient.fetcher)
    const campaigns = campaignsData?.data
    const now = new Date()

    const activeCampaigns = campaigns?.filter(c => Math.round(((new Date(c?.end_date).getTime() - now.getTime()) / (1000 * 3600 * 24))) < 0 ? false : true)
    const inactiveCampaigns = campaigns?.filter(c => Math.round(((new Date(c?.end_date).getTime() - now.getTime()) / (1000 * 3600 * 24))) < 0 ? true : false)

    const handleGoBack = useCallback(() => {
        router.back()
    }, [router])

    return (
        <div className='bg-secondary-900 pb-6 sm:shadow-card rounded-lg text-white overflow-hidden relative min-h-[530px] h-full space-y-5'>
            <HeaderWithMenu goBack={handleGoBack} />
            {!isLoading ?
                <div className="space-y-5 h-full px-6">
                    <div className="space-y-2">
                        <p className="font-bold text-left leading-5">Campaigns</p>
                        <div className="bg-secondary-700 border border-secondary-700 hover:border-secondary-500 transition duration-200 rounded-lg shadow-lg">
                            <div className="p-3">
                                {
                                    activeCampaigns?.length > 0 ?
                                        activeCampaigns.map(c => {
                                            const campaignLayer = layers?.find(l => l.internal_name === c.network)

                                            return (
                                                <Link href={`/campaigns/${c.name}`} className="flex " key={c.name}>
                                                    <span className="flex items-center gap-1 hover:opacity-70 active:scale-90 duration-200 transition-all">
                                                        <span className="h-5 w-5 relative">
                                                            <Image
                                                                src={resolveImgSrc(campaignLayer)}
                                                                alt="Project Logo"
                                                                height="40"
                                                                width="40"
                                                                loading="eager"
                                                                className="rounded-md object-contain" />
                                                        </span>
                                                        <span className="font-semibold text-base text-left flex items-center">{c?.display_name} </span>
                                                    </span>
                                                </Link>
                                            )
                                        })
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
                        inactiveCampaigns?.length > 0 &&
                        <div className="space-y-2">
                            <p className="font-bold text-left leading-5">Old campaigns</p>
                            <div className="bg-secondary-700 border border-secondary-700 hover:border-secondary-500 transition duration-200 rounded-lg shadow-lg">
                                <div className="p-3 flex flex-col space-y-2">
                                    {inactiveCampaigns.map(c => {
                                        const campaignLayer = layers?.find(l => l.internal_name === c.network)
                                        const campaignEndDate = new Date(c.end_date).toLocaleDateString()

                                        return (
                                            <Link href={`/campaigns/${c.name}`} className="flex items-center justify-between" key={c.name}>
                                                <span className="flex items-center gap-1 hover:opacity-70 active:scale-90 duration-200 transition-all">
                                                    <span className="h-5 w-5 relative">
                                                        <Image
                                                            src={resolveImgSrc(campaignLayer)}
                                                            alt="Project Logo"
                                                            height="40"
                                                            width="40"
                                                            loading="eager"
                                                            className="rounded-md object-contain" />
                                                    </span>
                                                    <span className="font-semibold text-base text-left flex items-center">{c?.display_name} </span>
                                                </span>
                                                <span className="text-primary-text-muted">
                                                    {campaignEndDate}
                                                </span>
                                            </Link>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    }
                </div>
                :
                <div className="absolute top-[calc(50%-5px)] left-[calc(50%-5px)]">
                    <SpinIcon className="animate-spin h-5 w-5" />
                </div>
            }
            <div id="widget_root" />
        </div >
    )
}

export default Rewards