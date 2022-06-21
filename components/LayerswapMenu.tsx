import { Menu, Transition } from "@headlessui/react";
import { MenuIcon } from "@heroicons/react/outline";
import Link from "next/link";
import { useRouter } from "next/router";
import { Fragment } from "react";
import { useAuthState } from "../context/auth";
import { useMenuState } from "../context/menu";
import TokenService from "../lib/TokenService";


function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}

export default function () {
    const { email, authData } = useAuthState()
    const router = useRouter();
    const { menuVisible } = useMenuState()
    const handleLogout = () => {
        TokenService.removeAuthData()
        router.push('/login')
    }

    return <span className="justify-self-end text-light-blue cursor-pointer">
        {
            <Menu as="div" className={`relative inline-block text-left ${menuVisible ? 'visible' : 'invisible'}`}>
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
                    <Menu.Items className="font-bold border border-ouline-blue origin-top-right absolute right-0 mt-2 min-w-56 rounded-md shadow-lg bg-darkblue-600 ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="py-1">
                            {
                                authData?.access_token ? <div className='font-light block w-full text-left px-4 py-2 text-sm text-light-blue'>
                                    {email}
                                </div>
                                    :
                                    <Menu.Item>
                                        {({ active }) => (
                                            <Link key="login" href="/login">
                                                <a
                                                    className={classNames(
                                                        active ? 'bg-darkblue-300' : '',
                                                        'block px-4 py-2 text-sm text-light-blue'
                                                    )}
                                                >
                                                    Login
                                                </a>
                                            </Link>
                                        )}
                                    </Menu.Item>
                            }
                            <Menu.Item>
                                {({ active }) => (
                                    <Link key="transactions" href="/transactions">
                                        <a
                                            className={classNames(
                                                active ? 'bg-darkblue-300' : '',
                                                'block px-4 py-2 text-sm text-light-blue hover:bg-darkblue-300'
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
                                                'block px-4 py-2 text-sm text-light-blue hover:bg-darkblue-300'
                                            )}
                                        >
                                            CEX Acocunts
                                        </a>
                                    </Link>
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
                                                'font-bold block w-full text-left px-4 py-2 text-sm text-light-blue'
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
        }

    </span>
}