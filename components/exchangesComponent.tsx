import { useRouter } from "next/router"
import { Fragment, useCallback, useEffect, useState } from "react"
import LayerSwapApiClient, { Swap } from "../lib/layerSwapApiClient"
import TokenService from "../lib/TokenService"
import SpinIcon from "./icons/spinIcon"
import { CheckIcon, ClockIcon } from '@heroicons/react/solid';
import { ChevronRightIcon, ExclamationCircleIcon, ExternalLinkIcon, RefreshIcon, SearchIcon } from '@heroicons/react/outline';
import { ScissorsIcon, LinkIcon } from '@heroicons/react/solid';
import { SwapStatus } from "../Models/SwapStatus"
import { Combobox, Dialog, Transition } from "@headlessui/react"
import SwapDetails from "./swapDetailsComponent"
import { useSettingsState } from "../context/settings"
import { BransferApiClient, UserExchangesResponse } from "../lib/bransferApiClients"
import Image from 'next/image'
import { Exchange } from "../Models/Exchange"
import ConnectOauthExchange from "./connectOauthExchange"
import ConnectApiKeyExchange from "./connectApiKeyExchange"
import LayerswapMenu from "./LayerswapMenu"
import Link from "next/link"
import LayerSwapLogo from "./icons/layerSwapLogo"

function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}

interface UserExchange extends Exchange {
    is_connected: boolean
}

