import { useRouter } from "next/router"
import { useCallback, useState } from "react"
import { useSettingsState } from "../context/settings"
import Image from 'next/image'
import BackgroundField from "./backgroundField";
import { Clock, Gift, Trophy, Wallet } from "lucide-react"
import LayerSwapApiClient, { Campaigns, Leaderboard, Reward, RewardPayout } from "../lib/layerSwapApiClient"
import { RewardsComponentLeaderboardSceleton, RewardsComponentSceleton } from "./Sceletons"
import useSWR from "swr"
import { ApiResponse } from "../Models/ApiResponse"
import ClickTooltip from "./Tooltips/ClickTooltip"
import shortenAddress from "./utils/ShortenAddress"
import { useAccount } from "wagmi"
import RainbowKit from "./Wizard/Steps/Wallet/RainbowKit"
import { Progress } from "./ProgressBar"
import NetworkSettings from "../lib/NetworkSettings"
import { truncateDecimals } from "./utils/RoundDecimals"
import HeaderWithMenu from "./HeaderWithMenu"
import SubmitButton from "./buttons/submitButton";
import AddressIcon from "./AddressIcon";
import Modal from "./modal/modal";
import SpinIcon from "./icons/spinIcon";

function RewardsComponent() {

    const settings = useSettingsState()
    const router = useRouter();
    const { resolveImgSrc, networks, currencies } = settings || { discovery: {} }
    const [openTopModal, setOpenTopModal] = useState(false)

    const { isConnected, address } = useAccount();

    const apiClient = new LayerSwapApiClient()
    const { data: campaignsData, isLoading } = useSWR<ApiResponse<Campaigns[]>>('/campaigns', apiClient.fetcher)
    const campaigns = campaignsData?.data

    const { data: rewardsData } = useSWR<ApiResponse<Reward>>((address && campaignsData) ? `/campaigns/${campaigns[0]?.id}/rewards/${address}` : null, apiClient.fetcher, { dedupingInterval: 60000 })
    const { data: leaderboardData } = useSWR<ApiResponse<Leaderboard>>(campaignsData ? `/campaigns/${campaigns[0]?.id}/leaderboard` : null, apiClient.fetcher, { dedupingInterval: 60000 })
    const { data: payoutsData } = useSWR<ApiResponse<RewardPayout[]>>((address && campaignsData) ? `/campaigns/${campaigns[0]?.id}/payouts/${address}` : null, apiClient.fetcher, { dedupingInterval: 60000 })

    const rewards = rewardsData?.data
    const leaderboard = leaderboardData?.data
    const payouts = payoutsData?.data

    const next = new Date(rewards?.next_airdrop_date)
    const now = new Date()
    const difference_in_days = Math.round(Math.abs(((next.getTime() - now.getTime())) / (1000 * 3600 * 24)))
    const difference_in_hours = Math.round(Math.abs(((next.getTime() - now.getTime())) / (1000 * 3600) - (difference_in_days * 24)))
    const period = campaigns?.[0]?.reward_limit_period
    const campaignEndDate = new Date(campaigns?.[0].end_date)
    const isCampaignEnded = Math.round(((campaignEndDate.getTime() - now.getTime()) / (1000 * 3600 * 24))) < 0 ? true : false

    const network = networks.find(n => n.internal_name === campaigns?.[0]?.network)
    const periodRewardClaimed = (rewards?.user_reward?.period_pending_amount / campaigns?.[0]?.reward_limit_for_period) * 100
    const campaignAsset = currencies.find(c => c?.asset === campaigns?.[0]?.asset)

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
            <div className='bg-darkblue-900 pb-6 sm:mb-10 sm:shadow-card rounded-lg text-white overflow-hidden relative min-h-[400px]'>
                {!isLoading ?
                    <div className="space-y-5">
                        <HeaderWithMenu goBack={handleGoBack} />
                        {
                            !isCampaignEnded ?
                                <div className="space-y-5 px-6">
                                    {isConnected ?
                                        (!rewards || !payouts ?
                                            <RewardsComponentSceleton />
                                            :
                                            <div className="space-y-5">
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-1">
                                                        <div className="h-7 w-7 relative">
                                                            <Image
                                                                src={resolveImgSrc(network)}
                                                                alt="Project Logo"
                                                                height="40"
                                                                width="40"
                                                                loading="eager"
                                                                className="rounded-md object-contain" />
                                                        </div>
                                                        <p className="font-bold text-xl text-left flex items-center">{network.display_name} Rewards <ClickTooltip text={<span>Onboarding incentives that are earned by transferring to {network?.display_name}. <a target='_blank' href="https://docs.layerswap.io/user-docs/using-layerswap/usdop-rewards" className="text-primary underline hover:no-underline decoration-primary cursor-pointer">Learn more</a></span>} /></p>
                                                    </div>
                                                    <div className="bg-darkblue-700 divide-y divide-darkblue-500 rounded-lg shadow-lg border border-darkblue-700 hover:border-darkblue-500 transition duration-200">
                                                        <BackgroundField header={<span className="flex justify-between"><span className="flex items-center">Pending Earnings <ClickTooltip text={`${campaigns[0]?.asset} tokens that will be airdropped periodically.`} /> </span><span>Next Airdrop</span></span>} withoutBorder>
                                                            <div className="flex justify-between w-full text-2xl">
                                                                <div className="flex items-center space-x-1">
                                                                    <div className="h-5 w-5 relative">
                                                                        <Image
                                                                            src={resolveImgSrc(campaigns[0])}
                                                                            alt="Project Logo"
                                                                            height="40"
                                                                            width="40"
                                                                            loading="eager"
                                                                            className="rounded-full object-contain" />
                                                                    </div>
                                                                    <p>
                                                                        {rewards?.user_reward.total_pending_amount} <span className="text-base sm:text-2xl">{campaigns[0]?.asset}</span>
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
                                                        <BackgroundField header={<span className="flex justify-between"><span className="flex items-center">Total Earnings <ClickTooltip text={`${campaigns[0]?.asset} tokens that you’ve earned so far (including Pending Earnings).`} /></span><span>Current Value</span></span>} withoutBorder>
                                                            <div className="flex justify-between w-full text-slate-300 text-2xl">
                                                                <div className="flex items-center space-x-1">
                                                                    <div className="h-5 w-5 relative">
                                                                        <Image
                                                                            src={resolveImgSrc(campaigns[0])}
                                                                            alt="Project Logo"
                                                                            height="40"
                                                                            width="40"
                                                                            loading="eager"
                                                                            className="rounded-full object-contain" />
                                                                    </div>
                                                                    <p>
                                                                        {rewards?.user_reward.total_amount} <span className="text-base sm:text-2xl">{campaigns[0]?.asset}</span>
                                                                    </p>
                                                                </div>
                                                                <p>
                                                                    ${(settings?.currencies.find(c => c.asset === campaigns[0]?.asset).usd_price * rewards?.user_reward?.total_amount).toFixed(2)}
                                                                </p>
                                                            </div>
                                                        </BackgroundField>
                                                    </div>
                                                    <div className="bg-darkblue-700 rounded-lg shadow-lg border border-darkblue-700 hover:border-darkblue-500 transition duration-200">
                                                        <BackgroundField header='Weekly Reward Earned' withoutBorder>
                                                            <div className="flex flex-col w-full gap-2">
                                                                <Progress value={periodRewardClaimed === Infinity ? 0 : periodRewardClaimed} />
                                                                <div className="flex justify-between w-full font-semibold text-sm ">
                                                                    <div className="text-primary"><span className="text-white">{rewards.user_reward.period_pending_amount}</span> / {campaigns[0]?.reward_limit_for_period} {campaigns[0].asset}</div>
                                                                    <p className="text-primary-text">Refreshes every {period > 1 ? `${period} days` : 'day'}</p>
                                                                </div>
                                                            </div>
                                                        </BackgroundField>
                                                    </div>

                                                </div>
                                                {
                                                    payouts.length > 0 &&
                                                    <div className="space-y-1">
                                                        <p className="font-bold text-lg text-left">Payouts</p>
                                                        <div className=" bg-darkblue-700 divide-y divide-darkblue-300 rounded-lg shadow-lg border border-darkblue-700 hover:border-darkblue-500 transition duration-200">
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
                                                                        <tbody className="divide-y divide-darkblue-600">
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
                                                        </div>
                                                    </div>}

                                            </div>
                                        )
                                        :
                                        <div className="space-y-5">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-1">
                                                    <div className="h-7 w-7 relative">
                                                        <Image
                                                            src={resolveImgSrc(network)}
                                                            alt="Project Logo"
                                                            height="40"
                                                            width="40"
                                                            loading="eager"
                                                            className="rounded-md object-contain" />
                                                    </div>
                                                    <p className="font-bold text-xl text-left flex items-center">{network.display_name} Rewards </p>
                                                </div>
                                                <p className="text-primary-text text-base">You can earn ${campaigns[0]?.asset} tokens by transferring assets to {network?.display_name}. For each transaction, you’ll receive {campaigns[0]?.percentage}% of Layerswap fee back. <a target='_blank' href="https://docs.layerswap.io/user-docs/using-layerswap/usdop-rewards" className="text-primary underline hover:no-underline decoration-primary cursor-pointer">Learn more</a></p>
                                            </div>
                                        </div>
                                    }
                                    {
                                        (!leaderboard ?
                                            <RewardsComponentLeaderboardSceleton />
                                            :
                                            leaderboard?.leaderboard?.length > 0 &&
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="font-bold text-left leading-5">Leaderboard</p>
                                                    <button onClick={handleOpenTopModal} type="button" className=" leading-4 text-base text-primary underline hover:no-underline hover:text-primary/80">
                                                        Top 10
                                                    </button>
                                                </div>
                                                <p className="text-sm text-primary-text">Users who earn the most throughout the program will be featured here, and will earn additional rewards.</p>
                                                <div className="bg-darkblue-700 border border-darkblue-700 hover:border-darkblue-500 transition duration-200 rounded-lg shadow-lg">
                                                    <div className="p-3">
                                                        {leaderboard?.leaderboard?.length > 0 ? <div className="space-y-6">
                                                            {
                                                                leaderboard?.leaderboard?.filter(u => u.position < 4).map(user => (
                                                                    <div key={user.position} className="items-center flex justify-between">
                                                                        <div className="flex items-center">
                                                                            <p className="text-xl font-medium text-white w-fit mr-1">{user.position}.</p>
                                                                            <div className="cols-start-2 flex items-center space-x-2">
                                                                                <AddressIcon address={user.address} size={25} />
                                                                                <div>
                                                                                    <div className="text-sm font-bold text-white leading-3"><a target="_blank" className="hover:opacity-80" href={NetworkSettings.KnownSettings[network?.internal_name].AccountExplorerTemplate.replace("{0}", user.address)}>{user.position === rewards?.user_reward?.position ? <span className="text-primary">You</span> : shortenAddress(user.address)}</a></div>
                                                                                    <p className="mt-1 text-sm font-medium text-primary-text leading-3">{truncateDecimals(user.amount, campaignAsset.precision)} {campaigns[0]?.asset}</p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right flex items-center space-x-2">
                                                                            <ClickTooltip text={
                                                                                <div className="flex items-center space-x-1">
                                                                                    <span>+</span>
                                                                                    <div className="h-3.5 w-3.5 relative">
                                                                                        <Image
                                                                                            src={resolveImgSrc(campaigns[0])}
                                                                                            alt="Project Logo"
                                                                                            height="40"
                                                                                            width="40"
                                                                                            loading="eager"
                                                                                            className="rounded-full object-contain" />
                                                                                    </div>
                                                                                    <p>
                                                                                        <span>{leaderboardReward(user.position)} {campaigns[0]?.asset}</span>
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
                                                                            <p className="text-xl font-medium text-white w-fit mr-1">{rewards.user_reward.position}.</p>
                                                                            <div className="cols-start-2 flex items-center space-x-2">
                                                                                <AddressIcon address={rewards.user_reward.total_amount.toString()} size={25} />
                                                                                <div>
                                                                                    <div className="text-sm font-bold text-white leading-3"><a target="_blank" className="hover:opacity-80" href={NetworkSettings.KnownSettings[network?.internal_name].AccountExplorerTemplate.replace("{0}", address)}><span className="text-primary">You</span></a></div>
                                                                                    <p className="mt-1 text-sm font-medium text-primary-text leading-3">{truncateDecimals(rewards.user_reward.total_amount, campaignAsset.precision)} {campaigns[0]?.asset}</p>
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
                                    <RainbowKit>
                                        <SubmitButton isDisabled={false} isSubmitting={false} icon={<Wallet className="h-6 w-6 " />}>
                                            Connect a wallet
                                        </SubmitButton>
                                    </RainbowKit>
                                </div>
                                :
                                <div className="h-[364px] flex flex-col items-center justify-center space-y-4">
                                    <Gift className="h-20 w-20 text-primary" />
                                    <p className="font-bold text-center">There are no active campaigns right now</p>
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
            <Modal height="full" header='Leaderboard' show={openTopModal} setShow={setOpenTopModal} >
                <div className="bg-darkblue-700 border border-darkblue-700 mt-2 hover:border-darkblue-500 transition duration-200 rounded-lg shadow-lg text-primary-text">
                    <div className="p-3">
                        <div className="space-y-6">
                            {
                                leaderboard?.leaderboard?.map(user => (
                                    <div key={user.position} className="items-center flex justify-between">
                                        <div className="flex items-center">
                                            <p className="text-xl font-medium text-white w-fit mr-1">{user.position}.</p>
                                            <div className="cols-start-2 flex items-center space-x-2">
                                                <AddressIcon address={user.address} size={25} />
                                                <div>
                                                    <div className="text-sm font-bold text-white leading-3"><a target="_blank" className="hover:opacity-80" href={NetworkSettings.KnownSettings[network?.internal_name].AccountExplorerTemplate.replace("{0}", user.address)}>{user.position === rewards?.user_reward?.position ? <span className="text-primary">You</span> : shortenAddress(user.address)}</a></div>
                                                    <p className="mt-1 text-sm font-medium text-primary-text leading-3">{truncateDecimals(user.amount, campaignAsset.precision)} {campaigns[0]?.asset}</p>
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
                                                                src={resolveImgSrc(campaigns[0])}
                                                                alt="Project Logo"
                                                                height="40"
                                                                width="40"
                                                                loading="eager"
                                                                className="rounded-full object-contain" />
                                                        </div>
                                                        <p>
                                                            <span>{leaderboardReward(user.position)} {campaigns[0]?.asset}</span>
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