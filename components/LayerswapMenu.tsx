import { Menu } from "@headlessui/react";
import { MenuIcon } from "@heroicons/react/outline";
import { useRouter } from "next/router";
import { useCallback, useState } from "react";
import { useIntercom } from "react-use-intercom";
import { useAuthState } from "../context/authContext";
import { useMenuState } from "../context/menu";
import TokenService from "../lib/TokenService";
import SendFeedback from './sendFeedback'
import { classNames } from "./utils/classNames";
import SlideOver from "./SlideOver";
import { AnimatePresence, motion } from "framer-motion";

export default function () {
    const { email, authData } = useAuthState()
    const router = useRouter();
    const { menuVisible } = useMenuState()
    const { boot, show, update } = useIntercom()

    const updateWithProps = () => update({ email: email })

    const [feedbackDrawerIsOpen, setFeedbackDrawerIsOpen] = useState(false);
    const goToLink = (path: string, query: any) => {
        router.push({
            pathname: path
        })
    }

    const goToLogin = useCallback(() => goToLink("/auth", router.query), [router.query])
    const goToTransactions = useCallback(() => goToLink("/transactions", router.query), [router.query])
    const goToExchanges = useCallback(() => goToLink("/exchanges", router.query), [router.query])

    const handleLogout = useCallback(() => {
        TokenService.removeAuthData()
        router.push({
            pathname: "/"
        }, '/signedout', { shallow: true })
    }, [router.query])

    return <>
        {
            authData?.access_token &&
            <SlideOver imperativeOpener={[feedbackDrawerIsOpen, setFeedbackDrawerIsOpen]} place='inMenu'>
                {(close) => <SendFeedback onSend={() => close()} />}
            </SlideOver>
        }
        <span className="text-primary-text cursor-pointer relative">
            {
                <Menu as="div" className={`relative inline-block text-left ${menuVisible ? 'visible' : 'invisible'}`}>
                    {({ open }) => (
                        <>
                            <div>
                                <Menu.Button className="inline-flex justify-center w-full rounded-md shadow-sm mt-2  text-sm font-medium">
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
                                        className="font-bold text-sm text-left border border-darkblue-200 origin-top-right absolute -right-7 mt-2 min-w-56 rounded-md shadow-lg bg-darkblue ring-1 ring-black ring-opacity-5 focus:outline-none">
                                        <div className="relative z-30 py-1">
                                            {
                                                authData?.access_token ? <div className='font-light block w-full text-left px-4 py-2 text-sm'>
                                                    {email}
                                                </div>
                                                    :
                                                    <Menu.Item>
                                                        {({ active }) => (
                                                            <a onClick={goToLogin}
                                                                className={classNames(
                                                                    active ? 'bg-darkblue-300' : '',
                                                                    'block px-4 text-left py-2 whitespace-nowrap'
                                                                )}
                                                            >
                                                                Login
                                                            </a>
                                                        )}
                                                    </Menu.Item>
                                            }
                                            {
                                                authData?.access_token &&
                                                <>
                                                    <Menu.Item>
                                                        {({ active }) => (
                                                            <a
                                                                onClick={goToTransactions}
                                                                className={classNames(
                                                                    active ? 'bg-darkblue-300' : '',
                                                                    'block px-4 py-2 text-left hover:bg-darkblue-300 whitespace-nowrap'
                                                                )}
                                                            >
                                                                Swap History
                                                            </a>
                                                        )}
                                                    </Menu.Item>
                                                    <Menu.Item>
                                                        {({ active }) => (
                                                            <a
                                                                onClick={goToExchanges}
                                                                className={classNames(
                                                                    active ? 'bg-darkblue-300' : '',
                                                                    'block px-4 py-2 text-left hover:bg-darkblue-300 whitespace-nowrap'
                                                                )}
                                                            >
                                                                Exchange Accounts
                                                            </a>
                                                        )}
                                                    </Menu.Item>
                                                    <Menu.Item>
                                                        {({ active }) => (
                                                            <button
                                                                onClick={() => setFeedbackDrawerIsOpen(true)}
                                                                type="button"
                                                                className={classNames(
                                                                    active ? 'bg-darkblue-300' : '',
                                                                    'block w-full text-left px-4 py-2 whitespace-nowrap'
                                                                )}
                                                            >
                                                                Send Feedback
                                                            </button>
                                                        )}
                                                    </Menu.Item>
                                                    <Menu.Item>
                                                        {({ active }) => (
                                                            <button
                                                                onClick={() => {
                                                                    boot();
                                                                    show();
                                                                    updateWithProps()
                                                                }}
                                                                type="button"
                                                                className={classNames(
                                                                    active ? 'bg-darkblue-300' : '',
                                                                    'block w-full text-left px-4 py-2  whitespace-nowrap'
                                                                )}
                                                            >
                                                                Get Help
                                                            </button>
                                                        )}
                                                    </Menu.Item>
                                                    {
                                                        email &&
                                                        <Menu.Item>
                                                            {({ active }) => (
                                                                <button
                                                                    type="button"
                                                                    onClick={handleLogout}
                                                                    className={classNames(
                                                                        active ? 'bg-darkblue-300' : '',
                                                                        'block w-full text-left px-4 py-2 whitespace-nowrap'
                                                                    )}
                                                                >
                                                                    Sign Out
                                                                </button>
                                                            )}
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