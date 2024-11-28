import { BookOpen, MenuIcon, Map, Home, LibraryIcon, Shield, ScrollText } from "lucide-react";
import { useRouter } from "next/router";
import { useState } from "react";
import { useIntercom } from "react-use-intercom";
import ChatIcon from "../icons/ChatIcon";
import Modal from "../../components/modal/modal";
import DiscordLogo from "./../icons/DiscordLogo";
import GitHubLogo from "./../icons/GitHubLogo";
import SubstackLogo from "./../icons/SubstackLogo";
import TwitterLogo from "./../icons/TwitterLogo";
import Link from "next/link";
import IconButton from "../buttons/iconButton";
import YoutubeLogo from "../icons/YoutubeLogo";
import Menu from "./Menu";
import dynamic from "next/dynamic";

const WalletsMenu = dynamic(() => import("../ConnectedWallets").then((comp) => comp.WalletsMenu), {
    loading: () => <></>
})

export default function LayerswapMenu() {
    const router = useRouter();
    const { boot, show, update } = useIntercom()
    const [openTopModal, setOpenTopModal] = useState(false);

    const updateWithProps = () => update()

    const navigation = {
        social: [
            {
                name: 'Twitter',
                href: 'https://twitter.com/layerswap/',
                icon: (props) => TwitterLogo(props),
                className: 'plausible-event-name=Twitter'
            },
            {
                name: 'GitHub',
                href: 'https://github.com/layerswap/layerswapapp/',
                icon: (props) => GitHubLogo(props),
                className: 'plausible-event-name=GitHub'
            },
            {
                name: 'Discord',
                href: 'https://discord.gg/layerswap',
                icon: (props) => DiscordLogo(props),
                className: 'plausible-event-name=Discord'
            },
            {
                name: 'YouTube',
                href: 'https://www.youtube.com/@layerswaphq/',
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
                    <Modal show={openTopModal} setShow={setOpenTopModal} header={<h2>Menu</h2>} modalId="topModel">
                        <div className="text-sm font-medium focus:outline-none h-full">
                            <Menu>

                                <WalletsMenu />

                                <Menu.Group>
                                    <>
                                        {
                                            router.pathname != '/committments' &&
                                            <Menu.Item pathname='/committments/' icon={<ScrollText className="h-5 w-5" />} >
                                                History
                                            </Menu.Item>
                                        }
                                    </>
                                    <>
                                        {
                                            router.pathname != '/' &&
                                            <Menu.Item pathname='/' icon={<Home className="h-5 w-5" />} >
                                                Home
                                            </Menu.Item>
                                        }
                                    </>
                                </Menu.Group>
                                <Menu.Group>
                                    <Menu.Item onClick={() => {
                                        boot();
                                        show();
                                        updateWithProps();
                                    }} target="_blank" icon={<ChatIcon strokeWidth={2} className="h-5 w-5" />} >
                                        Help
                                    </Menu.Item>
                                    <Menu.Item pathname='https://v8-docs.layerswap.io/protocol/introduction' target="_blank" icon={<BookOpen className="h-5 w-5" />} >
                                        Protocol Docs
                                    </Menu.Item>
                                </Menu.Group>

                                <Menu.Group>
                                    <Menu.Item pathname='https://docs.layerswap.io/user-docs/information/privacy-policy/' target="_blank" icon={<Shield className="h-5 w-5" />} >
                                        Privacy Policy
                                    </Menu.Item>
                                    <Menu.Item pathname='https://docs.layerswap.io/user-docs/information/terms-of-services/' target="_blank" icon={<LibraryIcon className="h-5 w-5" />} >
                                        Terms of Service
                                    </Menu.Item>
                                </Menu.Group>

                                <div className="space-y-3 w-full">
                                    <hr className="border-secondary-500" />
                                    <p className="text-primary-text-muted flex justify-center my-3">Media links & suggestions:</p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 justify-center">
                                    {navigation.social.map((item, index) => (
                                        <Link key={index} target="_blank" href={item.href} className={`flex relative bg-secondary-700 hover:bg-secondary-600 rounded-componentRoundness cursor-pointer select-none items-center outline-none text-primary-text ${item.className}`}>
                                            <div className="p-2 w-full flex justify-center gap-1">
                                                <item.icon className="h-5 w-5" aria-hidden="true" />
                                                <p>{item.name}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </Menu>
                        </div>
                    </Modal>
                </>
            }
        </span >
    </>
}