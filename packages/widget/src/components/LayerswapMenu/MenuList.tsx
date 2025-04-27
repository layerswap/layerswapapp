import { BookOpen, Gift, Map, Home, LogIn, ScrollText, LibraryIcon, Shield, Users, MessageSquarePlus, UserCircle2 } from "lucide-react";
import { FC, useCallback, useEffect, useState } from "react";
import { useAuthDataUpdate, useAuthState, UserType } from "../../context/authContext";
import TokenService from "../../lib/TokenService";
import { useIntercom } from "react-use-intercom";
import ChatIcon from "../Icons/ChatIcon";
import inIframe from "../utils/inIframe";
import DiscordLogo from "../Icons/DiscordLogo";
import GitHubLogo from "../Icons/GitHubLogo";
import SubstackLogo from "../Icons/SubstackLogo";
import TwitterLogo from "../Icons/TwitterLogo";
import Popover from "../Modal/popover";
import YoutubeLogo from "../Icons/YoutubeLogo";
import { shortenEmail } from '../utils/ShortenAddress';
import Menu from "./Menu";
import { MenuStep } from "../../Models/Wizard";
import SendFeedback from "./Feedback";
import { WalletsMenu } from "../Wallet/WalletComponents/ConnectedWallets";

const MenuList: FC<{ goToStep: (step: MenuStep, path: string) => void }> = ({ goToStep }) => {
    const { email, userType, userId } = useAuthState()
    const { setUserType } = useAuthDataUpdate()
    const { boot, show, update } = useIntercom()
    const [embedded, setEmbedded] = useState<boolean>()
    const [openFeedbackModal, setOpenFeedbackModal] = useState(false);

    useEffect(() => {
        setEmbedded(inIframe())
    }, [])

    const updateWithProps = () => update({ userId, customAttributes: { email: email, } })

    const handleLogout = () => {
        TokenService.removeAuthData()
        // if (router.pathname != '/') {
        //     router.push({
        //         pathname: '/',
        //         query: resolvePersistantQueryParams(router.query)
        //     })
        // } else {
        //     router.reload()
        // }
        setUserType(UserType.NotAuthenticatedUser)
    }

    const handleCloseFeedback = () => {
        setOpenFeedbackModal(false)
    }
    return <div className="text-sm font-medium focus:outline-none h-full">
        <Menu>
            {/* <WalletsMenu /> */}
            <Menu.Group>
                <>
                    <Menu.Item onClick={() => goToStep(MenuStep.Transactions, "/transactions")} icon={<ScrollText className="h-5 w-5" />} >
                        Transactions
                    </Menu.Item>
                </>
            </Menu.Group>
            <Menu.Group>
                <Menu.Item pathname='https://docs.layerswap.io/' target="_blank" icon={<BookOpen className="h-5 w-5" />} >
                    Docs
                </Menu.Item>
            </Menu.Group>

            <Menu.Group>
                <Menu.Item pathname='https://docs.layerswap.io/user-docs/more-information/privacy-policy/' target="_blank" icon={<Shield className="h-5 w-5" />} >
                    Privacy Policy
                </Menu.Item>
                <Menu.Item pathname='https://docs.layerswap.io/user-docs/more-information/terms-of-services/' target="_blank" icon={<LibraryIcon className="h-5 w-5" />} >
                    Terms of Service
                </Menu.Item>
            </Menu.Group>
        </Menu>
    </div>
}

export default MenuList