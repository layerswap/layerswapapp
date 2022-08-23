import { useRouter } from "next/router"
import { Fragment, useCallback, useEffect, useState } from "react"
import TokenService from "../lib/TokenService"
import { ExclamationCircleIcon, SearchIcon, XIcon } from '@heroicons/react/outline';
import { Combobox, Dialog, Transition } from "@headlessui/react"
import { useSettingsState } from "../context/settings"
import { BransferApiClient } from "../lib/bransferApiClients"
import Image from 'next/image'
import { Exchange } from "../Models/Exchange"
import ConnectOauthExchange from "./connectOauthExchange"
import ConnectApiKeyExchange from "./connectApiKeyExchange"
import LayerswapMenu from "./LayerswapMenu"
import LayerSwapLogo from "./icons/layerSwapLogo"
import SubmitButton from "./buttons/submitButton";
import { useAuthState } from "../context/authContext";
import toast from "react-hot-toast";
import shortenAddress, { shortenEmail } from "./utils/ShortenAddress";
import HoverTooltip from "./Tooltips/HoverTooltip";

interface UserExchange extends Exchange {

    note?: string,
    is_connected: boolean
}

function UserExchanges() {

    const { data } = useSettingsState()
    const [userExchanges, setUserExchanges] = useState<UserExchange[]>()
    const [loading, setLoading] = useState(false)
    const router = useRouter();
    const [query, setQuery] = useState('')
    const [exchangeToConnect, setExchangeToConnect] = useState<Exchange>()
    const [exchangeLoading, setExchangeLoading] = useState<Exchange>()
    const { email } = useAuthState()
    const [exchangeToDisconnect, setExchangeToDisconnect] = useState<Exchange>()

    const handleGoHome = useCallback(() => {
        router.push({
            pathname: "/",
            query: router.query
        })
    }, [router.query])

    useEffect(() => {

        (async () => {
            setLoading(true)
            try {
                const authData = TokenService.getAuthData();
                if (!authData) {
                    router.push({
                        pathname: '/auth',
                        query: { ...router.query, redirect: '/exchanges' }
                    })
                    return;
                }
                await getAndMapExchanges(authData)
            }
            catch (e) {
                toast.error(e.message)
            }
            finally {
                setLoading(false)
            }
        })()
    }, [router.query])

    const getAndMapExchanges = useCallback(async (authData) => {
        const bransferApiClient = new BransferApiClient()
        const userExchanges = await bransferApiClient.GetExchangeAccounts(authData.access_token)

        const mappedExchanges = data.exchanges.filter(x => x.authorization_flow != 'none' && x.is_enabled).map(e => {
            return {
                ...e,
                is_connected: userExchanges.data?.some(ue => ue.exchange === e.internal_name && ue.is_enabled),
                note: userExchanges.data?.find(ue => ue.exchange === e.internal_name)?.note
            }
        })
        mappedExchanges.sort((a, b) => (+a.order) - (+b.order))


        setUserExchanges(mappedExchanges)
    }, [data.exchanges])

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
    const handleDisconnectExchange = useCallback(async (exchange: Exchange) => {
        setExchangeLoading(exchange)
        try {
            const authData = TokenService.getAuthData();
            if (!authData) {
                router.push({
                    pathname: '/auth',
                    query: { ...(router.query), redirect: '/exchanges' }
                })
                return;
            }
            const bransferApiClient = new BransferApiClient()
            await bransferApiClient.DeleteExchange(exchange.internal_name, authData.access_token)
            await getAndMapExchanges(authData)
        }
        catch (e) {
            toast.error(e.message)
        }
        finally {
            setExchangeLoading(undefined)
        }
    }, [router.query])

    const handleClose = () => {
        setExchangeToConnect(undefined);
        setExchangeToDisconnect(undefined)
    }

    const handleExchangeConnected = useCallback(async () => {
        setLoading(true)
        setExchangeToConnect(undefined)
        try {
            const authData = TokenService.getAuthData();
            if (!authData) {
                router.push({
                    pathname: '/auth',
                    query: { ...(router.query), redirect: '/exchanges' }
                })
                return;
            }
            await getAndMapExchanges(authData)
        }
        catch (e) {
            toast.error(e.message)
        }
        finally {
            setLoading(false)
        }
    }, [router.query])

    function isEmail(data: string) {
        if (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(data)) {
           return shortenEmail(data)
        } else {
            return shortenAddress(data);
        }
    }

    return (
        <div className='bg-darkBlue px-8 md:px-12 shadow-card rounded-lg w-full text-white overflow-hidden relative min-h'>
            <div className="mt-3 flex items-center justify-between z-20" >
                <div className="hidden md:block">
                    <p className="text-2xl mb-1 mt-2 font-bold">Account</p>
                    <span className="text-gray-500 font-medium">{email}</span>
                </div>
                <div className='mx-auto px-4 overflow-hidden md:hidden'>
                    <div className="flex justify-center">
                        <a onClick={handleGoHome}>
                            <LayerSwapLogo className="h-8 w-auto text-white opacity-50" />
                        </a>
                    </div>
                </div>
                <LayerswapMenu />
            </div>
            <div className="relative mb-6 mt-10 inset-0 flex flex-col overflow-y-auto scrollbar:!w-1.5 scrollbar:!h-1.5 scrollbar:bg-darkblue-500 scrollbar-track:!bg-slate-100 scrollbar-thumb:!rounded scrollbar-thumb:!bg-slate-300 scrollbar-track:!rounded scrollbar-track:!bg-slate-500/[0.16] scrollbar-thumb:!bg-slate-500/50">
                <div className="relative min-h-full items-center justify-center text-center">
                    <Combobox
                        as="div"
                        className="transform  transition-all "
                        onChange={handleComboboxChange}
                        value={query}
                    >
                        <div className="relative mb-5">
                            <SearchIcon
                                className="pointer-events-none absolute top-3.5 left-4 h-5 w-5 text-pink-primary-300"
                                aria-hidden="true"
                            />
                            <Combobox.Input
                                className="h-12 w-full bg-darkblue-500 rounded-lg border-ouline-blue pl-11 pr-4 text-pink-primary-300 placeholder-pink-primary-300 focus:ring-0 sm:text-sm"
                                placeholder="Search..."
                                onChange={handleQueryInputChange}
                                value={query}
                            />
                        </div>
                        <Combobox.Options static className="border-0 grid grid-cols-1 md:grid-cols-2 gap-2">
                            {
                                loading ? <Sceleton />
                                    :
                                    <>
                                        {filteredItems?.length > 0 && (
                                            filteredItems.map((item) => (
                                                <Combobox.Option
                                                    key={item.id}
                                                    value={item}
                                                    disabled={!item.is_enabled || !item.is_enabled}
                                                    className={`bg-darkblue-500 ${!item.is_enabled ? 'opacity-35 cursor-not-allowed' : ''}  select-none rounded-lg p-3`}
                                                    onClick={() => { }}
                                                >
                                                    {({ active }) => (
                                                        <div className="py-1 px-2 grid grid-cols-3 grid-rows-1 gap-3">
                                                            <div className="flex items-center col-span-2 space-x-3">
                                                                <Image
                                                                    src={item.logo_url}
                                                                    alt="Exchange Logo"
                                                                    height="30"
                                                                    width="30"
                                                                    layout="fixed"
                                                                    className="rounded-md h-8 w-8 object-contain"
                                                                />
                                                                <div className="text-base font-medium text-left">
                                                                    <p>{item.name}</p>
                                                                    {
                                                                        item?.note &&
                                                                        <div className="flex items-center">
                                                                            <p className="text-xs font-normal">
                                                                                {isEmail(item.note)}
                                                                            </p>
                                                                            <HoverTooltip moreClassNames="w-40 break-words -left-1.5" positionClassnames="left-4" text={item.note} />
                                                                        </div>
                                                                    }
                                                                </div>
                                                            </div>
                                                            <div className="text-xs">
                                                                {
                                                                    item.authorization_flow && item.authorization_flow !== "none" && item.is_enabled && exchangeLoading?.id !== item.id &&
                                                                    <>
                                                                        {
                                                                            item.is_connected ?
                                                                                <SubmitButton onClick={() => setExchangeToDisconnect(item)} buttonStyle="outline" isDisabled={false} isSubmitting={exchangeLoading?.id === item.id} icon={""}>Disconnect</SubmitButton>
                                                                                : <SubmitButton onClick={() => handleConnectExchange(item)} buttonStyle="filled" isDisabled={false} isSubmitting={exchangeLoading?.id === item.id} icon={""}>Connect</SubmitButton>
                                                                        }
                                                                    </>
                                                                }
                                                            </div>
                                                        </div>
                                                    )}
                                                </Combobox.Option>
                                            ))
                                        )}
                                    </>
                            }
                        </Combobox.Options>

                        {query !== '' && filteredItems?.length === 0 && (
                            <div className="py-14 px-6 text-center text-sm sm:px-14">
                                <ExclamationCircleIcon
                                    type="outline"
                                    name="exclamation-circle"
                                    className="mx-auto h-6 w-6 text-pink-primary-300"
                                />
                                <p className="mt-4 font-semibold text-gray-900">No results found</p>
                                <p className="mt-2 text-gray-500">No components found for this search term. Please try again.</p>
                            </div>
                        )}
                    </Combobox>
                </div>
            </div>
            <Transition appear show={!!exchangeToConnect || !!exchangeToDisconnect} as={Fragment}>
                <Dialog as="div" className="relative z-40" onClose={handleClose}>
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
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-fit max-w-xl transform overflow-hidden rounded-md bg-darkBlue align-middle shadow-xl transition-all">
                                    <div className="py-6 md:py-8">
                                        <div className="flex mb-6 items-center justify-between px-6 md:px-8">
                                            <div className='text-lg font-semibold mr-10 text-white'>
                                                {
                                                    exchangeToDisconnect ? <>Are you sure?</> : <>Connect {exchangeToConnect?.name}</>
                                                }
                                            </div>
                                            <span className="relative grid grid-cols-1 gap-4 place-content-end z-40 justify-self-end text-pink-primary-300 cursor-pointer">
                                                <button
                                                    type="button"
                                                    className="rounded-md text-darkblue-200  hover:text-pink-primary-300"
                                                    onClick={handleClose}
                                                >
                                                    <span className="sr-only">Close</span>
                                                    <XIcon className="h-6 w-6" aria-hidden="true" />
                                                </button>
                                            </span>
                                        </div>
                                        {
                                            exchangeToConnect?.authorization_flow === "o_auth2" &&
                                            <ConnectOauthExchange exchange={exchangeToConnect} onClose={handleExchangeConnected} />
                                        }
                                        {
                                            exchangeToConnect?.authorization_flow === "api_credentials" &&
                                            <ConnectApiKeyExchange exchange={exchangeToConnect} onSuccess={handleExchangeConnected} />
                                        }
                                        {
                                            exchangeToDisconnect &&
                                            <div className="flex justify-items-center space-x-3 max-w-xs px-6 md:px-8">
                                                <SubmitButton isDisabled={false} isSubmitting={false} onClick={() => { handleDisconnectExchange(exchangeToDisconnect); handleClose() }} buttonStyle='outline' size="small" icon={""} >Yes</SubmitButton>
                                                <SubmitButton isDisabled={false} isSubmitting={false} onClick={handleClose} size='small' icon={""}>No</SubmitButton>
                                            </div>
                                        }
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    )
}

const Sceleton = () => {

    return <>
        {[...Array(6)]?.map((item, index) =>
            <div
                key={index}
                className="animate-pulse bg-darkblue-500 select-none rounded-lg p-3">
                <div className="flex justify-between px-2">
                    <div className="flex space-x-2">
                        <div className="rounded-full bg-slate-700 h-8 w-8"></div>
                        <div className="grid grid-cols-4">
                            <div className="h-2 w-20 bg-slate-700 rounded col-span-3"></div>
                        </div>
                    </div>

                    <div className="rounded bg-slate-700 h-8 w-20 place-self-end py-3 px-4"></div>
                </div>
            </div>
        )}
    </>

}


export default UserExchanges;