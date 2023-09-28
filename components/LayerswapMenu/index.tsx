import { BookOpen, ExternalLink, Gift, MenuIcon, ChevronRight, Map, Home, LogIn, LogOut, ScrollText, LibraryIcon, Shield, Users, MessageSquarePlus, Bell } from "lucide-react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { useAuthDataUpdate, useAuthState, UserType } from "../../context/authContext";
import TokenService from "../../lib/TokenService";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useIntercom } from "react-use-intercom";
import ChatIcon from "../icons/ChatIcon";
import WalletIcon from "../icons/WalletIcon";
import inIframe from "../utils/inIframe";
import Modal from "../../components/modal/modal";
import DiscordLogo from "./../icons/DiscordLogo";
import GitHubLogo from "./../icons/GitHubLogo";
import SubstackLogo from "./../icons/SubstackLogo";
import TwitterLogo from "./../icons/TwitterLogo";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import Link from "next/link";
import { MenuRainbowKitConnectWallet } from "../HeaderWithMenu/ConnectedWallets";
import Popover from "../modal/popover";
import SendFeedback from "../sendFeedback";
import IconButton from "../buttons/iconButton";
import YoutubeLogo from "../icons/YoutubeLogo";
import { shortenEmail } from '../utils/ShortenAddress';
import { resolvePersistantQueryParams } from "../../helpers/querryHelper";
import LinkWrapper from "../LinkWraapper";
import Menu from "./Menu";