function UserExchanges() {

    const { exchanges } = useSettingsState()
    const [userExchanges, setUserExchanges] = useState<UserExchange[]>()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(false)
    const router = useRouter();
    const [query, setQuery] = useState('')
    const [exchangeToConnect, setExchangeToConnect] = useState<Exchange>()
    const [exchangeLoading, setExchangeLoading] = useState<Exchange>()

    useEffect(() => {

        (async () => {
            setLoading(true)
            try {
                const authData = TokenService.getAuthData();
                if (!authData) {
                    router.push({
                        pathname: '/login',
                        query: { redirect: '/exchanges' }
                    })
                    return;
                }
                await getAndMapExchanges(authData)
            }
            catch (e) {
                setError(e.message)
            }
            finally {
                setLoading(false)
            }
        })()
    }, [])

    const getAndMapExchanges = useCallback(async (authData) => {
        const bransferApiClient = new BransferApiClient()
        const userExchanges = await bransferApiClient.GetExchangeAccounts(authData.access_token)

        const mappedExchanges = exchanges.map(e => {
            return {
                ...e,
                is_connected: userExchanges.data?.some(ue => ue.exchange === e.internal_name && ue.is_enabled)
            }
        })
        mappedExchanges.sort((a, b) => (+b.is_enabled) - (+a.is_enabled) || (+b.is_connected) - (+a.is_connected))

        setUserExchanges(mappedExchanges)
    }, [exchanges])


    const filteredItems =
        query === ''
            ? userExchanges
            : userExchanges.filter((item) => {
                return item.name.toLowerCase().includes(query.toLowerCase())
            })

    const handleComboboxChange = useCallback(() => { }, [])
    const handleQueryInputChange = useCallback((event) => setQuery(event.target.value), [])

    const handleConnectExchange = (exchange: Exchange) => {
        setExchangeToConnect(exchange)
    }
    const handleDisconnectExchange = async (exchange: Exchange) => {
        setExchangeLoading(exchange)
        try {
            const authData = TokenService.getAuthData();
            if (!authData) {
                router.push({
                    pathname: '/login',
                    query: { redirect: '/exchanges' }
                })
                return;
            }
            const bransferApiClient = new BransferApiClient()
            await bransferApiClient.DeleteExchange(exchange.internal_name, authData.access_token)
            await getAndMapExchanges(authData)
        }
        catch (e) {
            setError(e.message)
        }
        finally {
            setExchangeLoading(undefined)
        }
    }

    const handleClose = () => {
        setExchangeToConnect(undefined)
    }

    const handleExchangeConnected = async () => {
        setLoading(true)
        setExchangeToConnect(undefined)
        try {
            const authData = TokenService.getAuthData();
            if (!authData) {
                router.push({
                    pathname: '/login',
                    query: { redirect: '/exchanges' }
                })
                return;
            }
            await getAndMapExchanges(authData)
        }
        catch (e) {
            setError(e.message)
        }
        finally {
            setLoading(false)
        }
    }
    return (
        <div className={`bg-darkBlue text-white min-w-3xl shadow-card rounded-lg w-full overflow-hidden relative `}>
            <div className="w-full flex items-center justify-between px-8 mt-3 h-[44px]" >
                <>
                    <div className='mx-auto px-4 overflow-hidden md:hidden'>
                        <div className="flex justify-center">
                            <Link href="/" key="Home" shallow={true}>
                                <a>
                                    <LayerSwapLogo className="h-8 w-auto text-white  opacity-50" />
                                </a>
                            </Link>
                        </div>
                    </div>
                    <LayerswapMenu />
                </>
            </div>
            <div className="px-6 md:px-12 relative inset-0 flex flex-col overflow-y-auto scrollbar:!w-1.5 scrollbar:!h-1.5 scrollbar:bg-darkblue-500 scrollbar-track:!bg-slate-100 scrollbar-thumb:!rounded scrollbar-thumb:!bg-slate-300 scrollbar-track:!rounded scrollbar-track:!bg-slate-500/[0.16] scrollbar-thumb:!bg-slate-500/50">
                <div className="relative min-h-full items-center justify-center p-4 text-center">
                    <Combobox
                        as="div"
                        className="transform  transition-all "
                        onChange={handleComboboxChange}
                        value={query}
                    >
                        <div className="relative mb-5">
                            <SearchIcon
                                className="pointer-events-none absolute top-3.5 left-4 h-5 w-5 text-light-blue"
                                aria-hidden="true"
                            />
                            <Combobox.Input
                                className="h-12 w-full bg-darkblue-500 rounded-lg border-ouline-blue pl-11 pr-4 text-light-blue placeholder-light-blue focus:ring-0 sm:text-sm"
                                placeholder="Search..."
                                onChange={handleQueryInputChange}
                                value={query}
                            />
                        </div>
                        {filteredItems?.length > 0 && (
                            <Combobox.Options static className="border-0 grid grid-cols-1 md:grid-cols-2 gap-2">
                                {filteredItems.map((item) => (
                                    <Combobox.Option
                                        key={item.id}
                                        value={item}
                                        disabled={!item.is_enabled || !item.is_enabled}
                                        className={`flex text-left bg-darkblue-500 ${!item.is_enabled ? 'opacity-35 cursor-not-allowed' : ''}  select-none rounded-lg p-3`}
                                        onClick={() => { }}
                                    >
                                        {({ active }) => (
                                            <>
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-8 w-8 relative">
                                                        <Image
                                                            src={item.logo_url}
                                                            alt="Exchange Logo"
                                                            height="60"
                                                            width="60"
                                                            layout="responsive"
                                                            className="rounded-md object-contain"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="ml-4 flex-auto">
                                                    <div className='text-lg font-medium'>
                                                        {item.name}
                                                        {(!item.authorization_flow || item.authorization_flow == "none") && <div className="text-sm text-emerald-600">No action required</div>}
                                                        {
                                                            item.authorization_flow && item.authorization_flow !== "none" && item.is_enabled &&
                                                            <>
                                                                {item.is_connected ? <div className="text-sm text-emerald-600">Connected</div> : <div className="text-sm text-slate-600">Not beeing used</div>}
                                                            </>
                                                        }
                                                        {!item.is_enabled && <div className="text-sm text-yellow-600">Currently not available</div>}

                                                    </div>
                                                </div>
                                                <div className="p-4 rounded-md hover:bg-darkblue-300 cursor-pointer">
                                                    {
                                                        (!item.authorization_flow || item.authorization_flow == "none") &&
                                                        <CheckIcon className="h-8 w-8 fill-green-400" />
                                                    }
                                                    {
                                                        item.authorization_flow && item.authorization_flow !== "none" && item.is_enabled && exchangeLoading?.id !== item.id &&
                                                        <>
                                                            {
                                                                item.is_connected ?
                                                                    <span onClick={() => handleDisconnectExchange(item)}><ScissorsIcon className="h-8 w-8 fill-red-400" /></span>
                                                                    : <span onClick={() => handleConnectExchange(item)}><LinkIcon className="h-8 w-8 fill-green-400" /></span>
                                                            }
                                                        </>
                                                    }
                                                    {
                                                        exchangeLoading?.id === item.id &&
                                                        <span className="flex items-center pl-3">
                                                            <SpinIcon className="animate-spin h-5 w-5" />
                                                        </span>
                                                    }

                                                </div>

                                            </>
                                        )}
                                    </Combobox.Option>
                                ))}
                            </Combobox.Options>
                        )}

                        {query !== '' && filteredItems?.length === 0 && (
                            <div className="py-14 px-6 text-center text-sm sm:px-14">
                                <ExclamationCircleIcon
                                    type="outline"
                                    name="exclamation-circle"
                                    className="mx-auto h-6 w-6 text-light-blue"
                                />
                                <p className="mt-4 font-semibold text-gray-900">No results found</p>
                                <p className="mt-2 text-gray-500">No components found for this search term. Please try again.</p>
                            </div>
                        )}
                    </Combobox>
                </div>
            </div>
            <Transition appear show={!!exchangeToConnect} as={Fragment}>
                <Dialog as="div" className="relative z-10" onClose={handleClose}>
                    <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black bg-opacity-25" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-darkBlue shadow-card text-center align-middle shadow-xl transition-all">
                                    {
                                        exchangeToConnect?.authorization_flow === "o_auth2" &&
                                        <ConnectOauthExchange exchange={exchangeToConnect} onClose={handleExchangeConnected} />
                                    }
                                    {
                                        exchangeToConnect?.authorization_flow === "api_credentials" &&
                                        <ConnectApiKeyExchange exchange={exchangeToConnect} onClose={handleExchangeConnected} />
                                    }
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    )
}


export default UserExchanges;