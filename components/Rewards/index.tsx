import { Gift } from "lucide-react";
import { useRouter } from "next/router";
import { useCallback } from "react";
import { ApiResponse } from "../../Models/ApiResponse";
import LayerSwapApiClient, { Campaigns } from "../../lib/layerSwapApiClient";
import HeaderWithMenu from "../HeaderWithMenu";
import SpinIcon from "../icons/spinIcon";
import useSWR from 'swr'

const RewardComponentWrapper = () => {

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
        <div className='bg-secondary-900 pb-6 sm:shadow-card rounded-lg text-white overflow-hidden relative min-h-[500px] h-full space-y-5'>
            <HeaderWithMenu goBack={handleGoBack} />
            {!isLoading ?
                <div className="space-y-5 h-full px-6">
                    <div className="space-y-2">
                        <p className="font-bold text-left leading-5">Active campaigns</p>
                        <div className="bg-secondary-700 border border-secondary-700 hover:border-secondary-500 transition duration-200 rounded-lg shadow-lg">
                            <div className="p-3">
                                {
                                    activeCampaigns?.length > 0 ?
                                        <div>
                                        </div>
                                        :
                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <Gift className="h-20 w-20 text-primary" />
                                            <p className="font-bold text-center">There are no active campaigns right now</p>
                                        </div>
                                }
                            </div>
                        </div>
                    </div>
                    {
                        inactiveCampaigns?.length > 0 &&
                        <div className="space-y-2">
                            <p className="font-bold text-left leading-5">Inactive campaigns</p>
                            <div className="bg-secondary-700 border border-secondary-700 hover:border-secondary-500 transition duration-200 rounded-lg shadow-lg">
                                <div className="p-3">
                                    {inactiveCampaigns.map(c => (
                                        <div>
                                            {c.name}
                                        </div>
                                    ))}
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

export default RewardComponentWrapper