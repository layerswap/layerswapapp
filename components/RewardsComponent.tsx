import { useRouter } from "next/router"
import { SetStateAction, useCallback, useState } from "react"
import { useSettingsState } from "../context/settings"
import Image from 'next/image'
import LayerswapMenu from "./LayerswapMenu"
import GoHomeButton from "./utils/GoHome";
import BackgroundField from "./backgroundField";
import { ArrowLeft, Clock, Gift, Trophy } from "lucide-react"
import LayerSwapApiClient, { Reward } from "../lib/layerSwapApiClient"
import makeBlockie from "ethereum-blockies-base64"
import { RewardsComponentSceleton } from "./Sceletons"
import useSWR from "swr"
import { ApiResponse } from "../Models/ApiResponse"
import IconButton from "./buttons/iconButton"
import ClickTooltip from "./Tooltips/ClickTooltip"
import Modal from "./modalComponent"
import SlideOver from "./SlideOver"
import SubmitButton from "./buttons/submitButton"
import toast from "react-hot-toast"

function RewardsComponent() {

    const settings = useSettingsState()
    const router = useRouter();
    const { discovery: { resource_storage_url } } = settings || { discovery: {} }
    const [openTopModal, setOpenTopModal] = useState(false)
    const [openRewardModal, setOpenRewardModal] = useState(false)
    const [loading, setLoading] = useState(false)

    const apiClient = new LayerSwapApiClient()
    const { data } = useSWR<ApiResponse<Reward>>('/campaigns/OPTIMISM2023', apiClient.fetcher)
    const rewardsData = data?.data

    const next = new Date(rewardsData?.next_airdrop_date)
    const now = new Date()
    const difference_in_days = Math.round(Math.abs(((next.getTime() - now.getTime())) / (1000 * 3600 * 24)))
    const difference_in_hours = Math.round(Math.abs(((next.getTime() - now.getTime())) / (1000 * 3600))) - (difference_in_days * 24)

    const handleOpenTopModal = () => {
        setOpenTopModal(true)
    }

    const handleOpenRewardModal = () => {
        setOpenRewardModal(true)
    }

    const handleCloseRewardModal = () => {
        setOpenRewardModal(false)
    }

    const handleGoBack = useCallback(() => {
        router.back()
    }, [router])

    const handleRewardSubmit = useCallback(async () => {
        try {
            setLoading(true)
            const layerswapApiClient = new LayerSwapApiClient();
            const addressSubmit = await layerswapApiClient.SubmitRewardAddress('/campaigns/OPTIMISM2023', '0xE4Dc4bbDB1595f0255A05037F354c149cC5654B4')
            if (!addressSubmit.error) handleCloseRewardModal()
        }
        catch (error) {
            if (error.response?.data?.errors?.length > 0) {
                const message = error.response.data.errors.map(e => e.message).join(", ")
                toast.error(message)
            }
            else {
                toast.error(error.message)
            }
        } finally {
            setLoading(false)
        }
    }, [])

    return (
        <>
            <div className='bg-darkblue px-6 sm:px-8 pb-6 sm:mb-10 sm:shadow-card rounded-lg sm:mx-24 text-white overflow-hidden relative min-h-[400px]'>
                <div className="space-y-5">
                    <div className="mt-3 flex items-center justify-between z-20" >
                        <IconButton onClick={handleGoBack} icon={
                            <ArrowLeft strokeWidth="3" />
                        }>
                        </IconButton>
                        <div className="hidden md:block">
                            <p className="font-bold text-2xl">Rewards</p>
                        </div>
                        <div className='mx-auto px-4 overflow-hidden md:hidden'>
                            <div className="flex justify-center">
                                <GoHomeButton />
                            </div>
                        </div>
                        <LayerswapMenu />
                    </div>
                    {
                        !rewardsData ?
                            <RewardsComponentSceleton />
                            :
                            <div className="space-y-5">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1">
                                        <div className="h-5 w-5 relative">
                                            <Image
                                                src={`${resource_storage_url}/layerswap/networks/optimism_mainnet.png`}
                                                alt="Project Logo"
                                                height="40"
                                                width="40"
                                                loading="eager"
                                                className="rounded-md object-contain" />
                                        </div>
                                        <p className="font-bold text-xl text-center sm:text-left block">Optimism Rewards</p>
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
                                                            className="rounded-full object-contain" />
                                                    </div>
                                                    <p>
                                                        {rewardsData?.user_reward.pending_amount}
                                                    </p>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <Clock className="h-5" />
                                                    <p>
                                                        {difference_in_days}d {difference_in_hours}h
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
                                                            className="rounded-full object-contain" />
                                                    </div>
                                                    <p>
                                                        {rewardsData?.user_reward.total_amount}
                                                    </p>
                                                </div>
                                                <p>
                                                    {(settings.currencies.find(c => c.asset === settings.campaigns[0].asset).usd_price * rewardsData?.user_reward?.total_amount).toFixed(2)}$
                                                </p>
                                            </div>
                                        </BackgroundField>
                                    </div>
                                </div>
                                <button type="button" onClick={handleOpenRewardModal} className="rounded-lg bg-[#cd031b] tracking-wide hover:opacity-80 transition duration-200 text-white text-lg w-full py-3">
                                    Claim your reward
                                </button>
                                <div className="space-y-1">
                                    <p className="font-bold text-lg text-center sm:text-left">Leaderboard</p>
                                    <div className="bg-darkblue-700 border border-darkblue-700 hover:border-darkblue-500 transition duration-200 rounded-lg shadow-lg">
                                        <div className="p-3">
                                            <div className="space-y-6">
                                                {
                                                    rewardsData?.leaderboard?.filter(u => u.position < 4).map(user => (
                                                        <div key={user.position} className="items-center flex justify-between">
                                                            <div className="flex items-center">
                                                                <p className="text-xl font-medium text-white w-6">{user.position}.</p>
                                                                <div className="cols-start-2 flex items-center space-x-2">
                                                                    <img className="flex-shrink-0 object-cover w-8 h-8 rounded-full border-2 border-darkblue-100" src={makeBlockie(user.amount.toString())} alt="" />
                                                                    <div>
                                                                        <p className="text-sm font-bold text-white leading-3">{user.position === rewardsData.user_reward.position ? <span className="text-primary">You</span> : user.nickname}</p>
                                                                        <p className="mt-1 text-sm font-medium text-primary-text leading-3">{user.amount} {settings.campaigns[0].asset}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right flex items-center space-x-2">
                                                                <ClickTooltip text={"Lorem ipsum dolor sit amet consectetur adipisicing elit. Id ad temporibus dolor praesentium magnam, autem iste molestiae animi, sed ex quisquam, voluptatibus facilis nostrum modi quod nihil! Quas, vel praesentium?"}>
                                                                    <div className='text-primary-text hover:cursor-pointer hover:text-white ml-0.5 hover:bg-darkblue-200 active:ring-2 active:ring-gray-200 active:bg-darkblue-400 focus:outline-none cursor-default p-1 rounded'>
                                                                        <Trophy className="h-4 w-4" aria-hidden="true" />
                                                                    </div>
                                                                </ClickTooltip>
                                                            </div>
                                                        </div>
                                                    ))

                                                }
                                                {rewardsData?.user_reward.position >= 4 &&
                                                    <>
                                                        {rewardsData.user_reward.position > 4 && < div className=" flex items-center justify-around  text-2xl text-primary-text">
                                                            {[...Array(10)]?.map((user, index) => (
                                                                <span key={index}>.</span>
                                                            ))}
                                                        </div>}
                                                        <div key={rewardsData.user_reward.position} className="items-center flex justify-between">
                                                            <div className="flex items-center">
                                                                <p className="text-xl font-medium text-white w-6">{rewardsData.user_reward.position}.</p>
                                                                <div className="cols-start-2 flex items-center space-x-2">
                                                                    <img className="flex-shrink-0 object-cover w-8 h-8 rounded-full border-2 border-darkblue-100" src={makeBlockie(rewardsData.user_reward.total_amount.toString())} alt="" />
                                                                    <div>
                                                                        <p className="text-sm font-bold text-primary leading-3">You</p>
                                                                        <p className="mt-1 text-sm font-medium text-primary-text leading-3">{rewardsData.user_reward.total_amount} {settings.campaigns[0].asset}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                }
                                                <div className="w-full flex justify-center">
                                                    <button onClick={handleOpenTopModal} type="button" className="text-sm text-primary-text hover:text-primary-text/70 duration-200 transition">
                                                        See top 10
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                    }
                </div>
                <SlideOver imperativeOpener={[openRewardModal, setOpenRewardModal]} header='Claim your reward' place="inModal">
                    {() =>
                        <div className="h-full grid grid-rows-8">
                            <div className="w-full space-y-5 flex flex-col items-center row-start-3 row-span-2 ">
                                <Gift className="h-16 w-16 text-primary" />
                                <BackgroundField header={<span className="flex justify-between"><span>Claimable Earnings</span><span>Next Airdrop</span></span>}>
                                    <div className="flex justify-between w-full text-2xl text-white">
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
                                                {difference_in_days}d {difference_in_hours}h
                                            </p>
                                        </div>
                                    </div>
                                </BackgroundField>
                                <input
                                    id='email'
                                    placeholder="john@example.com"
                                    autoComplete="email"
                                    type="email"
                                    className="h-12 pb-1 pt-0 text-white  focus:ring-primary focus:border-primary border-darkblue-500 pr-42 block
                                                   placeholder:text-primary-text placeholder:text-sm placeholder:font-normal placeholder:opacity-50 bg-darkblue-700 w-full font-semibold rounded-md"
                                />
                            </div>
                            <div className="row-start-6 self-end">
                                <SubmitButton onClick={handleRewardSubmit} isDisabled={false} isSubmitting={loading}>
                                    Submit
                                </SubmitButton>
                            </div>
                        </div>}
                </SlideOver>
            </div >
            <Modal modalSize="medium" title='Leaderboard' showModal={openTopModal} setShowModal={setOpenTopModal}>
                <div className="bg-darkblue-700 border border-darkblue-700 hover:border-darkblue-500 transition duration-200 rounded-lg shadow-lg text-primary-text">
                    <div className="p-3">
                        <div className="space-y-6">
                            {
                                rewardsData?.leaderboard?.map(user => (
                                    <div key={user.position} className="items-center flex justify-between">
                                        <div className="flex items-center">
                                            <p className="text-xl font-medium text-white w-6">{user.position}.</p>
                                            <div className="cols-start-2 flex items-center space-x-2">
                                                <img className="flex-shrink-0 object-cover w-8 h-8 rounded-full border-2 border-darkblue-100" src={makeBlockie(user.amount.toString())} alt="" />
                                                <div>
                                                    <p className="text-sm font-bold text-white leading-3">{user.position === rewardsData.user_reward.position ? <span className="text-primary">You</span> : user.nickname}</p>
                                                    <p className="mt-1 text-sm font-medium text-primary-text leading-3">{user.amount} {settings.campaigns[0].asset}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center space-x-2">
                                            <ClickTooltip text={"Lorem ipsum dolor sit amet consectetur adipisicing elit. Id ad temporibus dolor praesentium magnam, autem iste molestiae animi, sed ex quisquam, voluptatibus facilis nostrum modi quod nihil! Quas, vel praesentium?"}>
                                                <div className='text-primary-text hover:cursor-pointer hover:text-white ml-0.5 hover:bg-darkblue-200 active:ring-2 active:ring-gray-200 active:bg-darkblue-400 focus:outline-none cursor-default p-1 rounded'>
                                                    <Trophy className="h-4 w-4" aria-hidden="true" />
                                                </div>
                                            </ClickTooltip>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    )
}

export default RewardsComponent;