import { BookOpen, ExternalLink, Link as LinkIcon, Gift, MenuIcon, ChevronRight } from "lucide-react";
import { Home, LogIn, LogOut, TableIcon, User } from "lucide-react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { useAuthDataUpdate, useAuthState, UserType } from "../../context/authContext";
import { useMenuState } from "../../context/menu";
import TokenService from "../../lib/TokenService";
import { AnimatePresence, motion } from "framer-motion";
import shortenAddress, { shortenEmail } from "../utils/ShortenAddress";
import { ConnectButton } from "@rainbow-me/rainbowkit";
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
        {
            <>
                <button onClick={handleOpenTopModal} type="button" className="-mx-2 p-1.5 justify-self-start text-primary-text hover:bg-secondary-500 hover:text-white focus:outline-none inline-flex rounded-lg items-center">
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
                                                <Link href="/" className="menu-link flex mb-2 relative cursor-pointer select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white">
                                                    <Home className="h-6 w-6 mr-4" />
                                                    <p>Home</p>
                                                    <ChevronRight className="h-4 w-4 absolute right-0" />
                                                </Link>
                                            }
                                            {
                                                userType == UserType.GuestUser &&
                                                <Link href="/transactions" className="menu-link flex mb-2 relative cursor-pointer select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white">
                                                    <TableIcon className="h-6 w-6 mr-4" />
                                                    <p>Transfers</p>
                                                    <ChevronRight className="h-4 w-4 absolute right-0" />
                                                </Link>
                                            }
                                            {!embedded && router.pathname != '/campaigns' &&
                                                <Link href="/campaigns" className="menu-link flex mb-2 relative cursor-pointer select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white">
                                                    <Gift className="h-6 w-6 mr-4" />
                                                    <p>Campaigns</p>
                                                    <ChevronRight className="h-4 w-4 absolute right-0" />
                                                </Link>
                                            }
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    boot();
                                                    show();
                                                    updateWithProps();
                                                }}
                                                className="menu-link w-full flex mb-2 relative cursor-pointer select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white"
                                            >
                                                <ChatIcon className="h-6 w-6 mr-4" strokeWidth={2} />
                                                <p>Get Help</p>
                                                <ChevronRight className="h-4 w-4 absolute right-0" />
                                            </button>
                                            <hr className="horizontal-gradient" />
                                            <Link
                                                href="https://docs.layerswap.io/"
                                                target="_blank"
                                                className="menu-link flex mb-2 relative cursor-pointer select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white"
                                            >
                                                <BookOpen className="h-6 w-6 mr-4" />
                                                <p>User Docs</p>
                                                <ChevronRight className="h-4 w-4 absolute right-0" />
                                            </Link>
                                            {
                                                !embedded &&
                                                <Link
                                                    href="https://layerswap.ducalis.io/roadmap/summary"
                                                    target="_blank"
                                                    className="menu-link flex mb-2 relative cursor-pointer select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white"
                                                >
                                                    <ExternalLink className="h-6 w-6 mr-4" />
                                                    <p>Roadmap</p>
                                                    <ChevronRight className="h-4 w-4 absolute right-0" />
                                                </Link>
                                            }
                                            <hr className="horizontal-gradient" />
                                            <Link
                                                href="/auth"
                                                className="menu-link flex mb-2 relative cursor-pointer select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white">
                                                <LogIn className="h-6 w-6 mr-4" />
                                                <p>Login</p>
                                                <ChevronRight className="h-4 w-4 absolute right-0" />
                                            </Link>
                                        </>
                                }
                                {
                                    userType == UserType.AuthenticatedUser &&
                                    <>
                                        {
                                            router.pathname != '/' &&
                                            <Link
                                                href="/"
                                                className="menu-link flex mb-2 relative cursor-pointer select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white">
                                                <Home className="h-6 w-6 mr-4" />
                                                <p>Home</p>
                                                <ChevronRight className="h-4 w-4 absolute right-0" />
                                            </Link>
                                        }
                                        <Link
                                            href="/transactions"
                                            className="menu-link flex mb-2 relative cursor-pointer select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white">
                                            <TableIcon className="h-6 w-6 mr-4" />
                                            <p>Transfers</p>
                                            <ChevronRight className="h-4 w-4 absolute right-0" />
                                        </Link>
                                        <Link
                                            href="/exchanges"
                                            className="menu-link flex mb-2 relative cursor-pointer select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white">
                                            <LinkIcon className="h-6 w-6 mr-4" />
                                            <p>Exchange Accounts</p>
                                            <ChevronRight className="h-4 w-4 absolute right-0" />
                                        </Link>
                                        {!embedded && router.pathname != '/campaigns' &&
                                            <Link
                                                href="/campaigns"
                                                className="menu-link flex mb-2 relative cursor-pointer select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white">
                                                <Gift className="h-6 w-6 mr-4" />
                                                <p>Campaigns</p>
                                                <ChevronRight className="h-4 w-4 absolute right-0" />
                                            </Link>
                                        }
                                        <hr className="horizontal-gradient" />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                boot();
                                                show();
                                                updateWithProps();
                                            }}
                                            className="menu-link w-full flex mb-2 relative cursor-pointer select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white"
                                        >
                                            <ChatIcon className="h-6 w-6 mr-4" strokeWidth={2} />
                                            <p>Get Help</p>
                                            <ChevronRight className="h-4 w-4 absolute right-0" />
                                        </button>
                                        <Link
                                            href="https://docs.layerswap.io/"
                                            target="_blank"
                                            className="menu-link flex mb-2 relative cursor-pointer select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white"
                                        >
                                            <BookOpen className="h-6 w-6 mr-4" />
                                            <p>User Docs</p>
                                            <ChevronRight className="h-4 w-4 absolute right-0" />
                                        </Link>
                                        {
                                            !embedded &&
                                            <Link
                                                href="https://layerswap.ducalis.io/roadmap/summary"
                                                target="_blank"
                                                className="menu-link flex mb-2 relative cursor-pointer select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white"
                                            >
                                                <ExternalLink className="h-6 w-6 mr-4" />
                                                <p>Roadmap</p>
                                                <ChevronRight className="h-4 w-4 absolute right-0" />
                                            </Link>
                                        }
                                        <hr className="horizontal-gradient" />
                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            className="menu-link w-full flex mb-2 relative cursor-pointer select-none items-center rounded-sm px-2 py-2.5 outline-none hover:bg-secondary-700 hover:text-white"
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
                                        <Link key={item.name} target="_blank" href={item.href} className={`text-primary-text hover:text-gray-400 ${item.className}`}>
                                            <span className="sr-only">{item.name}</span>
                                            <item.icon className="h-6 w-6" aria-hidden="true" />
                                        </Link>
                                    ))}
                                </div>

                            </div>
                        </div>
                    </AnimatePresence>
                </Modal>
            </>
        }
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