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

export default function () {
    const { email, userType, userId } = useAuthState();
    const { setUserType } = useAuthDataUpdate();
    const router = useRouter();
    const { menuVisible } = useMenuState();
    const { isConnected } = useAccount();
    const { boot, show, update } = useIntercom();
    const updateWithProps = () => update({ email: email, userId: userId });
    const [openTopModal, setOpenTopModal] = useState(false);

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
        main: [
            { name: 'For Partners', href: '/forpartners', target: '_self' },
            { name: 'Privacy Policy', href: 'https://docs.layerswap.io/user-docs/information/privacy-policy', target: '_blank' },
            { name: 'Terms of Service', href: 'https://docs.layerswap.io/user-docs/information/terms-of-services', target: '_blank' },
        ],
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
        ],
    }

    return <>
        <span className="text-primary-text cursor-pointer relative">
            {
                <>
                    <button onClick={handleOpenTopModal} type="button" className="relative top-">
                        <MenuIcon strokeWidth={3} />
                    </button>
                    <Modal height="full" show={openTopModal} setShow={setOpenTopModal}>
                        <AnimatePresence>
                            <div className="font-bold text-base text-left origin-top-right mt-2 focus:outline-none">
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
                                                    <a href="/" className="menu-link flex mb-2 relative items-center rounded p-1.5 hover:bg-slate-700">
                                                        <Home className="h-6 w-6 mr-2" />
                                                        <p>Home</p>
                                                        <ChevronRight className="h-3 w-3 absolute right-10" />
                                                    </a>
                                                }

                                                {
                                                    userType == UserType.GuestUser &&
                                                    <a href="/transactions" className="menu-link flex mb-2 relative items-center rounded p-1.5 hover:bg-slate-700">
                                                        <TableIcon className="h-6 w-6 mr-2" />
                                                        <p>Transfers</p>
                                                        <ChevronRight className="h-3 w-3 absolute right-10" />
                                                    </a>
                                                }
                                                {router.pathname != '/rewards' &&
                                                    <a href="/rewards" className="menu-link flex mb-2 relative items-center rounded p-1.5 hover:bg-slate-700">
                                                        <Gift className="h-6 w-6 mr-2" />
                                                        <p>Rewards</p>
                                                        <ChevronRight className="h-3 w-3 absolute right-10" />
                                                    </a>
                                                }
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        boot();
                                                        show();
                                                        updateWithProps();
                                                    }}
                                                    className="menu-button flex mb-2 items-center rounded p-1.5 hover:bg-slate-700 w-full"
                                                >
                                                    <ChatIcon className="h-6 w-6 mr-2" strokeWidth={2} />
                                                    <p>Get Help</p>
                                                    <ChevronRight className="h-3 w-3 absolute right-10" />
                                                </button>
                                                <hr className="horizontal-gradient" />
                                                <a
                                                    href="https://docs.layerswap.io/"
                                                    target="_blank"
                                                    className="menu-link flex mb-2 mt-2 relative items-center rounded p-1.5 hover:bg-slate-700"
                                                >
                                                    <BookOpen className="h-6 w-6 mr-2" />
                                                    <p>User Docs</p>
                                                    <ChevronRight className="h-3 w-3 absolute right-10" />
                                                </a>
                                                <a
                                                    href="https://layerswap.frill.co/roadmap"
                                                    target="_blank"
                                                    className="menu-link flex mb-2 relative items-center rounded p-1.5 hover:bg-slate-700"
                                                >
                                                    <ExternalLink className="h-6 w-6 mr-2" />
                                                    <p>Roadmap</p>
                                                    <ChevronRight className="h-3 w-3 absolute right-10" />
                                                </a>
                                                <hr className="horizontal-gradient" />
                                                <a href="/auth" className="menu-link flex mb-2 mt-2 relative items-center rounded p-1.5 hover:bg-slate-700">
                                                    <LogIn className="h-6 w-6 mr-2" />
                                                    <p>Login</p>
                                                    <ChevronRight className="h-3 w-3 absolute right-10" />
                                                </a>
                                            </>
                                    }
                                    {
                                        userType == UserType.AuthenticatedUser &&
                                        <>
                                            {
                                                router.pathname != '/' &&
                                                <a href="/" className="menu-link flex mb-2 relative items-center rounded p-1.5 hover:bg-slate-700">
                                                    <Home className="h-6 w-6 mr-2" />
                                                    <p>Home</p>
                                                    <ChevronRight className="h-3 w-3 absolute right-10" />
                                                </a>
                                            }
                                            <a href="/transactions" className="menu-link flex mb-2 relative items-center rounded p-1.5 hover:bg-slate-700">
                                                <TableIcon className="h-6 w-6 mr-2" />
                                                <p>Transfers</p>
                                                <ChevronRight className="h-3 w-3 absolute right-10" />
                                            </a>
                                            <a href="/exchanges" className="menu-link flex mb-2 relative items-center rounded p-1.5 hover:bg-slate-700">
                                                <Link className="h-6 w-6 mr-2" />
                                                <p>Exchange Accounts</p>
                                            </a>
                                            {router.pathname != '/rewards' &&
                                                <a href="/rewards" className="menu-link flex mb-2 relative items-center rounded p-1.5 hover:bg-slate-700">
                                                    <Gift className="h-6 w-6 mr-2" />
                                                    <p>Rewards</p>
                                                    <ChevronRight className="h-3 w-3 absolute right-10" />
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
                                                className="menu-button flex mb-2 rounded p-2 hover:bg-slate-700 w-full"
                                            >
                                                <ChatIcon className="h-6 w-6 mr-2" strokeWidth={2} />
                                                <p>Get Help</p>
                                                <ChevronRight className="h-3 w-3 absolute right-10" />
                                            </button>
                                            <a
                                                href="https://docs.layerswap.io/"
                                                target="_blank"
                                                className="menu-link flex mb-2 relative items-center rounded p-2 hover:bg-slate-700"
                                            >
                                                <BookOpen className="h-6 w-6 mr-2" />
                                                <p>User Docs</p>
                                                <ChevronRight className="h-3 w-3 absolute right-10" />
                                            </a>
                                            <a
                                                href="https://layerswap.frill.co/roadmap"
                                                target="_blank"
                                                className="menu-link flex mb-2 relative items-center rounded p-2 hover:bg-slate-700"
                                            >
                                                <ExternalLink className="h-6 w-6 mr-2" />
                                                <p>Roadmap</p>
                                                <ChevronRight className="h-3 w-3 absolute right-10" />
                                            </a>
                                            <hr className="horizontal-gradient" />
                                            <button type="button" onClick={handleLogout} className="menu-button flex items-center mb-2 rounded p-2 hover:bg-slate-700 w-full">
                                                <LogOut className="h-6 w-6 mr-2" />
                                                <p>Sign Out</p>
                                                {
                                                    userType == UserType.AuthenticatedUser &&
                                                    <span className="font-normal ml-10">
                                                        <UserEmail email={email} />
                                                    </span>
                                                }
                                                <ChevronRight className="h-3 w-3 absolute right-10" />
                                            </button>
                                        </>
                                    }
                                </div>
                                <div className="flex flex-col px-2 py-3 text-primary-text w-11/12 font-light absolute bottom-5">
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