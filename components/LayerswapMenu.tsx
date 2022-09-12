import { Menu, Transition } from "@headlessui/react";
import { MenuIcon } from "@heroicons/react/outline";
import { useRouter } from "next/router";
import { Fragment, useCallback, useRef, useState } from "react";
import { useIntercom } from "react-use-intercom";
import { useAuthState } from "../context/authContext";
import { useMenuState } from "../context/menu";
import TokenService from "../lib/TokenService";
import MenuComponent from "./MenuComponent";
import SendFeedback from './sendFeedback'
import SlideOver, { SildeOverRef } from "./SlideOver";
import { classNames } from "./utils/classNames";

export default function () {
    const { email, authData } = useAuthState()
    const router = useRouter();
    const { menuVisible } = useMenuState()
    const { boot, show, update } = useIntercom()

    const updateWithProps = () => update({ email: email })

    const slideoverRef = useRef<SildeOverRef>()

    const handleOpenSendFeedback = useCallback(() => {
        slideoverRef.current.open()
    }, [slideoverRef])

    const handleFeedbackSent = useCallback(() => {
        slideoverRef.current.close()
    }, [slideoverRef])

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
            <SlideOver ref={slideoverRef} moreClassNames="pt-5">
                <SendFeedback onSend={handleFeedbackSent} />
            </SlideOver>
        }
        <span className=" text-pink-primary-300 cursor-pointer relative ">
            {
                <MenuComponent menuVisible={menuVisible}>
                    {
                        authData?.access_token ? <div className='font-light block w-full text-left px-4 py-2 text-sm text-pink-primary-300'>
                            {email}
                        </div>
                            :
                            <Menu.Item>
                                {({ active }) => (
                                    <a onClick={goToLogin}
                                        className={classNames(
                                            active ? 'bg-darkblue-300' : '',
                                            'block px-4 py-2 text-sm text-pink-primary-300 whitespace-nowrap'
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
                                            'block px-4 py-2 text-sm text-pink-primary-300 hover:bg-darkblue-300 whitespace-nowrap'
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
                                            'block px-4 py-2 text-sm text-pink-primary-300 hover:bg-darkblue-300 whitespace-nowrap'
                                        )}
                                    >
                                        Exchange Accounts
                                    </a>
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

                </MenuComponent>
            }
        </span>
    </>
}