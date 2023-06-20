import { Menu } from "@headlessui/react";
import { BookOpen, ExternalLink, Gift, Link, MenuIcon } from "lucide-react";
import { Home, LogIn, LogOut, TableIcon, User } from "lucide-react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { useAuthDataUpdate, useAuthState, UserType } from "../../context/authContext";
import { useMenuState } from "../../context/menu";
import TokenService from "../../lib/TokenService";
import { AnimatePresence, motion } from "framer-motion";
import Item, { ItemType } from "./MenuItem";
import shortenAddress, { shortenEmail } from "../utils/ShortenAddress";
import IconButton from "../buttons/iconButton";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useIntercom } from "react-use-intercom";
import ChatIcon from "../icons/ChatIcon";
import WalletIcon from "../icons/WalletIcon";
import inIframe from "../utils/inIframe";

export default function () {
    const { email, userType, userId } = useAuthState()
    const { setUserType } = useAuthDataUpdate()
    const router = useRouter();
    const { menuVisible } = useMenuState()
    const { isConnected } = useAccount();
    const { boot, show, update } = useIntercom()
    const [embedded, setEmbedded] = useState<boolean>()

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
                            <AnimatePresence>
                                {open && <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{
                                        opacity: 1,
                                        transition: { duration: 0.4, ease: [0.36, 0.66, 0.04, 1] },
                                    }}
                                    exit={{
                                        opacity: 0,
                                        transition: { duration: 0.3, ease: [0.36, 0.66, 0.04, 1] },
                                    }}
                                    className="relative z-20 py-1">
                                    <Menu.Items
                                        className="font-bold text-sm text-left border border-secondary-500 origin-top-right absolute -right-7 mt-2 w-fit min-w-[150px] rounded-md shadow-lg bg-secondary-900 ring-1 ring-black ring-opacity-5 focus:outline-none">
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
                                                        <div className='font-light w-full text-left px-4 py-2 text-sm cursor-default flex items-center space-x-2'>
                                                            <User className="h-4 w-4" />
                                                            <span><UserEmail email={email} /></span>
                                                        </div>
                                                        <hr className="horizontal-gradient" />
                                                    </>
                                                    :
                                                    <>

                                                        {
                                                            router.pathname != '/' &&
                                                            <Menu.Item>
                                                                <Item type={ItemType.link} pathname={"/"} icon={<Home className='h-4 w-4' />}>
                                                                    Home
                                                                </Item>
                                                            </Menu.Item>
                                                        }

                                                        {
                                                            userType == UserType.GuestUser &&
                                                            <Menu.Item>
                                                                <Item type={ItemType.link} pathname={"/transactions"} icon={<TableIcon className='h-4 w-4' />}>
                                                                    Transfers
                                                                </Item>
                                                            </Menu.Item>
                                                        }
                                                        {!embedded && router.pathname != '/rewards' &&
                                                            <Menu.Item>
                                                                <Item type={ItemType.link} pathname={"/rewards"} icon={<Gift className='h-4 w-4' />}>
                                                                    Rewards
                                                                </Item>
                                                            </Menu.Item>
                                                        }
                                                        <Menu.Item>
                                                            <Item type={ItemType.button} onClick={() => {
                                                                boot();
                                                                show();
                                                                updateWithProps()
                                                            }} icon={<ChatIcon className='h-4 w-4' strokeWidth={2} />}>
                                                                Get Help
                                                            </Item>
                                                        </Menu.Item>
                                                        <hr className="horizontal-gradient" />
                                                        <Menu.Item>
                                                            <Item type={ItemType.link} pathname='https://docs.layerswap.io/' target="_blank" icon={<BookOpen className='h-4 w-4' />} className="plausible-event-name=User+Docs">
                                                                User Docs
                                                            </Item>
                                                        </Menu.Item>
                                                        {
                                                            !embedded &&
                                                            <Menu.Item>
                                                                <Item type={ItemType.link} pathname={"https://layerswap.frill.co/roadmap"} target='_blank' icon={<ExternalLink className='h-4 w-4' />}>
                                                                    Roadmap
                                                                </Item>
                                                            </Menu.Item>
                                                        }

                                                        <hr className="horizontal-gradient" />
                                                        <Menu.Item>
                                                            <Item type={ItemType.link} pathname='/auth' icon={<LogIn className='h-4 w-4' />}>
                                                                Login
                                                            </Item>
                                                        </Menu.Item>
                                                    </>
                                            }
                                            {
                                                userType == UserType.AuthenticatedUser &&
                                                <>
                                                    {
                                                        router.pathname != '/' &&
                                                        <Menu.Item>
                                                            <Item type={ItemType.link} pathname={"/"} icon={<Home className='h-4 w-4' />}>
                                                                Home
                                                            </Item>
                                                        </Menu.Item>
                                                    }
                                                    <Menu.Item>
                                                        <Item type={ItemType.link} pathname={"/transactions"} icon={<TableIcon className='h-4 w-4' />}>
                                                            Transfers
                                                        </Item>
                                                    </Menu.Item>
                                                    <Menu.Item>
                                                        <Item type={ItemType.link} pathname={"/exchanges"} icon={<Link className='h-4 w-4' />}>
                                                            Exchange Accounts
                                                        </Item>
                                                    </Menu.Item>
                                                    {!embedded && router.pathname != '/rewards' &&
                                                        <Menu.Item>
                                                            <Item type={ItemType.link} pathname={"/rewards"} icon={<Gift className='h-4 w-4' />}>
                                                                Rewards
                                                            </Item>
                                                        </Menu.Item>
                                                    }
                                                    <hr className="horizontal-gradient" />
                                                    <Menu.Item>
                                                        <Item type={ItemType.button} onClick={() => {
                                                            boot();
                                                            show();
                                                            updateWithProps()
                                                        }} icon={<ChatIcon className='h-4 w-4' strokeWidth={2} />}>
                                                            Get Help
                                                        </Item>
                                                    </Menu.Item>
                                                    <Menu.Item>
                                                        <Item type={ItemType.link} pathname='https://docs.layerswap.io/' target="_blank" icon={<BookOpen className='h-4 w-4' />} className="plausible-event-name=User+Docs">
                                                            User Docs
                                                        </Item>
                                                    </Menu.Item>
                                                    {
                                                        !embedded &&
                                                        <Menu.Item>
                                                            <Item type={ItemType.link} pathname={"https://layerswap.frill.co/roadmap"} target='_blank' icon={<ExternalLink className='h-4 w-4' />}>
                                                                Roadmap
                                                            </Item>
                                                        </Menu.Item>
                                                    }
                                                    <hr className="horizontal-gradient" />
                                                    <Menu.Item>
                                                        <Item type={ItemType.button} onClick={handleLogout} icon={<LogOut className='h-4 w-4' />}>
                                                            Sign Out
                                                        </Item>
                                                    </Menu.Item>
                                                </>
                                            }
                                        </div>
                                    </Menu.Items>
                                </motion.span>}
                            </AnimatePresence>
                        </>
                    )}
                </Menu>
            }
        </span>
    </>
}

const WalletAddress = () => {
    return <ConnectButton.Custom>
        {({ account, mounted, chain, openAccountModal }) => {
            if (mounted && account && chain)
                return <button type="button" onClick={openAccountModal} className='font-light w-full text-left px-4 py-2 text-sm cursor-default flex items-center space-x-2'>
                    <WalletIcon className="h-4 w-4" />
                    <span>{shortenAddress(account.address)}</span>
                </button>
            else
                return <></>
        }}
    </ConnectButton.Custom>
}