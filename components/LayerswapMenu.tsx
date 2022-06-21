import { Menu, Transition } from "@headlessui/react";
import { MenuIcon } from "@heroicons/react/outline";
import { Fragment } from "react";
import { useAuthState } from "../context/auth";
import TokenService from "../lib/TokenService";


function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}

export default function () {
    const { email, authData } = useAuthState()

    const handleLogout = () => {
        TokenService.removeAuthData()
    }

    return <span className="justify-self-end text-light-blue cursor-pointer">
        <Menu as="div" className="relative inline-block text-left">
            <div>
                <Menu.Button className="inline-flex justify-center w-full rounded-md shadow-sm mt-2 hover:bg-darkblue-600 text-sm font-medium">
                    <MenuIcon className='h-7 w-7 text-white cursor-pointer' />
                </Menu.Button>
            </div>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="font-bold border border-ouline-blue origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-darkblue-600 ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                        {
                            authData?.access_token ? <div className='text-darkblue-200 block px-4 py-2 text-sm '>
                                {email}
                            </div>
                                :
                                <Menu.Item>
                                    {({ active }) => (
                                        <a
                                            href="/login"
                                            className={classNames(
                                                active ? 'bg-darkblue-300' : '',
                                                'block px-4 py-2 text-sm text-light-blue'
                                            )}
                                        >
                                            Login
                                        </a>
                                    )}
                                </Menu.Item>
                        }
                        <Menu.Item>
                            {({ active }) => (
                                <a
                                    href="/transactions"
                                    className={classNames(
                                        active ? 'bg-darkblue-300' : '',
                                        'block px-4 py-2 text-sm text-light-blue'
                                    )}
                                >
                                    Transactions
                                </a>
                            )}
                        </Menu.Item>
                        <Menu.Item>
                            {({ active }) => (
                                <a
                                    href="/exchanges"
                                    className={classNames(
                                        active ? 'bg-darkblue-300' : '',
                                        'block px-4 py-2 text-sm text-light-blue'
                                    )}
                                >
                                    Exchanges
                                </a>
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
                                            'block w-full text-left px-4 py-2 text-sm text-light-blue'
                                        )}
                                    >
                                        Sign out
                                    </button>
                                )}
                            </Menu.Item>
                        }
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    </span>
}