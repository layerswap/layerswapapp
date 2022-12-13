import { Menu } from "@headlessui/react";
import { MenuIcon } from "@heroicons/react/outline";
import { HomeIcon, LightBulbIcon, LinkIcon, LoginIcon, LogoutIcon, PaperAirplaneIcon, SupportIcon, TableIcon, UserIcon } from "@heroicons/react/solid";
import { useRouter } from "next/router";
import { forwardRef, useCallback, useState } from "react";
import { useIntercom } from "react-use-intercom";
import { useAuthState } from "../../context/authContext";
import { useMenuState } from "../../context/menu";
import TokenService from "../../lib/TokenService";
import SendFeedback from '../sendFeedback'
import SlideOver from "../SlideOver";
import { AnimatePresence, motion } from "framer-motion";
import Item, { ItemType } from "./MenuItem";

export default function () {
    const { email, authData, userId } = useAuthState()
    const router = useRouter();
    const { menuVisible } = useMenuState()
    const { boot, show, update } = useIntercom()
    const updateWithProps = () => update({ email: email, userId: userId })

    const [feedbackDrawerIsOpen, setFeedbackDrawerIsOpen] = useState(false);

    const handleLogout = useCallback(() => {
        TokenService.removeAuthData()
        router.push({
            pathname: "/"
        }, '/signedout', { shallow: true })
    }, [router.query])

    return <>
        {
            authData?.access_token &&
            <SlideOver imperativeOpener={[feedbackDrawerIsOpen, setFeedbackDrawerIsOpen]} place='inMenu' header="Send Feedback">
                {(close) => <SendFeedback onSend={() => close()} />}
            </SlideOver>
        }
        <span className="text-primary-text cursor-pointer relative">
            {
                <Menu as="div" className={`relative inline-block text-left ${menuVisible ? 'visible' : 'invisible'}`}>
                    {({ open }) => (
                        <>
                            <div className="relative top-1">
                                <Menu.Button className="w-full rounded-md shadow-sm text-sm font-medium">
                                    <MenuIcon className='h-7 w-7 cursor-pointer' />
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
                                    className="relative z-10 py-1">
                                    <Menu.Items
                                        className="font-bold text-sm text-left border border-darkblue-200 origin-top-right absolute -right-7 mt-2 w-56 rounded-md shadow-lg bg-darkblue ring-1 ring-black ring-opacity-5 focus:outline-none">
                                        <div className="relative z-30 py-1">
                                            {
                                                authData?.access_token ?
                                                    <>
                                                        <div className='font-light w-full text-left px-4 py-2 text-sm cursor-default flex items-center space-x-2'>
                                                            <UserIcon className="h-4 w-4" />
                                                            <span>{email}</span>
                                                        </div>
                                                        <hr className="horizontal-gradient" />
                                                    </>
                                                    :
                                                    <>
                                                        <Menu.Item>
                                                            <Item type={ItemType.link} pathname={"/"} icon={<HomeIcon className='h-4 w-4 text-primary' />}>
                                                                Home
                                                            </Item>
                                                        </Menu.Item>
                                                        <Menu.Item>
                                                            <Item type={ItemType.link} pathname='/auth' icon={<LoginIcon className='h-4 w-4' />}>
                                                                Login
                                                            </Item>
                                                        </Menu.Item>
                                                        <Menu.Item>
                                                            <Item type={ItemType.button} icon={<LightBulbIcon className='h-4 w-4' />}
                                                                onClick={() => {
                                                                    boot();
                                                                    show();
                                                                    updateWithProps()
                                                                }} >
                                                                Get Help
                                                            </Item>
                                                        </Menu.Item>
                                                    </>
                                            }
                                            {
                                                authData?.access_token &&
                                                <>
                                                    <Menu.Item>
                                                        <Item type={ItemType.link} pathname={"/"} icon={<HomeIcon className='h-4 w-4' />}>
                                                            Home
                                                        </Item>
                                                    </Menu.Item>
                                                    <Menu.Item>
                                                        <Item type={ItemType.link} pathname={"/transactions"} icon={<TableIcon className='h-4 w-4' />}>
                                                            Swap History
                                                        </Item>
                                                    </Menu.Item>
                                                    <Menu.Item>
                                                        <Item type={ItemType.link} pathname={"/exchanges"} icon={<LinkIcon className='h-4 w-4' />}>
                                                            Exchange Accounts
                                                        </Item>
                                                    </Menu.Item>
                                                    <hr className="horizontal-gradient" />
                                                    <Menu.Item>
                                                        <Item type={ItemType.button} onClick={() => setFeedbackDrawerIsOpen(true)} icon={<PaperAirplaneIcon className='h-4 w-4' />}>
                                                            Send Feedback
                                                        </Item>
                                                    </Menu.Item>
                                                    <Menu.Item>
                                                        <Item type={ItemType.button} icon={<LightBulbIcon className='h-4 w-4' />}
                                                            onClick={() => {
                                                                boot();
                                                                show();
                                                                updateWithProps()
                                                            }} >
                                                            Get Help
                                                        </Item>
                                                    </Menu.Item>
                                                    <hr className="horizontal-gradient" />
                                                    {
                                                        email &&
                                                        <Menu.Item>
                                                            <Item type={ItemType.button} onClick={handleLogout} icon={<LogoutIcon className='h-4 w-4' />}>
                                                                Sign Out
                                                            </Item>
                                                        </Menu.Item>
                                                    }

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