export default function LayerswapMenu() {
    const { email, userType, userId } = useAuthState()
    const { setUserType } = useAuthDataUpdate()
    const router = useRouter();
    const { isConnected } = useAccount();
    const { boot, show, update } = useIntercom()
    const [embedded, setEmbedded] = useState<boolean>()
    const [openTopModal, setOpenTopModal] = useState(false);
    const { isMobile } = useWindowDimensions()
    const { openConnectModal } = useConnectModal();
    const [openFeedbackModal, setOpenFeedbackModal] = useState(false);
    const UserEmail = ({ email }: { email: string }) => {
        return shortenEmail(email, 22)
    }

    useEffect(() => {
        setEmbedded(inIframe())
    }, [])

    const updateWithProps = () => update({ email: email, userId: userId })

    const handleLogout = useCallback(() => {
        TokenService.removeAuthData()
        if (router.pathname != '/') {
            router.push({
                pathname: '/',
                query: resolvePersistantQueryParams(router.query)
            })
        } else {
            router.reload()
        }
        setUserType(UserType.NotAuthenticatedUser)
    }, [router.query])

    const navigation = {
        social: [
            {
                name: 'Twitter',
                href: 'https://twitter.com/layerswap',
                icon: (props) => TwitterLogo(props),
                className: 'plausible-event-name=Twitter'
            },
            {
                name: 'GitHub',
                href: 'https://github.com/layerswap/layerswapapp',
                icon: (props) => GitHubLogo(props),
                className: 'plausible-event-name=GitHub'
            },
            {
                name: 'Discord',
                href: 'https://discord.com/invite/KhwYN35sHy',
                icon: (props) => DiscordLogo(props),
                className: 'plausible-event-name=Discord'
            },
            {
                name: 'YouTube',
                href: 'https://www.youtube.com/@layerswaphq',
                icon: (props) => YoutubeLogo(props),
                className: 'plausible-event-name=Youtube'
            },
            {
                name: 'Substack',
                href: 'https://layerswap.substack.com/',
                icon: (props) => SubstackLogo(props),
                className: 'plausible-event-name=Substack'
            },
            {
                name: 'Roadmap',
                href: 'https://layerswap.ducalis.io/roadmap/summary',
                icon: (props) => <Map {...props}></Map>,
                className: 'plausible-event-name=Roadmap'
            },
        ]
    }


    const handleCloseFeedback = () => {
        setOpenFeedbackModal(false)
    }

    const title = userType != UserType.AuthenticatedUser
        ?
        <h2 className="font-normal leading-none tracking-tight md:text-2xl text-secondary-text">Menu</h2>
        :
        <span className="font-normal text-secondary-text">
            <UserEmail email={email} />
        </span>

    return <>
        <span className="text-secondary-text cursor-pointer relative">
            {

                <>
                    <div className="relative top-">

                        <IconButton onClick={() => setOpenTopModal(true)} icon={
                            <MenuIcon strokeWidth={3} />
                        }>
                        </IconButton>

                    </div>
                    <Modal show={openTopModal} setShow={setOpenTopModal} header={title}>
                        <div className="text-sm font-medium text-left origin-top-right focus:outline-none flex flex-col justify-between h-full">
                            <div className="my-1">
                                <div className="flex mb-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            boot();
                                            show();
                                            updateWithProps();
                                        }}
                                        className={`w-4/12 flex flex-col items-center justify-center border-2 border-secondary-500 menu-link rounded-md outline-none bg-secondary-700 text-secondary-text hover:text-primary-text ${!isMobile ? "h-24 w-24" : "h-20 w-14"}`}
                                    >
                                        <ChatIcon className="h-6 w-6" strokeWidth={2} />
                                        <p className={`${isConnected ? "mt-1" : ""} text-base font-semibold`}>Help</p>
                                    </button>
                                    {isConnected ? (
                                        <MenuRainbowKitConnectWallet
                                            isMobile={isMobile}
                                            isConnected={isConnected}
                                        />
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => openConnectModal()}
                                            className={`w-4/12 mx-2 flex flex-col items-center justify-center border-2 border-secondary-500 menu-link rounded-md outline-none bg-secondary-700 text-secondary-text hover:text-primary-text ${!isMobile ? "h-24 w-24" : "h-20 w-14"}`}
                                        >
                                            <WalletIcon className="h-6 w-6" strokeWidth={2} />
                                            <p className="text-base font-semibold">Wallet</p>
                                        </button>
                                    )}
                                    <LinkWrapper
                                        href="/transactions"
                                        className={`w-4/12 flex flex-col items-center justify-center border-2 border-secondary-500 menu-link rounded-md outline-none bg-secondary-700 text-secondary-text hover:text-primary-text ${!isMobile ? "h-24 w-24" : "h-20 w-14"}`}
                                    >
                                        <ScrollText className="h-6 w-6" />
                                        <p className={`${isConnected ? "mt-1" : ""} text-base font-semibold`}>Transfers</p>
                                    </LinkWrapper>
                                </div>
                                <Menu>

                                    <Menu.Group>
                                        {
                                            router.pathname != '/' &&
                                            <Menu.Item pathname='/' icon={<Home className="h-5 w-5" />} >
                                                Home
                                            </Menu.Item>
                                        }
                                        {!embedded && router.pathname != '/campaigns' &&
                                            <Menu.Item pathname='/campaigns' icon={<Gift className="h-5 w-5" />} >
                                                Campaigns
                                            </Menu.Item>
                                        }
                                        {
                                            userType == UserType.AuthenticatedUser ?

                                                <Menu.Item
                                                    onClick={handleLogout}
                                                    icon={<LogOut className="h-5 w-5" />}
                                                >
                                                    Sign Out
                                                </Menu.Item>
                                                :

                                                router.pathname != '/auth' &&
                                                <Menu.Item pathname='/auth' icon={<LogIn className="h-5 w-5" />} >
                                                    Login
                                                </Menu.Item>

                                        }
                                    </Menu.Group>

                                    <Menu.Group>

                                        <Popover
                                            opener={
                                                <Menu.Item onClick={() => setOpenFeedbackModal(true)} target="_blank" icon={<MessageSquarePlus className="h-5 w-5" />} >
                                                    Suggest a Feature
                                                </Menu.Item>
                                            }
                                            isNested={true}
                                            show={openFeedbackModal}
                                            header="Suggest a Feature"
                                            setShow={setOpenFeedbackModal} >
                                            <div className="p-0 md:max-w-md">
                                                <SendFeedback onSend={handleCloseFeedback} />
                                            </div>
                                        </Popover>
                                    </Menu.Group>

                                    <Menu.Group>
                                        <Menu.Item pathname='https://docs.layerswap.io/' target="_blank" icon={<BookOpen className="h-5 w-5" />} >
                                            For Users
                                        </Menu.Item>
                                        <Menu.Item pathname='/forpartners' target={embedded ? "_blank" : "_self"} icon={<Users className="h-5 w-5" />} >
                                            For Partners
                                        </Menu.Item>

                                    </Menu.Group>

                                    <Menu.Group>
                                        <Menu.Item pathname='https://docs.layerswap.io/user-docs/information/privacy-policy' target="_blank" icon={<Shield className="h-5 w-5" />} >
                                            Privacy Policy
                                        </Menu.Item>
                                        <Menu.Item pathname='https://docs.layerswap.io/user-docs/information/terms-of-services' target="_blank" icon={<LibraryIcon className="h-5 w-5" />} >
                                            Terms of Service
                                        </Menu.Item>
                                    </Menu.Group>

                                </Menu>
                            </div>
                            <div className="flex justify-center mt-5">
                                {navigation.social.map((item) => (
                                    <Link key={item.name} target="_blank" href={item.href} className={`flex relative cursor-pointer select-none items-center py-1.5 outline-none text-secondary-text hover:text-primary-text ${item.className}`}>
                                        <div className="flex items-center">
                                            <div className="p-1.5 bg-secondary-500 rounded-md mr-4"><item.icon className="h-5 w-5" aria-hidden="true" /></div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </Modal>
                </>
            }
        </span >
    </>
}