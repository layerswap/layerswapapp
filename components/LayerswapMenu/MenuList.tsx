import { BookOpen, Gift, Map, Home, ScrollText, LibraryIcon, Shield, Users, MessageSquarePlus } from "lucide-react";
import { useRouter } from "next/router";
import { FC, useState } from "react";
import { useIntercom } from "react-use-intercom";
import ChatIcon from "../icons/ChatIcon";
import DiscordLogo from "../icons/DiscordLogo";
import GitHubLogo from "../icons/GitHubLogo";
import SubstackLogo from "../icons/SubstackLogo";
import TwitterLogo from "../icons/TwitterLogo";
import Link from "next/link";
import SendFeedback from "../sendFeedback";
import YoutubeLogo from "../icons/YoutubeLogo";
import Menu from "./Menu";
import dynamic from "next/dynamic";
import { MenuStep } from "../../Models/Wizard";
import VaulDrawer from "../modal/vaulModal";
import { useSettingsState } from "@/context/settings";

const WalletsMenu = dynamic(() => import("../Wallet/ConnectedWallets").then((comp) => comp.WalletsMenu), {
    loading: () => <></>
})

const MenuList: FC<{ goToStep: (step: MenuStep, path: string) => void }> = ({ goToStep }) => {
    const router = useRouter();
    const { boot, show, update } = useIntercom()
    const [openFeedbackModal, setOpenFeedbackModal] = useState(false);
    const { isEmbedded } = useSettingsState()

    const handleCloseFeedback = () => {
        setOpenFeedbackModal(false)
    }

    return <div className="text-sm font-medium focus:outline-hidden h-full">
        <Menu>

            <WalletsMenu />

            <Menu.Group>
                <>
                    {
                        router.pathname != '/' &&
                        <Menu.Item pathname='/' icon={<Home className="h-5 w-5" />} >
                            Home
                        </Menu.Item>
                    }
                </>
                <>
                    {router.pathname != '/transactions' &&
                        <Menu.Item onClick={() => goToStep(MenuStep.Transactions, "/transactions")} icon={<ScrollText className="h-5 w-5" />} >
                            Transactions
                        </Menu.Item>
                    }
                </>
                <>
                    {!isEmbedded && router.pathname != '/campaigns' &&
                        <Menu.Item pathname='/campaigns' icon={<Gift className="h-5 w-5" />} >
                            Campaigns
                        </Menu.Item>
                    }
                </>
            </Menu.Group>
            <Menu.Group>
                <Menu.Item onClick={() => {
                    boot();
                    show();
                    update();
                }} target="_blank" icon={<ChatIcon strokeWidth={2} className="h-5 w-5" />} >
                    Help
                </Menu.Item>
                <Menu.Item pathname='https://learn.layerswap.io/' target="_blank" icon={<BookOpen className="h-5 w-5" />} >
                    Docs for Users
                </Menu.Item>
                <Menu.Item pathname='https://learn.layerswap.io/user-docs/partners-and-integrations/' target="_blank" icon={<Users className="h-5 w-5" />} >
                    Docs for Partners
                </Menu.Item>
            </Menu.Group>

            <Menu.Group>
                <Menu.Item pathname='https://learn.layerswap.io/user-docs/more-information/privacy-policy/' target="_blank" icon={<Shield className="h-5 w-5" />} >
                    Privacy Policy
                </Menu.Item>
                <Menu.Item pathname='https://learn.layerswap.io/user-docs/more-information/terms-of-services/' target="_blank" icon={<LibraryIcon className="h-5 w-5" />} >
                    Terms of Service
                </Menu.Item>
            </Menu.Group>

            <Menu.Group>
                <Menu.Item onClick={() => setOpenFeedbackModal(true)} target="_blank" icon={<MessageSquarePlus className="h-5 w-5" />} >
                    Suggest a Feature
                </Menu.Item>
                <VaulDrawer
                    show={openFeedbackModal}
                    header="Suggest a Feature"
                    setShow={setOpenFeedbackModal}
                    modalId="suggestFeature"
                >
                    <VaulDrawer.Snap id="item-1">
                        <div className="p-0 md:max-w-md">
                            <SendFeedback onSend={handleCloseFeedback} />
                        </div>
                    </VaulDrawer.Snap>
                </VaulDrawer>
            </Menu.Group>

            <div className="space-y-3 w-full">
                <hr className="border-secondary-500" />
                <p className="text-primary-text-tertiary flex justify-center my-3">Media links & suggestions:</p>
            </div>

            <div className="grid grid-cols-2 gap-2 justify-center">
                {navigation.social.map((item, index) => (
                    <Link key={index} target="_blank" href={item.href} className={`flex relative bg-secondary-500 hover:bg-secondary-400 rounded-xl cursor-pointer select-none items-center outline-hidden text-primary-text`}>
                        <div className="p-2 w-full flex justify-center gap-1">
                            <item.icon className="h-5 w-5" aria-hidden="true" />
                            <p>{item.name}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </Menu>
    </div>
}

const navigation = {
    social: [
        {
            name: 'Twitter',
            href: 'https://twitter.com/layerswap/',
            icon: (props) => TwitterLogo(props)
        },
        {
            name: 'GitHub',
            href: 'https://github.com/layerswap/layerswapapp/',
            icon: (props) => GitHubLogo(props)
        },
        {
            name: 'Discord',
            href: 'https://discord.com/invite/KhwYN35sHy/',
            icon: (props) => DiscordLogo(props)
        },
        {
            name: 'YouTube',
            href: 'https://www.youtube.com/@layerswaphq/',
            icon: (props) => YoutubeLogo(props)
        },
        {
            name: 'Substack',
            href: 'https://layerswap.substack.com/',
            icon: (props) => SubstackLogo(props)
        },
        {
            name: 'Roadmap',
            href: 'https://layerswap.ducalis.io/roadmap/summary/',
            icon: (props) => <Map {...props}></Map>
        }
    ]
}

export default MenuList