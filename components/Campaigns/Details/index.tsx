import { useRouter } from "next/router"
import { FC } from "react"
import { useSettingsState } from "../../../context/settings"
import Image from 'next/image'
import { Gift } from "lucide-react"
import LayerSwapApiClient, { Campaign } from "../../../lib/layerSwapApiClient"
import useSWR from "swr"
import { ApiResponse } from "../../../Models/ApiResponse"
import { useAccount } from "wagmi"
import RainbowKit from "../../Swap/Withdraw/Wallet/RainbowKit"
import SubmitButton from "../../buttons/submitButton";
import WalletIcon from "../../icons/WalletIcon";
import Link from "next/link";
import LinkWrapper from "../../LinkWraapper";
import { Widget } from "../../Widget/Index";
import Leaderboard from "./Leaderboard"
import Rewards from "./Rewards";
import SpinIcon from "../../icons/spinIcon"
import { Layer } from "../../../Models/Layer"

function CampaignDetails() {

    const settings = useSettingsState()
    const router = useRouter();
    const { resolveImgSrc, layers } = settings
    const camapaignName = router.query.campaign?.toString()

    const { isConnected } = useAccount();

    const apiClient = new LayerSwapApiClient()
    const { data: campaignsData, isLoading } = useSWR<ApiResponse<Campaign[]>>('/campaigns', apiClient.fetcher)
    const campaign = campaignsData?.data?.find(c => c.name === camapaignName)

    const network = layers.find(n => n.name === campaign?.network)

    if (isLoading) {
        return <Loading />
    }

    if (!campaign) {
        return <NotFound />
    }

    return (
        <Widget>
            <Widget.Content>
                <div className="space-y-5">
                    <div className="flex items-center gap-1">
                        <div className="h-7 w-7 relative">
                            {network && <Image
                                src={resolveImgSrc(network)}
                                alt="Project Logo"
                                height="40"
                                width="40"
                                loading="eager"
                                className="rounded-md object-contain" />}
                        </div>
                        <p className="font-bold text-xl text-left flex items-center">
                            {network?.display_name} Rewards
                        </p>
                    </div>
                    {
                        isConnected ?
                            <Rewards
                                campaign={campaign}
                            />
                            :
                            <BriefInformation
                                network={network}
                                campaign={campaign}
                            />
                    }
                    <Leaderboard campaign={campaign} />
                </div>
            </Widget.Content>
            <>
                {
                    !isConnected &&
                    <Widget.Footer>
                        <RainbowKit>
                            <SubmitButton isDisabled={false} isSubmitting={false} icon={<WalletIcon className="stroke-2 w-6 h-6" />}>
                                Connect a wallet
                            </SubmitButton>
                        </RainbowKit>
                    </Widget.Footer>
                }
            </>
        </Widget >
    )
}

type BriefInformationProps = {
    campaign: Campaign,
    network?: Layer
}
const BriefInformation: FC<BriefInformationProps> = ({ campaign, network }) =>
    <p className="text-secondary-text text-base">
        <span>You can earn $</span>
        <span>{campaign?.asset}</span>
        <span>&nbsp;tokens by transferring assets to&nbsp;</span>
        <span>{network?.display_name || campaign.network}</span>
        <span>. For each transaction, you&amp;ll receive&nbsp;</span>
        <span>{campaign?.percentage}</span>
        <span>% of Layerswap fee back.&nbsp;</span>
        <Link target='_blank' href="https://docs.layerswap.io/user-docs/layerswap-campaigns/usdop-rewards"
            className="text-primary underline hover:no-underline decoration-primary cursor-pointer">
            Learn more
        </Link>
    </p>

const Loading = () => <Widget className="min-h-[500px]">
    <Widget.Content>
        <div className="absolute top-[calc(50%-5px)] left-[calc(50%-5px)]">
            <SpinIcon className="animate-spin h-5 w-5" />
        </div>
    </Widget.Content>
</Widget>

const NotFound = () => <Widget className="min-h-[500px]">
    <Widget.Content>
        <div className="h-[364px] flex flex-col items-center justify-center space-y-4">
            <Gift className="h-20 w-20 text-primary" />
            <p className="font-bold text-center">Campaign not found</p>
            <LinkWrapper className="text-xs underline hover:no-underline" href='/campaigns'>See all campaigns</LinkWrapper>
        </div>
    </Widget.Content>
</Widget>

export default CampaignDetails;