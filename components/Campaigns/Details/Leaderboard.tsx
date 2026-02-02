import { FC, useMemo, useState } from "react"
import LayerSwapApiClient, { Campaign, Leaderboard, Reward } from "../../../lib/apiClients/layerSwapApiClient"
import { RewardsComponentLeaderboardSceleton } from "../../Sceletons"
import useSWR from "swr"
import { ApiResponse } from "../../../Models/ApiResponse"
import ClickTooltip from "../../Tooltips/ClickTooltip"
import { Address, getExplorerUrl } from "@/lib/address"
import { useAccount } from "wagmi"
import { truncateDecimals } from "../../utils/RoundDecimals"
import AddressIcon from "../../AddressIcon";
import Modal from "../../modal/modal";
import Link from "next/link";
import { ImageWithFallback } from "@/components/Common/ImageWithFallback"
import { Network, Token } from "@/Models/Network"

type Props = {
    campaign: Campaign
}
const Component: FC<Props> = ({ campaign }) => {
    const [openTopModal, setOpenTopModal] = useState(false)
    const { address } = useAccount();

    const handleOpenTopModal = () => {
        setOpenTopModal(true)
    }

    const apiClient = new LayerSwapApiClient()
    const { data: leaderboardData, isLoading } = useSWR<ApiResponse<Leaderboard>>(`/campaigns/${campaign?.id}/leaderboard`, apiClient.fetcher, { dedupingInterval: 60000 })
    const { data: rewardsData } = useSWR<ApiResponse<Reward>>(`/campaigns/${campaign.id}/rewards/${address}`, apiClient.fetcher, { dedupingInterval: 60000 })
    const leaderboard = leaderboardData?.data

    if (isLoading) {
        return <RewardsComponentLeaderboardSceleton />
    }

    if (!leaderboard) {
        //TODO handle
        return <></>
    }

    return <div className="space-y-2">
        {leaderboard?.leaderboard?.length > 0 &&
            <div className="flex items-center justify-between">
                <p className="font-bold text-left leading-5 text-primary-text">Leaderboard</p>
                <button onClick={handleOpenTopModal} type="button" className=" leading-4 text-base text-primary underline hover:no-underline hover:text-primary/80">
                    Top 10
                </button>
            </div>}
        <p className="text-sm text-secondary-text">Users who earn the most throughout the program will be featured here.</p>
        <LeaderbordComponent
            campaign={campaign}
            leaderboardData={leaderboardData}
            rewardsData={rewardsData}
            address={address}
            lines={3}
        />
        <Modal height="full" header='Leaderboard' show={openTopModal} setShow={setOpenTopModal} modalId="leaderBoard">
            <LeaderbordComponent
                campaign={campaign}
                leaderboardData={leaderboardData}
                rewardsData={rewardsData}
                address={address}
                className="text-secondary-text"
            />
        </Modal >
    </div >
}

const LeaderbordComponent: FC<{
    campaign: Campaign,
    leaderboardData: ApiResponse<Leaderboard> | undefined,
    rewardsData: ApiResponse<Reward> | undefined,
    address: string | undefined,
    lines?: number,
    className?: string,
}> = ({ campaign, leaderboardData, rewardsData, address, lines, className }) => {

    const leaderboard = leaderboardData?.data
    const network = campaign.network

    const addressInstance = useMemo(() => address ? new Address(address, network) : null, [address, network])

    if (!leaderboard) {
        //TODO handle
        return <></>
    }

    const rewards = rewardsData?.data

    const position = rewards?.user_reward.position || NaN

    const token = campaign.token

    const leaderboardRewards = [
        leaderboard.leaderboard_budget * 0.6,
        leaderboard.leaderboard_budget * 0.3,
        leaderboard.leaderboard_budget * 0.1
    ]


    return (
        <div className={`bg-secondary-500 border border-secondary-500 hover:border-secondary-400 transition duration-200 rounded-lg shadow-lg${className || ''}`}>
            <div className="p-3">
                <div className="space-y-6">
                    {
                        leaderboard?.leaderboard?.filter(u => (lines !== undefined ? u.position <= lines : true)).map(user => (
                            <LeaderboardItem key={user.position} user={user} leaderboardRewards={leaderboardRewards} leaderboard={leaderboard} rewards={rewards} network={network} token={token} />
                        ))
                    }
                    {
                        lines !== undefined && position > lines && address && rewards?.user_reward &&
                        <div className={position > lines ? "mt-0! pt-0!" : ""}>
                            {position > lines + 1 && < div className="text-2xl text-center leading-3 text-secondary-text my-3">
                                ...
                            </div>}
                            <div key={position} className="items-center flex justify-between">
                                <div className="flex items-center">
                                    <p className="text-xl font-medium text-primary-text w-fit mr-1">{position}.</p>
                                    <div className="cols-start-2 flex items-center space-x-2">
                                        <AddressIcon address={addressInstance?.full || ''} size={25} />
                                        <div>
                                            <div className="text-sm font-bold text-primary-text leading-3">
                                                {network?.account_explorer_template && <Link target="_blank" className="hover:opacity-80" href={getExplorerUrl(network?.account_explorer_template, address)}>
                                                    <span className="text-primary">You</span>
                                                </Link>}
                                            </div>
                                            <p className="mt-1 text-sm font-medium text-secondary-text leading-3">{truncateDecimals(rewards.user_reward.total_amount, token?.precision)} {token?.symbol}</p>
                                        </div>
                                    </div >
                                </div >
                            </div >
                        </div >
                    }
                </div >
            </div >
        </div >
    );
}

const LeaderboardItem: FC<{
    user: Leaderboard['leaderboard'][number],
    leaderboardRewards: number[],
    leaderboard: Leaderboard,
    rewards: Reward | undefined,
    network: Network,
    token: Token,
}> = ({ user, leaderboardRewards, leaderboard, rewards, network, token }) => {
    const addressInstance = useMemo(
        () => new Address(user.address, network),
        [user, network]
    );
    return <div key={user.position} className="items-center flex justify-between">
        <div className="flex items-center">
            <p className="text-xl font-medium text-primary-text w-fit mr-1">{user.position}.</p>
            <div className="cols-start-2 flex items-center space-x-2">
                <AddressIcon address={addressInstance?.full || ''} size={25} />
                <div>
                    <div className="text-sm font-bold text-primary-text leading-3">
                        {user?.address && network?.account_explorer_template && <Link target="_blank" className="hover:opacity-80" href={getExplorerUrl(network?.account_explorer_template, user?.address)}>
                            {user.position === rewards?.user_reward?.position ? <span className="text-primary">You</span> : addressInstance?.toShortString() || ''}
                        </Link>}
                    </div>
                    <p className="mt-1 text-sm font-medium text-secondary-text leading-3">{truncateDecimals(user.amount, token?.precision)} {token?.symbol}</p>
                </div>
            </div >
        </div >
        {
            user.position <= 3 && leaderboard.leaderboard_budget > 0 &&
            <div className="text-right flex items-center space-x-2">
                <ClickTooltip text={
                    <div className="flex items-center space-x-1">
                        <span>+</span>
                        <div className="h-3.5 w-3.5 relative">
                            <ImageWithFallback
                                src={network?.logo || ''}
                                alt="Address Logo"
                                height="40"
                                width="40"
                                loading="eager"
                                className="rounded-full object-contain" />
                        </div>
                        <p>
                            <span>{leaderboardRewards[user.position - 1]} {token?.symbol}</span>
                        </p>
                    </div>
                } />
            </div>
        }
    </div >
}

export default Component