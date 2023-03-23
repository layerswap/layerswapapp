import { useRouter } from "next/router"
import { useCallback } from "react"
import { ArrowLeftIcon, ClockIcon } from '@heroicons/react/outline';
import { useSettingsState } from "../context/settings"
import Image from 'next/image'
import LayerswapMenu from "./LayerswapMenu"
import GoHomeButton from "./utils/GoHome";
import BackgroundField from "./backgroundField";

function RewardsComponent() {

    const settings = useSettingsState()
    const router = useRouter();
    const { discovery: { resource_storage_url } } = settings || { discovery: {} }

    const handleGoBack = useCallback(() => {
        router.back()
    }, [router])

    return (
        <div className='bg-darkblue px-6 sm:px-8 pb-6 sm:mb-10 sm:shadow-card rounded-lg sm:mx-24 text-white overflow-hidden relative min-h-[400px] space-y-5'>
            <div className="mt-3 flex items-center justify-between z-20" >
                <button onClick={handleGoBack} className="self-start md:mt-2">
                    <ArrowLeftIcon className='h-5 w-5 text-primary-text hover:text-darkblue-500 cursor-pointer' />
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
                <div className=" bg-darkblue-700 divide-y divide-darkblue-300 rounded-lg shadow-lg">
                    <BackgroundField header={<span className="flex justify-between"><span>Pending Earnings</span><span>Next Airdrop</span></span>} withoutBorder>
                        <div className="flex justify-between w-full text-2xl">
                            <div className="flex items-center space-x-1">
                                <div className="h-5 w-5 relative">
                                    <Image
                                        src={`${resource_storage_url}/layerswap/networks/optimism_mainnet.png`}
                                        alt="Project Logo"
                                        height="40"
                                        width="40"
                                        loading="eager"
                                        className="rounded-md object-contain" />
                                </div>
                                <p>
                                    69.228
                                </p>
                            </div>
                            <div className="flex items-center space-x-1">
                                <ClockIcon className="h-5" />
                                <p>
                                    6d 5h
                                </p>
                            </div>
                        </div>
                    </BackgroundField>
                    <BackgroundField header={<span className="flex justify-between"><span>Total Earnings</span><span>Current Value</span></span>} withoutBorder>
                        <div className="flex justify-between w-full text-slate-300 text-2xl">
                            <div className="flex items-center space-x-1">
                                <div className="h-5 w-5 relative">
                                    <Image
                                        src={`${resource_storage_url}/layerswap/networks/optimism_mainnet.png`}
                                        alt="Project Logo"
                                        height="40"
                                        width="40"
                                        loading="eager"
                                        className="rounded-md object-contain" />
                                </div>
                                <p>
                                    420.603
                                </p>
                            </div>
                            <p>
                                520.69$
                            </p>
                        </div>
                    </BackgroundField>
                </div>
                <div>
                    <button className="rounded-lg bg-[#cd031b] tracking-wide hover:opacity-80 transition duration-200 text-white text-lg w-full py-3">
                        Claim your reward
                    </button>
                </div>
                <div className="space-y-2">
                    <p className="text-2xl font-semibold">My Stats</p>
                    <div className="space-x-3 flex rounded-lg shadow-lg text-2xl">
                        <div className="bg-darkblue-700 rounded-lg">
                            <BackgroundField header='Position' withoutBorder>
                                <p>
                                    #120
                                </p>
                            </BackgroundField>
                        </div>
                        <div className="bg-darkblue-700 rounded-lg flex-1">
                            <BackgroundField header='Swapped' withoutBorder>
                                <p>
                                    21,456.674$
                                </p>
                            </BackgroundField>
                        </div>
                    </div>
                </div>
                <div>
                    <p className="font-bold text-2xl">Leaderboard</p>
                    <div className="mx-auto max-w-7xl">
                        <div className="max-w-lg mx-auto">
                            <div className="bg-white border border-gray-200 rounded-xl">
                                <div className="px-4 py-5 sm:p-6">
                                    <div className="flex items-center justify-between">
                                        <p className="text-lg font-bold text-gray-900">Top users</p>

                                        <a href="#" title="" className="inline-flex items-center text-xs font-semibold tracking-widest text-gray-500 uppercase hover:text-gray-900">
                                            See all
                                            <svg className="w-4 h-4 ml-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                                            </svg>
                                        </a>
                                    </div>

                                    <div className="mt-8 space-y-6">
                                        <div className="flex items-center justify-between space-x-5">
                                            <div className="flex items-center flex-1 min-w-0">
                                                <img className="flex-shrink-0 object-cover w-10 h-10 rounded-full" src="https://landingfoliocom.imgix.net/store/collection/clarity-dashboard/images/table-stacked/2/avatar-female.png" alt="" />
                                                <div className="flex-1 min-w-0 ml-4">
                                                    <p className="text-sm font-bold text-gray-900">Darrell Steward</p>
                                                    <p className="mt-1 text-sm font-medium text-gray-500">D.rivera@example.com</p>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <p className="text-sm font-medium text-gray-900">$12,399</p>
                                                <p className="mt-1 text-sm font-medium text-gray-500 truncate">Fairfield</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between space-x-5">
                                            <div className="flex items-center flex-1 min-w-0">
                                                <img className="flex-shrink-0 object-cover w-10 h-10 rounded-full" src="https://landingfoliocom.imgix.net/store/collection/clarity-dashboard/images/table-stacked/2/avatar-male.png" alt="" />
                                                <div className="flex-1 min-w-0 ml-4">
                                                    <p className="text-sm font-bold text-gray-900">Jenny Wilson</p>
                                                    <p className="mt-1 text-sm font-medium text-gray-500">w.lawson@example.com</p>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <p className="text-sm font-medium text-gray-900">$11,234</p>
                                                <p className="mt-1 text-sm font-medium text-gray-500 truncate">Austin</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between space-x-5">
                                            <div className="flex items-center flex-1 min-w-0">
                                                <img className="flex-shrink-0 object-cover w-10 h-10 rounded-full" src="https://landingfoliocom.imgix.net/store/collection/clarity-dashboard/images/table-stacked/2/avatar-male-2.png" alt="" />
                                                <div className="flex-1 min-w-0 ml-4">
                                                    <p className="text-sm font-bold text-gray-900">Devon Lane</p>
                                                    <p className="mt-1 text-sm font-medium text-gray-500 truncate">dat.roberts@example.com</p>
                                                </div>
                                            </div>

                                            <div className="flex-shrink-0 text-right">
                                                <p className="text-sm font-medium text-gray-900">$11,159</p>
                                                <p className="mt-1 text-sm font-medium text-gray-500 truncate">New York</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between space-x-5">
                                            <div className="flex items-center flex-1 min-w-0">
                                                <img className="flex-shrink-0 object-cover w-10 h-10 rounded-full" src="https://landingfoliocom.imgix.net/store/collection/clarity-dashboard/images/table-stacked/2/avatar-female-2.png" alt="" />
                                                <div className="flex-1 min-w-0 ml-4">
                                                    <p className="text-sm font-bold text-gray-900">Jane Cooper</p>
                                                    <p className="mt-1 text-sm font-medium text-gray-500 truncate">jgraham@example.com</p>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <p className="text-sm font-medium text-gray-900">$10,483</p>
                                                <p className="mt-1 text-sm font-medium text-gray-500">Toledo</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between space-x-5">
                                            <div className="flex items-center flex-1 min-w-0">
                                                <img className="flex-shrink-0 object-cover w-10 h-10 rounded-full" src="https://landingfoliocom.imgix.net/store/collection/clarity-dashboard/images/table-stacked/2/avatar-male-3.png" alt="" />
                                                <div className="flex-1 min-w-0 ml-4">
                                                    <p className="text-sm font-bold text-gray-900">Dianne Russell</p>
                                                    <p className="mt-1 text-sm font-medium text-gray-500 truncate">curtis.d@example.com</p>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <p className="text-sm font-medium text-gray-900">$9,084</p>
                                                <p className="mt-1 text-sm font-medium text-gray-500">Naperville</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default RewardsComponent;