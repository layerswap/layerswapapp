import { BookOpen, ExternalLink, Link as LinkIcon, Gift, MenuIcon, ChevronRight, Map, Home, LogIn, LogOut, ScrollText, LibraryIcon, Shield, Users, MessageSquarePlus, Bell } from "lucide-react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { useAuthDataUpdate, useAuthState, UserType } from "../../context/authContext";
import TokenService from "../../lib/TokenService";
import shortenAddress from "../utils/ShortenAddress";
import { ConnectButton, useConnectModal } from "@rainbow-me/rainbowkit";
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
``

export default function () {
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
        return (
            email.length >= 22 ? <>{shortenEmail(email)}</> : <>{email}</>
        )
    }

    useEffect(() => {
        setEmbedded(inIframe())
    }, [])

    const updateWithProps = () => update({ email: email, userId: userId })

    const handleLogout = useCallback(() => {
        TokenService.removeAuthData()
        if (router.pathname != '/') {
            router.push('/')
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
        <h2 className="font-normal leading-none tracking-tight text-gray-900 md:text-2xl dark:text-white">Menu</h2>
        :
        <span className="font-normal text-primary-text">
            <UserEmail email={email} />
        </span>

    return <>
        <span className="text-primary-text cursor-pointer relative">
            {

                <>
                    <div className="relative top-">

                        <IconButton onClick={() => setOpenTopModal(true)} icon={
                            <MenuIcon strokeWidth={3} />
                        }>
                        </IconButton>

                    </div>
                    <Modal show={openTopModal} setShow={setOpenTopModal} header={title}>
                        <div className="text-sm font-medium text-left origin-top-right mt-2 focus:outline-none flex flex-col h-full">
                            <div className="relative z-30 py-1">
                                {
                                    userType == UserType.AuthenticatedUser ?
                                        null
                                        :
                                        <>
                                            <div className="flex mb-3">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        boot();
                                                        show();
                                                        updateWithProps();
                                                    }}
                                                    className={`w-4/12 flex flex-col items-center justify-center border-2 border-secondary-500 menu-link rounded-md outline-none bg-secondary-700 text-primary-text hover:text-white ${!isMobile ? "h-24 w-24" : "h-20 w-14"}`}
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
                                                        className={`w-4/12 mx-2 flex flex-col items-center justify-center border-2 border-secondary-500 menu-link rounded-md outline-none bg-secondary-700 text-primary-text hover:text-white ${!isMobile ? "h-24 w-24" : "h-20 w-14"}`}
                                                    >
                                                        <WalletIcon className="h-6 w-6" strokeWidth={2} />
                                                        <p className="text-base font-semibold">Wallet</p>
                                                    </button>
                                                )}
                                                <Link
                                                    href="/transactions"
                                                    className={`w-4/12 flex flex-col items-center justify-center border-2 border-secondary-500 menu-link rounded-md outline-none bg-secondary-700 text-primary-text hover:text-white ${!isMobile ? "h-24 w-24" : "h-20 w-14"}`}
                                                >
                                                    <ScrollText className="h-6 w-6" />
                                                    <p className={`${isConnected ? "mt-1" : ""} text-base font-semibold`}>Transfers</p>
                                                </Link>
                                            </div>
                                            {
                                                router.pathname != '/' &&
                                                <Link href="/" className="border-2 border-secondary-500 menu-link my-1.5 flex relative cursor-pointer select-none items-center rounded-md px-4 py-1.5 outline-none bg-secondary-700 text-primary-text hover:text-white">
                                                    <div className="px-1.5 py-2 bg-secondary-500 rounded-md mr-4"><Home className="h-5 w-5" /></div>
                                                    <p className="text-base font-semibold">Home</p>
                                                    <ChevronRight className="h-4 w-4 absolute right-3" />
                                                </Link>
                                            }
                                            {!embedded && router.pathname != '/campaigns' &&
                                                <Link href="/campaigns" className="border-2 border-secondary-500 menu-link my-1.5 flex relative cursor-pointer select-none items-center rounded-md px-4 py-1.5 outline-none bg-secondary-700 text-primary-text hover:text-white">
                                                    <div className="px-1.5 py-2 bg-secondary-500 rounded-md mr-4"><Gift className="h-5 w-5" /></div>
                                                    <p className="text-base font-semibold">Campaigns</p>
                                                    <ChevronRight className="h-4 w-4 absolute right-3" />
                                                </Link>
                                            }
                                            {router.pathname != '/auth' && <Link
                                                href="/auth"
                                                className="border-2 border-secondary-500 menu-link my-1.5 flex relative cursor-pointer select-none items-center rounded-md px-4 py-1.5 outline-none bg-secondary-700 text-primary-text hover:text-white">
                                                <div className="px-1.5 py-2 bg-secondary-500 rounded-md mr-4"><LogIn className="h-5 w-5" /></div>
                                                <p className="text-base font-semibold">Login</p>
                                                <ChevronRight className="h-4 w-4 absolute right-3" />
                                            </Link>
                                            }
                                        </>
                                }
                                {
                                    userType == UserType.AuthenticatedUser &&
                                    <>
                                        <div className="flex mb-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    boot();
                                                    show();
                                                    updateWithProps();
                                                }}
                                                className={`w-4/12 flex flex-col items-center justify-center border-2 border-secondary-500 menu-link rounded-md outline-none bg-secondary-700 text-primary-text hover:text-white ${!isMobile ? "h-24 w-24" : "h-20 w-14"}`}
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
                                                    className={`w-4/12 mx-2 flex flex-col items-center justify-center border-2 border-secondary-500 menu-link rounded-md outline-none bg-secondary-700 text-primary-text hover:text-white ${!isMobile ? "h-24 w-24" : "h-20 w-14"}`}
                                                >
                                                    <WalletIcon className="h-6 w-6" strokeWidth={2} />
                                                    <p className="text-base font-semibold">Wallet</p>
                                                </button>
                                            )}
                                            <Link
                                                href="/transactions"
                                                className={`w-4/12 flex flex-col items-center justify-center border-2 border-secondary-500 menu-link rounded-md outline-none bg-secondary-700 text-primary-text hover:text-white ${!isMobile ? "h-24 w-24" : "h-20 w-14"}`}
                                            >
                                                <ScrollText className="h-6 w-6" />
                                                <p className={`${isConnected ? "mt-1" : ""} text-base font-semibold`}>Transfers</p>
                                            </Link>
                                        </div>
                                        {
                                            router.pathname != '/' &&
                                            <Link
                                                href="/"
                                                className="border-2 border-secondary-500 menu-link my-1.5 flex relative cursor-pointer select-none items-center rounded-md px-4 py-1.5 outline-none bg-secondary-700 text-primary-text hover:text-white">
                                                <div className="px-1.5 py-2 bg-secondary-500 rounded-md mr-4"><Home className="h-5 w-5" /></div>
                                                <p className="text-base font-semibold">Home</p>
                                                <ChevronRight className="h-4 w-4 absolute right-3" />
                                            </Link>
                                        }
                                        {!embedded && router.pathname != '/campaigns' &&
                                            <Link
                                                href="/campaigns"
                                                className="border-2 border-secondary-500 menu-link my-1.5 flex relative cursor-pointer select-none items-center rounded-md px-4 py-1.5 outline-none bg-secondary-700 text-primary-text hover:text-white">
                                                <div className="px-1.5 py-2 bg-secondary-500 rounded-md mr-4"><Gift className="h-5 w-5" /></div>
                                                <p className="text-base font-semibold">Campaigns</p>
                                                <ChevronRight className="h-4 w-4 absolute right-3" />
                                            </Link>
                                        }
                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            className="border-2 border-secondary-500 menu-link my-1.5 mb-4 w-full flex relative cursor-pointer select-none items-center rounded-md px-4 py-1.5 outline-none bg-secondary-700 text-primary-text hover:text-white"
                                        >
                                            <div className="px-1.5 py-2 bg-secondary-500 rounded-md mr-4"><LogOut className="h-5 w-5" /></div>
                                            <p className="text-base font-semibold">Sign Out</p>
                                            <ChevronRight className="h-4 w-4 absolute right-3" />
                                        </button>
                                    </>
                                }
                            </div>
                            <p className="text-primary-text font-medium mt-1.5">New</p>
                            <div className="relative py-1">
                                <Link
                                    href="?to=base_mainnet"
                                    className="menu-link flex rounded-t-md relative cursor-pointer select-none items-center px-4 py-1.5 outline-none bg-secondary-700 text-primary-text hover:text-white"
                                >
                                    <div className="p-1.5 bg-secondary-500 rounded-md mr-4"><Bell className="h-5 w-5" strokeWidth={3} /></div>
                                    <p>We're live on Base!</p>
                                    <ChevronRight className="h-4 w-4 absolute right-3" />
                                </Link>
                                <Popover
                                    opener={
                                        <button onClick={() => setOpenFeedbackModal(true)} className="menu-link border-t border-slate-800 w-full flex relative cursor-pointer select-none items-center rounded-b-md px-4 py-1.5 outline-none bg-secondary-700 text-primary-text hover:text-white">
                                            <div className="p-1.5 bg-secondary-500 rounded-md mr-4"><MessageSquarePlus className="h-5 w-5" /></div>
                                            <p>Suggest a Feature</p>
                                            <ChevronRight className="h-4 w-4 absolute right-3" />
                                        </button>
                                    }
                                    isNested={true}
                                    show={openFeedbackModal}
                                    header="Suggest a Feature"
                                    setShow={setOpenFeedbackModal} >
                                    <div className="p-0 md:max-w-md">
                                        <SendFeedback onSend={handleCloseFeedback} />
                                    </div>
                                </Popover>
                            </div>
                            <p className="text-primary-text font-medium mt-1.5">Docs</p>
                            <div className="relative py-1">
                                <Link
                                    href="https://docs.layerswap.io/"
                                    target="_blank"
                                    className="menu-link flex rounded-t-md relative cursor-pointer select-none items-center px-4 py-1.5 outline-none bg-secondary-700 text-primary-text hover:text-white"
                                >
                                    <div className="p-1.5 bg-secondary-500 rounded-md mr-4"><BookOpen className="h-5 w-5" /></div>
                                    <p>For Users</p>
                                    <ExternalLink className="h-4 w-4 absolute right-3" />
                                </Link>
                                <Link
                                    href="/forpartners"
                                    target="_self"
                                    className="menu-link flex rounded-b-md relative cursor-pointer select-none items-center px-4 py-1.5 outline-none bg-secondary-700 text-primary-text hover:text-white border-t border-slate-800"
                                >
                                    <div className="p-1.5 bg-secondary-500 rounded-md mr-4"><Users className="h-5 w-5" /></div>
                                    <p>For Partners</p>
                                    <ChevronRight className="h-4 w-4 absolute right-3" />
                                </Link>
                            </div>
                            <p className="text-primary-text font-medium mt-1.5">Legal</p>
                            <div className="relative py-1">
                                <Link
                                    href="https://docs.layerswap.io/user-docs/information/privacy-policy"
                                    target="_blank"
                                    className="menu-link flex relative cursor-pointer select-none items-center rounded-t-md px-4 py-1.5 outline-none bg-secondary-700 text-primary-text hover:text-white"
                                >
                                    <div className="p-1.5 bg-secondary-500 rounded-md mr-4"><Shield className="h-5 w-5" /></div>
                                    <p>Privacy Policy</p>
                                    <ExternalLink className="h-4 w-4 absolute right-3" />
                                </Link>
                                <Link
                                    href="https://docs.layerswap.io/user-docs/information/terms-of-services"
                                    target="_blank"
                                    className="menu-link flex rounded-b-md relative cursor-pointer select-none items-center px-4 py-1.5 outline-none bg-secondary-700 text-primary-text hover:text-white border-t border-slate-800"
                                >
                                    <div className="p-1.5 bg-secondary-500 rounded-md mr-4"><LibraryIcon className="h-5 w-5" /></div>
                                    <p>Terms of Service</p>
                                    <ExternalLink className="h-4 w-4 absolute right-3" />
                                </Link>
                            </div>
                            <div className="flex justify-center mt-5">
                                {navigation.social.map((item) => (
                                    <Link key={item.name} target="_blank" href={item.href} className={`menu-link flex relative cursor-pointer select-none items-center py-1.5 outline-none text-primary-text hover:text-white ${item.className}`}>
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
        </span>
    </>
}

const WalletAddress = (isMobile, isConnected) => {
    return <ConnectButton.Custom>
        {({ account, mounted, chain, openAccountModal }) => {
            if (mounted && account && chain)
                return <button
                    type="button"
                    onClick={openAccountModal}
                    className={`${!isMobile?.isMobile ? "px-[30px] py-5" : "px-[25px] py-6"} border-2 border-secondary-500 menu-link flex flex-col mb-2 relative cursor-pointer select-none items-center rounded-md outline-none bg-secondary-700 text-primary-text hover:text-white`}
                >
                    <WalletIcon className="h-6 w-6" strokeWidth={2} />
                    <p>{shortenAddress(account.address)}</p>
                </button>
            else
                return <></>
        }}
    </ConnectButton.Custom>
}