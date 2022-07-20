import { Menu, Transition } from "@headlessui/react";
import { MenuIcon } from "@heroicons/react/outline";
import Link from "next/link";
import { useRouter } from "next/router";
import { Fragment, useCallback, useRef, useState } from "react";
import { useIntercom } from "react-use-intercom";
import { useAuthState } from "../context/auth";
import { useMenuState } from "../context/menu";
import TokenService from "../lib/TokenService";
import SendFeedback from './sendFeedback'
import SlideOver, { SildeOverRef } from "./SlideOver";


function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}

export default function () {
    const { email, authData } = useAuthState()
    const router = useRouter();
    const { menuVisible } = useMenuState()
    const { boot, show, update } = useIntercom()
    const updateWithProps = () => update({ email: email })
    const handleLogout = () => {
        TokenService.removeAuthData()
        router.push('/', '/signedout', { shallow: true })
    }
    const slideoverRef = useRef<SildeOverRef>()

    const handleOpenSendFeedback = useCallback(() => {
        slideoverRef.current.open()
    }, [slideoverRef])

    const handleFeedbackSent = useCallback(() => {
        slideoverRef.current.close()
    }, [slideoverRef])

    return <>
        {
            authData?.access_token &&
            <SlideOver ref={slideoverRef} moreClassNames="pt-5">
                <SendFeedback onSend={handleFeedbackSent} />
            </SlideOver>
        }
        <span className=" text-pink-primary-300 cursor-pointer relative ">
            {
                <Menu as="div" className={`relative inline-block text-left ${menuVisible ? 'visible' : 'invisible'}`}>
                    <div>
                        <Menu.Button className="inline-flex justify-center w-full rounded-md shadow-sm mt-2  text-sm font-medium">
                            <MenuIcon className='h-7 w-7 text-pink-primary-300 cursor-pointer' />
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
                            <Menu.Items className=" font-bold border border-darkblue-200 origin-top-right absolute right-0 mt-2 min-w-56 rounded-md shadow-lg bg-darkBlue ring-1 ring-black ring-opacity-5 focus:outline-none">
                                <div className="relative z-30 py-1">
                                    {
                                        authData?.access_token ? <div className='font-light block w-full text-left px-4 py-2 text-sm text-pink-primary-300'>
                                            {email}
                                        </div>
                                            :
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <Link key="login" href="/login">
                                                        <a
                                                            className={classNames(
                                                                active ? 'bg-darkblue-300' : '',
                                                                'block px-4 py-2 text-sm text-pink-primary-300 whitespace-nowrap'
                                                            )}
                                                        >
                                                            Login
                                                        </a>
                                                    </Link>
                                                )}
                                            </Menu.Item>
                                    }
                                    {
                                        authData?.access_token &&
                                        <>
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <Link key="transactions" href="/transactions">
                                                        <a
                                                            className={classNames(
                                                                active ? 'bg-darkblue-300' : '',
                                                                'block px-4 py-2 text-sm text-pink-primary-300 hover:bg-darkblue-300 whitespace-nowrap'
                                                            )}
                                                        >
                                                            Swap history
                                                        </a>
                                                    </Link>
                                                )}
                                            </Menu.Item>
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <Link key="exchanges" href="/exchanges">
                                                        <a
                                                            href="/exchanges"
                                                            className={classNames(
                                                                active ? 'bg-darkblue-300' : '',
                                                                'block px-4 py-2 text-sm text-pink-primary-300 hover:bg-darkblue-300 whitespace-nowrap'
                                                            )}
                                                        >
                                                            Exchange Accounts
                                                        </a>
                                                    </Link>
                                                )}
                                            </Menu.Item>
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <button
                                                        onClick={handleOpenSendFeedback}
                                                        type="button"
                                                        className={classNames(
                                                            active ? 'bg-darkblue-300' : '',
                                                            'font-bold block w-full text-left px-4 py-2 text-sm text-pink-primary-300 whitespace-nowrap'
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
                                                            'font-bold block w-full text-left px-4 py-2 text-sm text-pink-primary-300 whitespace-nowrap'
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
                                                                'font-bold block w-full text-left px-4 py-2 text-sm text-pink-primary-300 whitespace-nowrap'
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