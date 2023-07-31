import { BookOpen, ExternalLink, Link as LinkIcon, Gift, MenuIcon, ChevronRight, Map, Home, LogIn, LogOut, ScrollText, LibraryIcon, Shield, Users, MessageSquarePlus, Bell } from "lucide-react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { useAuthDataUpdate, useAuthState, UserType } from "../../context/authContext";
import { useMenuState } from "../../context/menu";
import TokenService from "../../lib/TokenService";
import { AnimatePresence } from "framer-motion";
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
import { RainbowKitConnectWallet } from "../HeaderWithMenu/ConnectedWallets";
import Popover from "../modal/popover";
import SendFeedback from "../sendFeedback";
import { Menu } from "@headlessui/react";
import IconButton from "../buttons/iconButton";

``

export default function () {
    const { email, userType, userId } = useAuthState()
    const { setUserType } = useAuthDataUpdate()
    const router = useRouter();
    const { menuVisible } = useMenuState()
    const { isConnected } = useAccount();
    const { boot, show, update } = useIntercom()
    const [embedded, setEmbedded] = useState<boolean>()
    const [openTopModal, setOpenTopModal] = useState(false);
    const { isMobile, isDesktop } = useWindowDimensions()
    const { openConnectModal } = useConnectModal();
    const [openFeedbackModal, setOpenFeedbackModal] = useState(false);

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

    const handleOpenTopModal = () => {
        setOpenTopModal((prevOpenTopModal) => !prevOpenTopModal);
    }
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
                name: 'Substack',
                href: 'https://layerswap.substack.com/',
                icon: (props) => SubstackLogo(props),
                className: 'plausible-event-name=Substack'
            },
        ]
    }

    return <>
        <span className="text-primary-text cursor-pointer relative">
            {
                <Menu as="div" className={`relative inline-block text-left ${menuVisible ? 'visible' : 'invisible'}`}>
                    {({ open }) => (
                        <>
                            <div className="relative top-">
                                <Menu.Button as='div'>
                                    <IconButton icon={
                                        <MenuIcon strokeWidth={3} />
                                    }>
                                    </IconButton>
                                </Menu.Button>
                            </div>
                            <Modal show={open} setShow={setOpenTopModal} header="Menu">
                                <AnimatePresence>
                                    <div className="text-sm font-medium text-left origin-top-right mt-2 focus:outline-none flex flex-col h-full">
                                        <div className="relative z-30 py-1">
                                            {
                                                userType == UserType.AuthenticatedUser ?
                                                    null
                                                    :
                                                    <>
                                                        <div className="flex justify-between">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    boot();
                                                                    show();
                                                                    updateWithProps();
                                                                }}
                                                                className={`${!isMobile ? "px-[35px] py-5" : "px-[17px] py-6"} border-2 border-secondary-500 menu-link flex flex-col mb-2 relative cursor-pointer select-none items-center rounded-md outline-none bg-secondary-700 text-primary-text hover:text-white`}
                                                            >
                                                                <ChatIcon className="h-6 w-6" strokeWidth={2} />
                                                                <p className={`${isConnected ? "mt-1" : ""}`}>Get Help</p>
                                                            </button>
                                                            {
                                                                isConnected ?
                                                                    <RainbowKitConnectWallet isMobile={isMobile} isConnected={isConnected} isMenuCard={true} />
                                                                    :
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => openConnectModal()}
                                                                        className={`${!isMobile ? "px-[15px] py-5" : "px-[13px] py-6"} border-2 border-secondary-500 menu-link flex flex-col mb-2 relative cursor-pointer select-none items-center rounded-md outline-none bg-secondary-700 text-primary-text hover:text-white`}
                                                                    >
                                                                        <WalletIcon className="h-6 w-6" strokeWidth={2} />
                                                                        <p>Connect a Wallet</p>
                                                                    </button>
                                                            }
                                                            <Link href="/transactions" className={`${!isMobile ? "px-[35px] py-5" : "px-[17px] py-6"} border-2 border-secondary-500 menu-link flex flex-col mb-2 relative cursor-pointer select-none items-center rounded-md outline-none bg-secondary-700 text-primary-text hover:text-white`}>
                                                                <ScrollText className="h-6 w-6" />
                                                                <p className={`${isConnected ? "mt-1" : ""}`}>Transfers</p>
                                                            </Link>
                                                        </div>
                                                        {
                                                            router.pathname != '/' &&
                                                            <Link href="/" className="border-2 border-secondary-500 menu-link my-1.5 flex relative cursor-pointer select-none items-center rounded-md px-4 py-1.5 outline-none bg-secondary-700 text-primary-text hover:text-white">
                                                                <div className="p-1.5 bg-secondary-500 rounded-md mr-4"><Home className="h-5 w-5" /></div>
                                                                <p>Home</p>
                                                                <ChevronRight className="h-4 w-4 absolute right-3" />
                                                            </Link>
                                                        }
                                                        {!embedded && router.pathname != '/campaigns' &&
                                                            <Link href="/campaigns" className="border-2 border-secondary-500 menu-link my-1.5 flex relative cursor-pointer select-none items-center rounded-md px-4 py-1.5 outline-none bg-secondary-700 text-primary-text hover:text-white">
                                                                <div className="p-1.5 bg-secondary-500 rounded-md mr-4"><Gift className="h-5 w-5" /></div>
                                                                <p>Campaigns</p>
                                                                <ChevronRight className="h-4 w-4 absolute right-3" />
                                                            </Link>
                                                        }
                                                        <Link
                                                            href="/auth"
                                                            className="border-2 border-secondary-500 menu-link my-1.5 flex relative cursor-pointer select-none items-center rounded-md px-4 py-1.5 outline-none bg-secondary-700 text-primary-text hover:text-white">
                                                            <div className="p-1.5 bg-secondary-500 rounded-md mr-4"><LogIn className="h-5 w-5" /></div>
                                                            <p>Login</p>
                                                            <ChevronRight className="h-4 w-4 absolute right-3" />
                                                        </Link>
                                                    </>
                                            }
                                            {
                                                userType == UserType.AuthenticatedUser &&
                                                <>
                                                    <div className="flex justify-between">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                boot();
                                                                show();
                                                                updateWithProps();
                                                            }}
                                                            className={`${!isMobile ? "px-[35px] py-5" : "px-[17px] py-6"} border-2 border-secondary-500 menu-link flex flex-col mb-2 relative cursor-pointer select-none items-center rounded-md outline-none bg-secondary-700 text-primary-text hover:text-white`}
                                                        >
                                                            <ChatIcon className="h-6 w-6" strokeWidth={2} />
                                                            <p className={`${isConnected ? "mt-1" : ""}`}>Get Help</p>
                                                        </button>
                                                        {
                                                            isConnected ?
                                                                <RainbowKitConnectWallet isMobile={isMobile} isConnected={isConnected} isMenuCard={true} />
                                                                :
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openConnectModal()}
                                                                    className={`${!isMobile ? "px-[15px] py-5" : "px-[13px] py-6"} border-2 border-secondary-500 menu-link flex flex-col mb-2 relative cursor-pointer select-none items-center rounded-md outline-none bg-secondary-700 text-primary-text hover:text-white`}
                                                                >
                                                                    <WalletIcon className="h-6 w-6" strokeWidth={2} />
                                                                    <p>Connect a Wallet</p>
                                                                </button>
                                                        }
                                                        <Link
                                                            href="/transactions"
                                                            className={`${!isMobile ? "px-[35px] py-5" : "px-[17px] py-6"} border-2 border-secondary-500 menu-link flex flex-col mb-2 relative cursor-pointer select-none items-center rounded-md outline-none bg-secondary-700 text-primary-text hover:text-white`}>
                                                            <ScrollText className="h-6 w-6" />
                                                            <p className={`${isConnected ? "mt-1" : ""}`}>Transfers</p>
                                                        </Link>
                                                    </div>
                                                    {
                                                        router.pathname != '/' &&
                                                        <Link
                                                            href="/"
                                                            className="border-2 border-secondary-500 menu-link my-1.5 flex relative cursor-pointer select-none items-center rounded-md px-4 py-1.5 outline-none bg-secondary-700 text-primary-text hover:text-white">
                                                            <div className="p-1.5 bg-secondary-500 rounded-md mr-4"><Home className="h-5 w-5" /></div>
                                                            <p>Home</p>
                                                            <ChevronRight className="h-4 w-4 absolute right-3" />
                                                        </Link>
                                                    }
                                                    <Link
                                                        href="/exchanges"
                                                        className="border-2 border-secondary-500 menu-link my-1.5 flex relative cursor-pointer select-none items-center rounded-md px-4 py-1.5 outline-none bg-secondary-700 text-primary-text hover:text-white">
                                                        <div className="p-1.5 bg-secondary-500 rounded-md mr-4"><LinkIcon className="h-5 w-5" /></div>
                                                        <p>Exchange Accounts</p>
                                                        <ChevronRight className="h-4 w-4 absolute right-3" />
                                                    </Link>
                                                    {!embedded && router.pathname != '/campaigns' &&
                                                        <Link
                                                            href="/campaigns"
                                                            className="menu-link my-1.5 flex relative cursor-pointer select-none items-center rounded-md px-4 py-1.5 outline-none bg-secondary-700 text-primary-text hover:text-white">
                                                            <div className="p-1.5 bg-secondary-500 rounded-md mr-4"><Gift className="h-5 w-5" /></div>
                                                            <p>Campaigns</p>
                                                            <ChevronRight className="h-4 w-4 absolute right-3" />
                                                        </Link>
                                                    }
                                                    <button
                                                        type="button"
                                                        onClick={handleLogout}
                                                        className="border-2 border-secondary-500 menu-link my-1.5 w-full flex relative cursor-pointer select-none items-center rounded-md px-4 py-1.5 outline-none bg-secondary-700 text-primary-text hover:text-white"
                                                    >
                                                        <div className="p-1.5 bg-secondary-500 rounded-md mr-4"><LogOut className="h-5 w-5" /></div>
                                                        <p>Sign Out</p>
                                                        <ChevronRight className="h-4 w-4 absolute right-3" />
                                                    </button>
                                                </>
                                            }
                                        </div>
                                        <p className="text-primary-text font-medium">New</p>
                                        <div className="relative py-1">
                                            <Link
                                                href="https://docs.layerswap.io/user-docs/using-layerswap/usdop-rewards"
                                                target="_blank"
                                                className="menu-link flex rounded-md relative cursor-pointer select-none items-center px-4 py-1.5 outline-none bg-secondary-700 text-primary-text hover:text-white border-2 border-secondary-500"
                                            >
                                                <div className="p-1.5 bg-secondary-500 rounded-md mr-4"><Bell className="h-5 w-5" strokeWidth={3} /></div>
                                                <p>Transfer to Avalanche with $AVAX refuel</p>
                                                <ExternalLink className="h-4 w-4 absolute right-3" />
                                            </Link>
                                            <Popover
                                                opener={
                                                    <button onClick={() => setOpenFeedbackModal(true)} className="mt-1.5 my-1.5 border-2 border-secondary-500 menu-link w-full flex relative cursor-pointer select-none items-center rounded-md px-4 py-1.5 outline-none bg-secondary-700 text-primary-text hover:text-white">
                                                        <div className="p-1.5 bg-secondary-500 rounded-md mr-4"><MessageSquarePlus className="h-5 w-5" /></div>
                                                        <p>Suggest a Feature</p>
                                                        <ChevronRight className="h-4 w-4 absolute right-3" />
                                                    </button>
                                                }
                                                isNested={true}
                                                show={openFeedbackModal}
                                                setShow={setOpenFeedbackModal} >
                                                <div className="p-0 md:p-5 md:max-w-md">
                                                    <SendFeedback onSend={() => setOpenFeedbackModal(false)} />
                                                </div>
                                            </Popover>
                                        </div>
                                        <p className="text-primary-text font-medium">Docs</p>
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
                                        <p className="text-primary-text font-medium mt-1.5">Social</p>
                                        <div className="relative py-1">
                                            {navigation.social.map((item) => (
                                                <Link key={item.name} target="_blank" href={item.href} className={`${item.name != "Twitter" ? "border-t" : "rounded-t-md"} border-slate-800 menu-link flex relative cursor-pointer select-none items-center px-4 py-1.5 outline-none bg-secondary-700 text-primary-text hover:text-white ${item.className}`}>
                                                    <div className="flex items-center">
                                                        <div className="p-1.5 bg-secondary-500 rounded-md mr-4"><item.icon className="h-5 w-5" aria-hidden="true" /></div>
                                                        <p>{item.name}</p>
                                                    </div>
                                                    <ExternalLink className="h-4 w-4 absolute right-3" />
                                                </Link>
                                            ))}
                                            {
                                                !embedded &&
                                                <Link
                                                    href="https://layerswap.ducalis.io/roadmap/summary"
                                                    target="_blank"
                                                    className="menu-link flex relative cursor-pointer select-none items-center rounded-b-md px-4 py-1.5 outline-none bg-secondary-700 text-primary-text hover:text-white border-t border-slate-800"
                                                >
                                                    <div className="p-1.5 bg-secondary-500 rounded-md mr-4"><Map className="h-5 w-5" /></div>
                                                    <p>Roadmap</p>
                                                    <ExternalLink className="h-4 w-4 absolute right-3" />
                                                </Link>
                                            }
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
                                    </div>
                                </AnimatePresence>
                            </Modal>
                        </>
                    )}
                </Menu>
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