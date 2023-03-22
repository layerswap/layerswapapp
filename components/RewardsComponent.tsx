import { useRouter } from "next/router"
import { useCallback, useEffect, useState } from "react"
import { ArrowLeftIcon, ClockIcon, ExclamationCircleIcon } from '@heroicons/react/outline';
import { Combobox } from "@headlessui/react"
import { useSettingsState } from "../context/settings"
import LayerswapApiClient from "../lib/layerSwapApiClient"
import Image from 'next/image'
import { Exchange } from "../Models/Exchange"
import ConnectApiKeyExchange from "./connectApiKeyExchange"
import LayerswapMenu from "./LayerswapMenu"
import SubmitButton from "./buttons/submitButton";
import { useAuthState } from "../context/authContext";
import toast from "react-hot-toast";
import shortenAddress, { shortenEmail } from "./utils/ShortenAddress";
import { ExchangesComponentSceleton } from "./Sceletons";
import Modal from "./modalComponent";
import ExchangeSettings from "../lib/ExchangeSettings";
import KnownInternalNames from "../lib/knownIds";
import GoHomeButton from "./utils/GoHome";
import ClickTooltip from "./Tooltips/ClickTooltip";
import ConnectOauthExchange from "./connectOauthExchange";
import BackgroundField from "./backgroundField";

interface UserExchange extends Exchange {
    note?: string,
    is_connected: boolean
}

function RewardsComponent() {

    const settings = useSettingsState()
    const router = useRouter();
    const { discovery: { resource_storage_url } } = settings || { discovery: {} }

    const handleGoBack = useCallback(() => {
        router.back()
    }, [router])

    return (
        <div className='bg-darkblue px-6 sm:px-8 sm:shadow-card rounded-lg w-full text-white overflow-hidden relative min-h-[400px] space-y-5'>
            <div className="mt-3 flex items-center justify-between z-20" >
                <div className="flex">
                    <button onClick={handleGoBack} className="self-start md:mt-2">
                        <ArrowLeftIcon className='h-5 w-5 text-primary-text hover:text-darkblue-500 cursor-pointer' />
                    </button>
                </div>
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
            <div className="space-y-3">
                <div className="text-center md:hidden block">
                    <p className="font-bold text-2xl">Optimism Rewards</p>
                </div>
                <div className="rounded-md bg-darkblue-700 border border-darkblue-300 divide-y divide-darkblue-300">
                    <div className="flex items-center">
                        <BackgroundField header='Pending Earnings' withoutBorder>
                            <div className="flex items-center space-x-1">
                                <div className="h-4 w-4 relative">
                                    <Image
                                        src={`${resource_storage_url}/layerswap/networks/optimism_mainnet.png`}
                                        alt="Project Logo"
                                        height="40"
                                        width="40"
                                        loading="eager"
                                        className="rounded-md object-contain" />
                                </div>
                                <p className='text-lg font-medium'>
                                    69
                                </p>
                            </div>
                        </BackgroundField>
                        <BackgroundField header='Next Airdrop' withoutBorder>
                            <div className="flex items-center space-x-1">
                                <ClockIcon className="h-5" />
                                <p className='text-lg font-medium'>
                                    6d 5h
                                </p>
                            </div>
                        </BackgroundField>
                    </div>
                    <BackgroundField header='Total Earnings' withoutBorder>
                        <div className="flex items-center space-x-1">
                            <div className="h-4 w-4 relative">
                                <Image
                                    src={`${resource_storage_url}/layerswap/networks/optimism_mainnet.png`}
                                    alt="Project Logo"
                                    height="40"
                                    width="40"
                                    loading="eager"
                                    className="rounded-md object-contain" />
                            </div>
                            <p className='text-lg font-medium text-white/70'>
                                420
                            </p>
                        </div>
                    </BackgroundField>
                </div>
            </div>
        </div>
    )
}

export default RewardsComponent;