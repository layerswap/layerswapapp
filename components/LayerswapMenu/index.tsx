import { BookOpen, ExternalLink, Gift, Link, MenuIcon, ChevronRight } from "lucide-react";
import { Home, LogIn, LogOut, TableIcon, User } from "lucide-react";
import { useRouter } from "next/router";
import { useCallback, useState } from "react";
import { useAuthDataUpdate, useAuthState, UserType } from "../../context/authContext";
import { useMenuState } from "../../context/menu";
import TokenService from "../../lib/TokenService";
import { AnimatePresence } from "framer-motion";
import shortenAddress, { shortenEmail } from "../utils/ShortenAddress";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useIntercom } from "react-use-intercom";
import ChatIcon from "../icons/ChatIcon";
import WalletIcon from "../icons/WalletIcon";
import Modal from "../../components/modal/modal";
import DiscordLogo from "./../icons/DiscordLogo";
import GitHubLogo from "./../icons/GitHubLogo";
import SubstackLogo from "./../icons/SubstackLogo";
import TwitterLogo from "./../icons/TwitterLogo";
import useWindowDimensions from "../../hooks/useWindowDimensions";

export default function () {
    const { email, userType, userId } = useAuthState();
    const { setUserType } = useAuthDataUpdate();
    const router = useRouter();
    const { menuVisible } = useMenuState();
    const { isConnected } = useAccount();
    const { boot, show, update } = useIntercom();
    const updateWithProps = () => update({ email: email, userId: userId });
    const [openTopModal, setOpenTopModal] = useState(false);
    const { isMobile, isDesktop } = useWindowDimensions()

    const handleLogout = useCallback(() => {
        TokenService.removeAuthData()
        if (router.pathname != '/') {
            router.push('/')
        } else {
            router.reload()
        }
        setUserType(UserType.NotAuthenticatedUser)
    }, [router.query])

    const UserEmail = ({ email }: { email: string }) => {
        return (
            email.length >= 22 ? <>{shortenEmail(email)}</> : <>{email}</>
        )
    }

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
                name: 'Substack ',
                href: 'https://layerswap.substack.com/',
                icon: (props) => SubstackLogo(props),
                className: 'plausible-event-name=Substack'
            },
        ]
    }

    return <>
        <span className="text-primary-text cursor-pointer relative">
            {
                <>
                    <button onClick={handleOpenTopModal} type="button" className="relative top-">
                        <MenuIcon strokeWidth={3} />
                    </button>
                    <Modal height={`${userType == UserType.AuthenticatedUser || router.pathname == '/auth' || isMobile ? "full" : "80%"}`} show={openTopModal} setShow={setOpenTopModal}>
                        <AnimatePresence>
                            <div className="font-bold text-sm font-medium text-left origin-top-right mt-2 focus:outline-none">
                                <div className="relative z-30 py-1">
                                    {
                                        isConnected &&
                                        <>
                                            <WalletAddress />
                                            <hr className="horizontal-gradient" />
                                        </>
                                    }
                                    {

                                        userType == UserType.AuthenticatedUser ?
                                            <>
                                                <hr className="horizontal-gradient" />
                                            </>
                                            :
                                            <>
                                                {
                                                    router.pathname != '/' &&
                                                    <a href="/" className="menu-link flex mb-2 relative cursor-pointer flex select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white">
                                                        <Home className="h-6 w-6 mr-4" />
                                                        <p>Home</p>
                                                        <ChevronRight className="h-4 w-4 absolute right-0" />
                                                    </a>
                                                }
                                                {
                                                    userType == UserType.GuestUser &&
                                                    <a href="/transactions" className="menu-link flex mb-2 relative cursor-pointer flex select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white">
                                                        <TableIcon className="h-6 w-6 mr-4" />
                                                        <p>Transfers</p>
                                                        <ChevronRight className="h-4 w-4 absolute right-0" />
                                                    </a>
                                                }
                                                {router.pathname != '/rewards' &&
                                                    <a href="/rewards" className="menu-link flex mb-2 relative cursor-pointer flex select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white">
                                                        <Gift className="h-6 w-6 mr-4" />
                                                        <p>Rewards</p>
                                                        <ChevronRight className="h-4 w-4 absolute right-0" />
                                                    </a>
                                                }
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        boot();
                                                        show();
                                                        updateWithProps();
                                                    }}
                                                    className="menu-link w-full flex mb-2 relative cursor-pointer flex select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white"
                                                >
                                                    <ChatIcon className="h-6 w-6 mr-4" strokeWidth={2} />
                                                    <p>Get Help</p>
                                                    <ChevronRight className="h-4 w-4 absolute right-0" />
                                                </button>
                                                <hr className="horizontal-gradient" />
                                                <a
                                                    href="https://docs.layerswap.io/"
                                                    target="_blank"
                                                    className="menu-link flex mb-2 relative cursor-pointer flex select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white"
                                                >
                                                    <BookOpen className="h-6 w-6 mr-4" />
                                                    <p>User Docs</p>
                                                    <ChevronRight className="h-4 w-4 absolute right-0" />
                                                </a>
                                                <a
                                                    href="https://layerswap.frill.co/roadmap"
                                                    target="_blank"
                                                    className="menu-link flex mb-2 relative cursor-pointer flex select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white"
                                                >
                                                    <ExternalLink className="h-6 w-6 mr-4" />
                                                    <p>Roadmap</p>
                                                    <ChevronRight className="h-4 w-4 absolute right-0" />
                                                </a>
                                                <hr className="horizontal-gradient" />
                                                <a
                                                    href="/auth"
                                                    className="menu-link flex mb-2 relative cursor-pointer flex select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white">
                                                    <LogIn className="h-6 w-6 mr-4" />
                                                    <p>Login</p>
                                                    <ChevronRight className="h-4 w-4 absolute right-0" />
                                                </a>
                                            </>
                                    }
                                    {
                                        userType == UserType.AuthenticatedUser &&
                                        <>
                                            {
                                                router.pathname != '/' &&
                                                <a
                                                    href="/"
                                                    className="menu-link flex mb-2 relative cursor-pointer flex select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white">
                                                    <Home className="h-6 w-6 mr-4" />
                                                    <p>Home</p>
                                                    <ChevronRight className="h-4 w-4 absolute right-0" />
                                                </a>
                                            }
                                            <a
                                                href="/transactions"
                                                className="menu-link flex mb-2 relative cursor-pointer flex select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white">
                                                <TableIcon className="h-6 w-6 mr-4" />
                                                <p>Transfers</p>
                                                <ChevronRight className="h-4 w-4 absolute right-0" />
                                            </a>
                                            <a
                                                href="/exchanges"
                                                className="menu-link flex mb-2 relative cursor-pointer flex select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white">
                                                <Link className="h-6 w-6 mr-4" />
                                                <p>Exchange Accounts</p>
                                            </a>
                                            {router.pathname != '/rewards' &&
                                                <a
                                                    href="/rewards"
                                                    className="menu-link flex mb-2 relative cursor-pointer flex select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white">
                                                    <Gift className="h-6 w-6 mr-4" />
                                                    <p>Rewards</p>
                                                    <ChevronRight className="h-4 w-4 absolute right-0" />
                                                </a>
                                            }
                                            <hr className="horizontal-gradient" />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    boot();
                                                    show();
                                                    updateWithProps();
                                                }}
                                                className="menu-link w-full flex mb-2 relative cursor-pointer flex select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white"
                                            >
                                                <ChatIcon className="h-6 w-6 mr-4" strokeWidth={2} />
                                                <p>Get Help</p>
                                                <ChevronRight className="h-4 w-4 absolute right-0" />
                                            </button>
                                            <a
                                                href="https://docs.layerswap.io/"
                                                target="_blank"
                                                className="menu-link flex mb-2 relative cursor-pointer flex select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white"
                                            >
                                                <BookOpen className="h-6 w-6 mr-4" />
                                                <p>User Docs</p>
                                                <ChevronRight className="h-4 w-4 absolute right-0" />
                                            </a>
                                            <a
                                                href="https://layerswap.frill.co/roadmap"
                                                target="_blank"
                                                className="menu-link flex mb-2 relative cursor-pointer flex select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white"
                                            >
                                                <ExternalLink className="h-6 w-6 mr-4" />
                                                <p>Roadmap</p>
                                                <ChevronRight className="h-4 w-4 absolute right-0" />
                                            </a>
                                            <hr className="horizontal-gradient" />
                                            <button
                                                type="button"
                                                onClick={handleLogout}
                                                className="menu-link w-full flex mb-2 relative cursor-pointer flex select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white"
                                            >
                                                <LogOut className="h-6 w-6 mr-4" />
                                                <p>Sign Out</p>
                                                {
                                                    userType == UserType.AuthenticatedUser &&
                                                    <span className="font-normal ml-10">
                                                        <UserEmail email={email} />
                                                    </span>
                                                }
                                                <ChevronRight className="h-4 w-4 absolute right-0" />
                                            </button>
                                        </>
                                    }
                                </div>
                                <div className="flex flex-col px-2 py-3 text-primary-text w-11/12 font-light absolute bottom-0">
                                    <div>
                                        <h1 className="text-xl font-light text-white">About Layerswap</h1>
                                        <p className="text-base mt-2">
                                            Move crypto across exchanges, blockchains, and wallets. <a className='underline hover:no-underline cursor-pointer plausible-event-name=Read+more' href='https://docs.layerswap.io/user-docs/' target='_blank'>Read more</a>
                                        </p>
                                    </div>
                                    <div className="flex space-x-6 mt-4">
                                        {navigation.social.map((item) => (
                                            <a key={item.name} target="_blank" href={item.href} className={`text-primary-text hover:text-gray-400 ${item.className}`}>
                                                <span className="sr-only">{item.name}</span>
                                                <item.icon className="h-6 w-6" aria-hidden="true" />
                                            </a>
                                        ))}
                                    </div>

                                </div>
                            </div>
                        </AnimatePresence>
                    </Modal>
                </>
            }
        </span>
    </>
}

const WalletAddress = () => {
    return <ConnectButton.Custom>
        {({ account, mounted, chain, openAccountModal }) => {
            if (mounted && account && chain)
                return <button type="button" onClick={openAccountModal} className='font-light w-full text-left px-4 py-2 text-sm cursor-default flex items-center space-x-2'>
                    <WalletIcon className="h-6 w-6 mr-2" />
                    <span>{shortenAddress(account.address)}</span>
                </button>
            else
                return <></>
        }}
    </ConnectButton.Custom>
}