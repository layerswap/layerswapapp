import { useRouter } from "next/router"
import { useCallback, useEffect, useState } from "react"
import { useSettingsState } from "../context/settings"
import Image from 'next/image'
import LayerswapMenu from "./LayerswapMenu"
import GoHomeButton from "./utils/GoHome";
import BackgroundField from "./backgroundField";
import { ArrowLeft, Clock } from "lucide-react"
import LayerSwapApiClient, { Reward } from "../lib/layerSwapApiClient"
import makeBlockie from "ethereum-blockies-base64"

function RewardsComponent() {

    const settings = useSettingsState()
    const router = useRouter();
    const { discovery: { resource_storage_url } } = settings || { discovery: {} }
    const [rewardsData, setRewardsData] = useState<Reward>()

    useEffect(() => {
        const fetchRewards = async () => {
            const apiClient = new LayerSwapApiClient()
            const data = await apiClient.Rewards('OPTIMISM2023')
            setRewardsData(data.data)
        }

        fetchRewards()
    }, [])


    const difference_in_days = Math.round(Math.abs(((new Date(rewardsData?.next_airdrop_date).getTime() - new Date().getTime())) / (1000 * 3600 * 24)))

    const handleGoBack = useCallback(() => {
        router.back()
    }, [router])

    return (
        <div className='bg-darkblue px-6 sm:px-8 pb-6 sm:mb-10 sm:shadow-card rounded-lg sm:mx-24 text-white overflow-hidden relative min-h-[400px] space-y-5'>
            <div className="mt-3 flex items-center justify-between z-20" >
                <button onClick={handleGoBack} className="self-start md:mt-2">
                    <ArrowLeft className='h-5 w-5 text-primary-text hover:text-darkblue-500 cursor-pointer' />
                </button>
                <div className="hidden md:block">
                    <p className="font-bold text-2xl">Optimism Rewards</p>
                </div>
                <div className='mx-auto px-4 overflow-hidden md:hidden'>
                    <div className="flex justify-center imxMarketplace:hidden">
                        <GoHomeButton />
                    </div>
                </div>
                <LayerswapMenu />
            </div>
            <div className="space-y-5">
                <div className="text-center md:hidden block">
                    <p className="font-bold text-2xl">Optimism Rewards</p>
                </div>
                <div className=" bg-darkblue-700 divide-y divide-darkblue-300 rounded-lg shadow-lg border border-darkblue-700 hover:border-darkblue-500 transition duration-200">
                    <BackgroundField header={<span className="flex justify-between"><span>Pending Earnings</span><span>Next Airdrop</span></span>} withoutBorder>
                        <div className="flex justify-between w-full text-2xl">
                            <div className="flex items-center space-x-1">
                                <div className="h-5 w-5 relative">
                                    <Image
                                        src={`${resource_storage_url}/layerswap/currencies/${settings.campaigns[0].asset.toLowerCase()}.png`}
                                        alt="Project Logo"
                                        height="40"
                                        width="40"
                                        loading="eager"
                                        className="rounded-md object-contain" />
                                </div>
                                <p>
                                    {rewardsData?.user_reward.pending_amount}
                                </p>
                            </div>
                            <div className="flex items-center space-x-1">
                                <Clock className="h-5" />
                                <p>
                                    {difference_in_days} days
                                </p>
                            </div>
                        </div>
                    </BackgroundField>
                    <BackgroundField header={<span className="flex justify-between"><span>Total Earnings</span><span>Current Value</span></span>} withoutBorder>
                        <div className="flex justify-between w-full text-slate-300 text-2xl">
                            <div className="flex items-center space-x-1">
                                <div className="h-5 w-5 relative">
                                    <Image
                                        src={`${resource_storage_url}/layerswap/currencies/${settings.campaigns[0].asset.toLowerCase()}.png`}
                                        alt="Project Logo"
                                        height="40"
                                        width="40"
                                        loading="eager"
                                        className="rounded-md object-contain" />
                                </div>
                                <p>
                                    {rewardsData?.user_reward.total_amount}
                                </p>
                            </div>
                            <p>
                                {settings.currencies.find(c => c.asset === settings.campaigns[0].asset).usd_price}$
                            </p>
                        </div>
                    </BackgroundField>
                </div>
                <div>
                    <button className="rounded-lg bg-[#cd031b] tracking-wide hover:opacity-80 transition duration-200 text-white text-lg w-full py-3">
                        Claim your reward
                    </button>
                </div>
                {/* <div className="space-y-2">
                    <p className="text-2xl font-semibold">My Stats</p>
                    <div className="space-x-3 flex rounded-lg text-2xl">
                        <div className="bg-darkblue-700 shadow-lg border border-darkblue-700 hover:border-darkblue-500 transition duration-200 rounded-lg">
                            <BackgroundField header='Position' withoutBorder>
                                <p>
                                    #120
                                </p>
                            </BackgroundField>
                        </div>
                        <div className="bg-darkblue-700 flex-1 shadow-lg border border-darkblue-700 hover:border-darkblue-500 transition duration-200 rounded-lg">
                            <BackgroundField header='Swapped' withoutBorder>
                                <p>
                                    21,456.674$
                                </p>
                            </BackgroundField>
                        </div>
                    </div>
                </div> */}
                <div className="space-y-2">
                    <p className="font-bold text-2xl">Leaderboard</p>
                    <div className="bg-darkblue-700 border border-darkblue-700 hover:border-darkblue-500 transition duration-200 rounded-lg">
                        <div className="p-3">
                            <div className="space-y-6">
                                {
                                    rewardsData?.leaderboard?.map(user => (
                                        <div key={user.user_id} className="items-center flex justify-between">
                                            <div className="flex items-center">
                                                <p className="text-xl font-medium text-white w-6">{user.position}.</p>
                                                <div className="cols-start-2 flex items-center space-x-2">
                                                    <img className="flex-shrink-0 object-cover w-8 h-8 rounded-full border-2 border-darkblue-100" src={makeBlockie(user.amount.toString())} alt="" />
                                                    <div>
                                                        <p className="text-sm font-bold text-white leading-3">Traxadrom 3000</p>
                                                        <p className="mt-1 text-sm font-medium text-primary-text leading-3">{user.amount} {settings.campaigns[0].asset}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* <div className="text-right ">
                                                <p className="mt-1 text-sm font-medium text-primary-text/70 truncate">{user.position}</p>
                                            </div> */}
                                        </div>
                                    ))

                                }

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default RewardsComponent;