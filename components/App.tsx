import { FC, Fragment, useEffect, useRef, useState } from 'react'
import { Dialog, Menu, Transition } from "@headlessui/react";
import { ArrowLeftIcon, MenuIcon, XIcon } from '@heroicons/react/solid';
import Swap from './swapComponent';
import IntroCard from './introCard';
import { AuthProvider, useAuthState } from '../context/auth';

function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}

const App: FC = () => {

    return <>
        <AuthProvider>
            <div className={`bg-darkBlue shadow-card rounded-lg w-full overflow-hidden relative`}>
                <AppHeader />
                <div className="">
                    <Swap />
                </div>
            </div>
        </AuthProvider>
    </>
}
function TestComp() {
    console.log("Test compnent rerendered")
    return <></>
  }

function AppHeader() {
    const { email, authData } = useAuthState()

    return <>

        <div className="absolute w-full grid grid-cols-2 gap-4 place-content-end p-2" >
            <>
                <span></span>
                <span className="justify-self-end text-pink-primary-300 cursor-pointer">
                    <Menu as="div" className="relative inline-block text-left">
                        <div>
                            <Menu.Button className="inline-flex justify-center w-full rounded-md shadow-sm px-4 py-2 bg-darkblue-600  text-sm font-medium text-darkblue-200">
                                <MenuIcon className='h-8 w-8 text-darkblue-200 cursor-pointer' />
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
                                        email ? <div className='text-darkblue-200 block px-4 py-2 text-sm '>
                                            {email}
                                        </div>
                                            :
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <a
                                                        href="#"
                                                        className={classNames(
                                                            active ? 'bg-darkblue-300' : '',
                                                            'block px-4 py-2 text-sm text-pink-primary-300'
                                                        )}
                                                    >
                                                        <TestComp/>
                                                        Login
                                                    </a>
                                                )}
                                            </Menu.Item>
                                    }
                                    <Menu.Item>
                                        {({ active }) => (
                                            <a
                                                href="#"
                                                className={classNames(
                                                    active ? 'bg-darkblue-300' : '',
                                                    'block px-4 py-2 text-sm text-pink-primary-300'
                                                )}
                                            >
                                                Transactions
                                            </a>
                                        )}
                                    </Menu.Item>
                                    <Menu.Item>
                                        {({ active }) => (
                                            <a
                                                href="#"
                                                className={classNames(
                                                    active ? 'bg-darkblue-300' : '',
                                                    'block px-4 py-2 text-sm text-pink-primary-300'
                                                )}
                                            >
                                                Exchanges
                                            </a>
                                        )}
                                    </Menu.Item>
                                    {
                                        email &&
                                        <form method="POST" action="#">
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <button
                                                        type="submit"
                                                        className={classNames(
                                                            active ? 'bg-darkblue-300' : '',
                                                            'block w-full text-left px-4 py-2 text-sm text-pink-primary-300'
                                                        )}
                                                    >
                                                        Sign out
                                                    </button>
                                                )}
                                            </Menu.Item>
                                        </form>
                                    }

                                </div>
                            </Menu.Items>
                        </Transition>
                    </Menu>
                </span>

            </>
        </div>
    </>
}

export default App;