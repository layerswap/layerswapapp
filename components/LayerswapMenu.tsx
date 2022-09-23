import { Menu, Transition } from "@headlessui/react";
import { MenuIcon } from "@heroicons/react/outline";
import { useRouter } from "next/router";
import { Fragment, useCallback, useRef, useState } from "react";
import { useIntercom } from "react-use-intercom";
import { useAuthState } from "../context/authContext";
import { useMenuState } from "../context/menu";
import TokenService from "../lib/TokenService";
import SendFeedback from './sendFeedback'
import { classNames } from "./utils/classNames";
import SlideOver from "./SlideOver";

export default function () {
    const { email, authData } = useAuthState()
    const router = useRouter();
    const { menuVisible } = useMenuState()
    const { boot, show, update } = useIntercom()

    const updateWithProps = () => update({ email: email })

    const [feedbackDrawerIsOpen, setFeedbackDrawerIsOpen] = useState(false);
    const goToLink = (path: string, query: any) => {
        router.push({
            pathname: path,
            query: query
        })
    }

    const goToLogin = useCallback(() => goToLink("/auth", router.query), [router.query])
    const goToTransactions = useCallback(() => goToLink("/transactions", router.query), [router.query])
    const goToExchanges = useCallback(() => goToLink("/exchanges", router.query), [router.query])

    const handleLogout = useCallback(() => {
        TokenService.removeAuthData()
        router.push({
            pathname: "/",
            query: router.query
        }, '/signedout', { shallow: true })
    }, [router.query])

    return <>
        {
            authData?.access_token &&
            <SlideOver imperativeOpener={[feedbackDrawerIsOpen, setFeedbackDrawerIsOpen]} moreClassNames="pt-5">
                {(close)=> <SendFeedback onSend={()=> close()} />}
            </SlideOver>
        }
        <span className="text-primary-text cursor-pointer relative">
            {
                <Menu as="div" className={`relative inline-block text-left ${menuVisible ? 'visible' : 'invisible'}`}>
                    <div>
                        <Menu.Button className="inline-flex justify-center w-full rounded-md shadow-sm mt-2  text-sm font-medium">
                            <MenuIcon className='h-7 w-7 cursor-pointer' />
                        </Menu.Button>
                    </div>
                    <span className="relative z-30 py-1">
                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                        >
                            <Menu.Items className="font-bold text-sm text-left border border-darkblue-200 origin-top-right absolute -right-7 mt-2 min-w-56 rounded-md shadow-lg bg-darkblue ring-1 ring-black ring-opacity-5 focus:outline-none">
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
                                                        Swap history
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
                                                            Sign out
                                                        </button>
                                                    )}
                                                </Menu.Item>
                                            }

                                        </>
                                    }

                                </div>
                            </Menu.Items>
                        </Transition>
                    </span>
                </Menu>
            }
        </span>
    </>
}