import { useRouter } from "next/router"
import { useCallback, useState } from "react"
import { useSettingsState } from "../context/settings"
import Image from 'next/image'
import LayerswapMenu from "./LayerswapMenu"
import GoHomeButton from "./utils/GoHome";
import BackgroundField from "./backgroundField";
import { ArrowLeft, Clock, Trophy, Wallet } from "lucide-react"
import LayerSwapApiClient, { Leaderboard, Reward, RewardPayout } from "../lib/layerSwapApiClient"
import makeBlockie from "ethereum-blockies-base64"
import { RewardsComponentLeaderboardSceleton, RewardsComponentSceleton } from "./Sceletons"
import useSWR from "swr"
import { ApiResponse } from "../Models/ApiResponse"
import IconButton from "./buttons/iconButton"
import ClickTooltip from "./Tooltips/ClickTooltip"
import Modal from "./modalComponent"
import shortenAddress from "./utils/ShortenAddress"
import { useAccount } from "wagmi"
import { disconnect } from '@wagmi/core'
import RainbowKit from "./Wizard/Steps/Wallet/RainbowKit"
import { Progress } from "./ProgressBar"

function RewardsComponent() {

    const settings = useSettingsState()
    const router = useRouter();
    const { discovery: { resource_storage_url }, networks } = settings || { discovery: {} }
    const [openTopModal, setOpenTopModal] = useState(false)
    const [address, setAddress] = useState('')

    const { isConnected, isDisconnected, connector } = useAccount({
        onConnect({ address }) {
            setAddress(address)
        },
        onDisconnect() {
            setAddress("")
        }
    });

    const apiClient = new LayerSwapApiClient()
    const { data: rewardsData } = useSWR<ApiResponse<Reward>>(address ? `/campaigns/OPTIMISM2023/rewards/${address}` : null, apiClient.fetcher, { dedupingInterval: 60000 })
    const { data: leaderboardData } = useSWR<ApiResponse<Leaderboard>>('/campaigns/OPTIMISM2023/leaderboard', apiClient.fetcher, { dedupingInterval: 60000 })
    const { data: payoutsData } = useSWR<ApiResponse<RewardPayout[]>>(address ? `/campaigns/OPTIMISM2023/payouts/${address}` : null, apiClient.fetcher, { dedupingInterval: 60000 })

    const rewards = rewardsData?.data
    const leaderboard = leaderboardData?.data
    const payouts = payoutsData?.data

    const next = new Date(rewards?.next_airdrop_date)
    const now = new Date()
    const difference_in_days = Math.round(Math.abs(((next.getTime() - now.getTime())) / (1000 * 3600 * 24)))
    const difference_in_hours = Math.round(Math.abs(((next.getTime() - now.getTime())) / (1000 * 3600) - (difference_in_days * 24)))

    const network = networks.find(n => n.internal_name === settings?.campaigns[0]?.network_name)
    const periodRewardClaimed = (rewards?.user_reward?.period_limit / rewards?.user_reward?.period_pending_amount)

    const handleOpenTopModal = () => {
        setOpenTopModal(true)
    }

    const handleGoBack = useCallback(() => {
        router.back()
    }, [router])

    const leaderboardReward = (position: number) => {
        let amount: number

        switch (position) {
            case 1:
                amount = leaderboard.leaderboard_budget * 0.6;
                break;
            case 2:
                amount = leaderboard.leaderboard_budget * 0.3;
                break;
            case 3:
                amount = leaderboard.leaderboard_budget * 0.1;
                break;
        }
        return amount
    }

    return (
        <>
            <div className='bg-darkblue px-6 pb-6 sm:mb-10 sm:shadow-card rounded-lg sm:mx-20 text-white overflow-hidden relative min-h-[400px]'>
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
                        <div className="space-y-5">
                            {isConnected ?
                                (!rewards || !payouts ?
                                    <RewardsComponentSceleton />
                                    :
                                    <div className="space-y-5">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-1">
                                                <div className="h-5 w-5 relative">
                                                    <Image
                                                        src={`${resource_storage_url}/layerswap/networks/${network.internal_name?.toLowerCase()}.png`}
                                                        alt="Project Logo"
                                                        height="40"
                                                        width="40"
                                                        loading="eager"
                                                        className="rounded-md object-contain" />
                                                </div>
                                                <p className="font-bold text-xl text-left flex items-center">{network.display_name} Rewards <ClickTooltip text={`Onboarding incentives that are earned by bridging to ${network?.display_name}. For each transfer, you’ll receive ~80% of Layerswap service fee back.`} /></p>
                                            </div>
                                            <div className="bg-darkblue-700 divide-y divide-darkblue-300 rounded-lg shadow-lg border border-darkblue-700 hover:border-darkblue-500 transition duration-200">
                                                <BackgroundField header={<span className="flex justify-between"><span className="flex items-center">Pending Earnings <ClickTooltip text={`${settings.campaigns[0].asset} tokens that will be airdropped in a 2-week period.`} /> </span><span>Next Airdrop</span></span>} withoutBorder>
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
                                                                {rewards?.user_reward.total_pending_amount} <span className="text-base sm:text-2xl">{settings.campaigns[0].asset}</span>
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
                                                <BackgroundField header={<span className="flex justify-between"><span className="flex items-center">Total Earnings <ClickTooltip text={`${settings.campaigns[0].asset} tokens that you’ve earned so far (including Pending Earnings).`} /></span><span>Current Value</span></span>} withoutBorder>
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
                                                                {rewards?.user_reward.total_amount} <span className="text-base sm:text-2xl">{settings.campaigns[0].asset}</span>
                                                            </p>
                                                        </div>
                                                        <p>
                                                            ${(settings.currencies.find(c => c.asset === settings.campaigns[0].asset).usd_price * rewards?.user_reward?.total_amount).toFixed(2)}
                                                        </p>
                                                    </div>
                                                </BackgroundField>
                                            </div>
                                            <div className="bg-darkblue-700 rounded-lg shadow-lg border border-darkblue-700 hover:border-darkblue-500 transition duration-200">
                                                <BackgroundField header='Daily Reward Claimed' withoutBorder>
                                                    <div className="flex flex-col w-full gap-2">
                                                        <Progress value={periodRewardClaimed === Infinity ? 0 : periodRewardClaimed} />
                                                        <div className="flex justify-between w-full font-semibold text-sm ">
                                                            <div className="text-primary"><span className="text-white">{rewards.user_reward.period_pending_amount}</span> / {rewards.user_reward.period_limit} {settings.campaigns[0].asset}</div>
                                                            <p className="text-primary-text">Refreshes every day</p>
                                                        </div>
                                                    </div>
                                                </BackgroundField>
                                            </div>

                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-bold text-lg text-left">Payouts</p>
                                            <div className=" bg-darkblue-700 divide-y divide-darkblue-300 rounded-lg shadow-lg border border-darkblue-700 hover:border-darkblue-500 transition duration-200">
                                                {
                                                    payouts.length > 0 ?
                                                        <div className="inline-block min-w-full align-middle">
                                                            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                                                                <table className="min-w-full divide-y divide-darkblue-500">
                                                                    <thead className="bg-darkblue-800/70">
                                                                        <tr>
                                                                            <th scope="col" className="py-3.5 pl-4 text-left text-sm font-semibold  sm:pl-6">
                                                                                Tx Id
                                                                            </th>
                                                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold ">
                                                                                Amount
                                                                            </th>
                                                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold ">
                                                                                Date
                                                                            </th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-700">
                                                                        {payouts.map((payout) => (
                                                                            <tr key={payout.transaction_id}>
                                                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6 underline hover:no-underline">
                                                                                    <a target={"_blank"} href={network?.transaction_explorer_template?.replace("{0}", payout.transaction_id)}>{shortenAddress(payout.transaction_id)}</a>
                                                                                </td>
                                                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-100">{payout.amount}</td>
                                                                                <td className="px-3 py-4 text-sm text-gray-100">{new Date(payout.date).toLocaleString()}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                        :
                                                        <div className="h-28 flex justify-center flex-col items-center">
                                                            <p className="text-sm">
                                                                Here you'll see your payouts
                                                            </p>
                                                        </div>
                                                }
                                            </div>
                                        </div>
                                        <div className="w-full flex justify-center">
                                            <button onClick={disconnect} className='py-3 rounded-md bg-primary w-full'>
                                                Disconnect Wallet
                                            </button>
                                        </div>
                                    </div>
                                )
                                :
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1">
                                            <div className="h-5 w-5 relative">
                                                <Image
                                                    src={`${resource_storage_url}/layerswap/networks/${network.internal_name?.toLowerCase()}.png`}
                                                    alt="Project Logo"
                                                    height="40"
                                                    width="40"
                                                    loading="eager"
                                                    className="rounded-md object-contain" />
                                            </div>
                                            <p className="font-bold text-xl text-left flex items-center">{network.display_name} Rewards </p>
                                        </div>
                                        <p className="text-primary-text text-base">Onboarding incentives that you can earn by transferring assets to {network?.display_name}. For each transaction, you’ll receive ~80% of Layerswap service fee back. The rewards are capped at 30 {settings.campaigns[0].asset} per day.</p>
                                    </div>
                                    <RainbowKit>
                                        <div className={`min-h-12 text-left space-x-2 border border-darkblue-500 bg-darkblue-700/70  flex text-sm rounded-md items-center w-full transform transition duration-200 px-2 py-1.5 hover:border-darkblue-500 hover:bg-darkblue-700 hover:shadow-xl`}>
                                            <div className='flex text-primary-text flex-row items-left bg-darkblue-400 px-2 py-1 rounded-md'>
                                                <Wallet className="h-6 w-6 text-primary-text" />
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="block text-sm font-medium">
                                                    Claim your reward
                                                </div>
                                                <div className="text-gray-500">
                                                    Connect your wallet to claim rewards
                                                </div>
                                            </div>
                                        </div>
                                    </RainbowKit>
                                </div>
                            }
                            {

                                (!leaderboard ?
                                    <RewardsComponentLeaderboardSceleton />
                                    :
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <p className="font-bold text-lg text-left leading-4">Leaderboard</p>
                                            <button onClick={handleOpenTopModal} type="button" className=" leading-4 text-lg text-primary-text hover:text-primary-text/70 duration-200 transition">
                                                See top 10
                                            </button>
                                        </div>
                                        <p className="text-sm text-primary-text/70">Users with highest transaction volume are featured in the leaderboard and will earn additional rewards.</p>
                                        <div className="bg-darkblue-700 border border-darkblue-700 hover:border-darkblue-500 transition duration-200 rounded-lg shadow-lg">
                                            <div className="p-3">
                                                {leaderboard?.leaderboard?.length > 0 ? <div className="space-y-6">
                                                    {
                                                        leaderboard?.leaderboard?.filter(u => u.position < 4).map(user => (
                                                            <div key={user.position} className="items-center flex justify-between">
                                                                <div className="flex items-center">
                                                                    <p className="text-xl font-medium text-white w-6">{user.position}.</p>
                                                                    <div className="cols-start-2 flex items-center space-x-2">
                                                                        <img className="flex-shrink-0 object-cover w-8 h-8 rounded-full border-2 border-darkblue-100" src={makeBlockie(user.address)} alt="" />
                                                                        <div>
                                                                            <p className="text-sm font-bold text-white leading-3">{user.position === rewards?.user_reward?.position ? <span className="text-primary">You</span> : shortenAddress(user.address)}</p>
                                                                            <p className="mt-1 text-sm font-medium text-primary-text leading-3">{user.amount} {settings.campaigns[0].asset}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right flex items-center space-x-2">
                                                                    <ClickTooltip text={
                                                                        <div className="flex items-center space-x-1">
                                                                            <span>+</span>
                                                                            <div className="h-3.5 w-3.5 relative">
                                                                                <Image
                                                                                    src={`${resource_storage_url}/layerswap/currencies/${settings.campaigns[0].asset.toLowerCase()}.png`}
                                                                                    alt="Project Logo"
                                                                                    height="40"
                                                                                    width="40"
                                                                                    loading="eager"
                                                                                    className="rounded-full object-contain" />
                                                                            </div>
                                                                            <p>
                                                                                <span>{leaderboardReward(user.position)} {settings.campaigns[0].asset}</span>
                                                                            </p>
                                                                        </div>}>
                                                                        <div className='text-primary-text hover:cursor-pointer hover:text-white ml-0.5 hover:bg-darkblue-200 active:ring-2 active:ring-gray-200 active:bg-darkblue-400 focus:outline-none cursor-default p-1 rounded'>
                                                                            <Trophy className="h-4 w-4" aria-hidden="true" />
                                                                        </div>
                                                                    </ClickTooltip>
                                                                </div>
                                                            </div>
                                                        ))

                                                    }
                                                    {rewards?.user_reward.position >= 4 &&
                                                        <div className={rewards.user_reward.position > 4 && "!mt-0 !pt-0"}>
                                                            {rewards.user_reward.position > 4 && < div className="text-2xl text-center leading-3 text-primary-text my-3">
                                                                ...
                                                            </div>}
                                                            <div key={rewards.user_reward.position} className="items-center flex justify-between">
                                                                <div className="flex items-center">
                                                                    <p className="text-xl font-medium text-white w-6">{rewards.user_reward.position}.</p>
                                                                    <div className="cols-start-2 flex items-center space-x-2">
                                                                        <img className="flex-shrink-0 object-cover w-8 h-8 rounded-full border-2 border-darkblue-100" src={makeBlockie(rewards.user_reward.total_amount.toString())} alt="" />
                                                                        <div>
                                                                            <p className="text-sm font-bold text-primary leading-3">You</p>
                                                                            <p className="mt-1 text-sm font-medium text-primary-text leading-3">{rewards.user_reward.total_amount} {settings.campaigns[0].asset}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    }
                                                </div>
                                                    :
                                                    <div className="h-8 flex flex-col justify-center items-center text-sm">
                                                        Here will be leaderboard.
                                                    </div>
                                                }
                                            </div>
                                        </div>
                                    </div>
                                )
                            }
                        </div>
                    }
                </div>
            </div >
            <Modal modalSize="medium" title='Leaderboard' showModal={openTopModal} setShowModal={setOpenTopModal}>
                <div className="bg-darkblue-700 border border-darkblue-700 hover:border-darkblue-500 transition duration-200 rounded-lg shadow-lg text-primary-text">
                    <div className="p-3">
                        <div className="space-y-6">
                            {
                                leaderboard?.leaderboard?.map(user => (
                                    <div key={user.position} className="items-center flex justify-between">
                                        <div className="flex items-center">
                                            <p className="text-xl font-medium text-white w-6">{user.position}.</p>
                                            <div className="cols-start-2 flex items-center space-x-2">
                                                <img className="flex-shrink-0 object-cover w-8 h-8 rounded-full border-2 border-darkblue-100" src={makeBlockie(user.address)} alt="" />
                                                <div>
                                                    <p className="text-sm font-bold text-white leading-3">{user?.position === rewards?.user_reward?.position ? <span className="text-primary">You</span> : shortenAddress(user.address)}</p>
                                                    <p className="mt-1 text-sm font-medium text-primary-text leading-3">{user.amount} {settings.campaigns[0].asset}</p>
                                                </div>
                                            </div>
                                        </div>
                                        {
                                            user.position < 4 &&
                                            <div className="text-right flex items-center space-x-2">
                                                <ClickTooltip text={
                                                    <div className="flex items-center space-x-1">
                                                        <span>+</span>
                                                        <div className="h-3.5 w-3.5 relative">
                                                            <Image
                                                                src={`${resource_storage_url}/layerswap/currencies/${settings.campaigns[0].asset.toLowerCase()}.png`}
                                                                alt="Project Logo"
                                                                height="40"
                                                                width="40"
                                                                loading="eager"
                                                                className="rounded-full object-contain" />
                                                        </div>
                                                        <p>
                                                            <span>{leaderboardReward(user.position)} OP</span>
                                                        </p>
                                                    </div>
                                                }>
                                                    <div className='text-primary-text hover:cursor-pointer hover:text-white ml-0.5 hover:bg-darkblue-200 active:ring-2 active:ring-gray-200 active:bg-darkblue-400 focus:outline-none cursor-default p-1 rounded'>
                                                        <Trophy className="h-4 w-4" aria-hidden="true" />
                                                    </div>
                                                </ClickTooltip>
                                            </div>
                                        }
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