import { BookOpen, Gift, MenuIcon, ChevronRight, Map, Home, LogIn, LogOut, ScrollText, LibraryIcon, Shield, Users, MessageSquarePlus, Mail, User } from "lucide-react";
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
import Link from "next/link";
import { MenuRainbowKitConnectWallet } from "../HeaderWithMenu/ConnectedWallets";
import Popover from "../modal/popover";
import SendFeedback from "../sendFeedback";
import IconButton from "../buttons/iconButton";
import YoutubeLogo from "../icons/YoutubeLogo";
import { shortenEmail } from '../utils/ShortenAddress';
import { resolvePersistantQueryParams } from "../../helpers/querryHelper";
import Menu from "./Menu";


export default function LayerswapMenu() {
    const { email, userType, userId } = useAuthState()
    const { setUserType } = useAuthDataUpdate()
    const router = useRouter();
    const { isConnected } = useAccount();
    const { boot, show, update } = useIntercom()
    const [embedded, setEmbedded] = useState<boolean>()
    const [openTopModal, setOpenTopModal] = useState(false);
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
                    <Modal show={openTopModal} setShow={setOpenTopModal} header={<h2 className="font-normal leading-none tracking-tight">Menu</h2>}>
                        <div className="text-sm font-medium focus:outline-none h-full">
                            <Menu>
                                <div className="flex">
                                    {isConnected ? (
                                        <MenuRainbowKitConnectWallet />
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => openConnectModal()}
                                            className='w-full relative items-center gap-2 flex px-4 rounded-md outline-none bg-secondary-700 hover:bg-secondary-600 text-primary-text h-16'
                                        >
                                            <div className="bg-secondary-500 p-3 rounded-full">
                                                <WalletIcon className="h-6 w-6" strokeWidth={2} />
                                            </div>
                                            <p className="text-base font-semibold">Wallet</p>
                                            <ChevronRight className="h-4 w-4 absolute right-3" />
                                        </button>
                                    )}

                                </div>

                                <Menu.Group>
                                    {
                                        router.pathname != '/' &&
                                        <Menu.Item pathname='/' icon={<Home className="h-5 w-5" />} >
                                            Home
                                        </Menu.Item>
                                    }
                                    {
                                        router.pathname != '/transactions' &&
                                        <Menu.Item pathname='/transactions' icon={<ScrollText className="h-5 w-5" />} >
                                            Transfers
                                        </Menu.Item>
                                    }
                                    {!embedded && router.pathname != '/campaigns' &&
                                        <Menu.Item pathname='/campaigns' icon={<Gift className="h-5 w-5" />} >
                                            Campaigns
                                        </Menu.Item>
                                    }
                                </Menu.Group>

                                <Menu.Group>

                                    <Menu.Item onClick={() => {
                                        boot();
                                        show();
                                        updateWithProps();
                                    }} target="_blank" icon={<ChatIcon strokeWidth={2} className="h-5 w-5" />} >
                                        Help
                                    </Menu.Item>

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

                                <div className="space-y-3 w-full">
                                    <hr className="border-secondary-500" />
                                    <p className="text-primary-text-muted flex justify-center my-3">Media links & suggestions:</p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 justify-center">
                                    {navigation.social.map((item, index) => (
                                        <Link key={index} target="_blank" href={item.href} className={`flex relative bg-secondary-700 hover:bg-secondary-600 rounded-md cursor-pointer select-none items-center outline-none text-primary-text ${item.className}`}>
                                            <div className="p-2 w-full flex justify-center gap-1">
                                                <item.icon className="h-5 w-5" aria-hidden="true" />
                                                <p>{item.name}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                                {
                                    router.pathname != '/auth' &&
                                    <Menu.Footer>
                                        {
                                            userType == UserType.AuthenticatedUser &&
                                            <div className="font-normal flex gap-2 items-center mb-1">
                                                <User className="h-5 w-5" />
                                                <UserEmail email={email} />
                                            </div>
                                        }
                                        <Menu.Group>
                                            {
                                                userType == UserType.AuthenticatedUser ?
                                                    <div>
                                                        <Menu.Item
                                                            onClick={handleLogout}
                                                            icon={<LogOut className="h-5 w-5" />}
                                                        >
                                                            Sign Out
                                                        </Menu.Item>
                                                    </div>
                                                    :
                                                    <Menu.Item pathname='/auth' icon={<LogIn className="h-5 w-5" />} >
                                                        Login
                                                    </Menu.Item>
                                            }
                                        </Menu.Group>
                                    </Menu.Footer>
                                }

                            </Menu>
                        </div>

                    </Modal>

                </>
            }
        </span >
    </>
}