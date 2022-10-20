import { useRouter } from "next/router"
import { useCallback, useEffect, useState } from "react"
import TokenService from "../lib/TokenService"
import { ExclamationCircleIcon } from '@heroicons/react/outline';
import { Combobox } from "@headlessui/react"
import { useSettingsState } from "../context/settings"
import LayerswapApiClient from "../lib/layerSwapApiClient"
import Image from 'next/image'
import { Exchange } from "../Models/Exchange"
import ConnectOauthExchange from "./connectOauthExchange"
import ConnectApiKeyExchange from "./connectApiKeyExchange"
import LayerswapMenu from "./LayerswapMenu"
import SubmitButton from "./buttons/submitButton";
import { useAuthState } from "../context/authContext";
import toast from "react-hot-toast";
import shortenAddress, { shortenEmail } from "./utils/ShortenAddress";
import HoverTooltip from "./Tooltips/HoverTooltip";
import { ExchangesComponentSceleton } from "./Sceletons";
import GoHomeButton from "./utils/GoHome";
import Modal from "./modalComponent";

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
    const [openExchangeToConnectModal, setOpenExchangeToConnectModal] = useState(false)
    const [openExchangeToDisconnectModal, setOpenExchangeToDisconnectModal] = useState(false)

    const { discovery: { resource_storage_url } } = data

    useEffect(() => {
        (async () => {
            setLoading(true)
            try {
                await getAndMapExchanges()
            }
            catch (e) {
                toast.error(e.message)
            }
            finally {
                setLoading(false)
            }
        })()
    }, [router.query])

    const getAndMapExchanges = useCallback(async () => {
        try {
            const layerswapApiClient = new LayerswapApiClient(router, '/exchanges')
            const userExchanges = await layerswapApiClient.GetExchangeAccounts()

            const mappedExchanges = data.exchanges.filter(x => x.authorization_flow != 'none').map(e => {
                return {
                    ...e,
                    is_connected: userExchanges.data?.some(ue => ue.exchange_id === e.id),
                    note: userExchanges.data?.find(ue => ue.exchange_id === e.id)?.note
                }
            })
            mappedExchanges.sort((a, b) => (+a.order) - (+b.order))
            setUserExchanges(mappedExchanges)
        }
        catch (e) {
            toast.error(e.message)
        }

    }, [data.exchanges])

    const filteredItems =
        query === ''
            ? userExchanges
            : userExchanges.filter((item) => {
                return item.display_name.toLowerCase().includes(query.toLowerCase())
            })


    const handleComboboxChange = useCallback(() => { }, [])
    const handleQueryInputChange = useCallback((event) => setQuery(event.target.value), [])

    const handleConnectExchange = (exchange: Exchange) => {
        setExchangeToConnect(exchange)
        setOpenExchangeToConnectModal(true)
    }

    const handleDisconnectExchange = useCallback(async (exchange: Exchange) => {
        setExchangeLoading(exchange)
        try {
            const layerswapApiClient = new LayerswapApiClient(router, '/exchanges')
            await layerswapApiClient.DeleteExchange(exchange.internal_name)
            await getAndMapExchanges()
        }
        catch (e) {
            toast.error(e.message)
        }
        finally {
            setExchangeLoading(undefined)
        }
    }, [router.query])

    const handleClose = () => {
        setOpenExchangeToConnectModal(false)
        setOpenExchangeToDisconnectModal(false)
    }

    const handleExchangeConnected = useCallback(async () => {
        setLoading(true)
        setExchangeToConnect(undefined)
        try {
            await getAndMapExchanges()
        }
        catch (e) {
            toast.error(e.message)
        }
        finally {
            setLoading(false)
        }
    }, [router.query])

    function shortenUniversalAddress(data: string) {
        if (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(data)) {
            return shortenEmail(data)
        } else {
            return shortenAddress(data);
        }
    }

    return (
        <div className='bg-darkblue px-8 md:px-12 shadow-card rounded-lg w-full text-white overflow-hidden relative'>
            <div className="mt-3 flex items-center justify-between z-20" >
                <div className="hidden md:block">
                    <p className="text-2xl mb-1 mt-2 font-bold">Account</p>
                    <span className="text-primary-text font-medium">{email}</span>
                </div>
                <div className='mx-auto px-4 overflow-hidden md:hidden'>
                    <div className="flex justify-center">
                        <GoHomeButton />
                    </div>
                </div>
                <LayerswapMenu />
            </div>
            <div className="relative mb-6 mt-10 inset-0 flex flex-col scrollbar:!w-1.5 scrollbar:!h-1.5 scrollbar:bg-darkblue-500 scrollbar-track:!bg-slate-100 scrollbar-thumb:!rounded scrollbar-thumb:!bg-slate-300 scrollbar-track:!rounded scrollbar-track:!bg-slate-500/[0.16] scrollbar-thumb:!bg-slate-500/50">
                <div className="relative min-h-full items-center justify-center text-center">
                    <Combobox
                        as="div"
                        className="transform transition-all"
                        onChange={handleComboboxChange}
                        value={query}
                    >
                        <Combobox.Options static className="border-0 grid grid-cols-1 md:grid-cols-2 gap-2">
                            {
                                loading ? <ExchangesComponentSceleton />
                                    :
                                    <>
                                        {filteredItems?.length > 0 && (
                                            filteredItems.map((item) => (
                                                <Combobox.Option
                                                    key={item.id}
                                                    value={item}
                                                    disabled={false}
                                                    className={`bg-darkblue-700  select-none rounded-lg p-3`}
                                                    onClick={() => { }}
                                                >
                                                    {({ active }) => (
                                                        <div className="py-1 px-2 grid grid-cols-3 grid-rows-1 gap-3">
                                                            <div className="flex items-center col-span-2 space-x-3">
                                                                {
                                                                    item.logo &&
                                                                    <Image
                                                                        src={`${resource_storage_url}${item.logo}`}
                                                                        alt="Exchange Logo"
                                                                        height="30"
                                                                        width="30display_name"
                                                                        layout="fixed"
                                                                        className="rounded-md h-8 w-8 object-contain"
                                                                    />
                                                                }
                                                                <div className="text-base font-medium text-left">
                                                                    <p>{item.display_name}</p>
                                                                    {
                                                                        item?.note &&
                                                                        <div className="flex items-center">
                                                                            <p className="text-xs font-normal">
                                                                                {shortenUniversalAddress(item.note)}
                                                                            </p>
                                                                            <HoverTooltip moreClassNames="w-40 break-words -left-1.5" positionClassnames="left-4" text={item.note} />
                                                                        </div>
                                                                    }
                                                                </div>
                                                            </div>
                                                            <div className="text-xs">
                                                                {
                                                                    item.authorization_flow && item.authorization_flow !== "none" && exchangeLoading?.id !== item.id &&
                                                                    <>
                                                                        {
                                                                            item.is_connected ?
                                                                                <SubmitButton onClick={() => { setExchangeToDisconnect(item); setOpenExchangeToDisconnectModal(true) }} buttonStyle="outline" isDisabled={false} isSubmitting={exchangeLoading?.id === item.id}>Disconnect</SubmitButton>
                                                                                : <SubmitButton onClick={() => handleConnectExchange(item)} buttonStyle="filled" isDisabled={false} isSubmitting={exchangeLoading?.id === item.id}>Connect</SubmitButton>
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
                            <div className="py-8 px-6 text-center text-primary-text text-sm sm:px-14">
                                <ExclamationCircleIcon
                                    type="outline"
                                    name="exclamation-circle"
                                    className="mx-auto h-16 w-16 text-primary"
                                />
                                <p className="mt-4 font-semibold">No 'items' found.</p>
                                <p className="mt-2">Please try a different search term.</p>
                            </div>
                        )}
                    </Combobox>
                </div>
            </div>

            <Modal isOpen={openExchangeToConnectModal && exchangeToConnect?.authorization_flow === "o_auth2"} onDismiss={handleClose} title={`Connect ${exchangeToConnect?.display_name}`} >
                <ConnectOauthExchange exchange={exchangeToConnect} onClose={handleExchangeConnected} />
            </Modal>
            <Modal isOpen={openExchangeToConnectModal && exchangeToConnect?.authorization_flow === "api_credentials"} onDismiss={handleClose} title={`Connect ${exchangeToConnect?.display_name}`} >
                <ConnectApiKeyExchange exchange={exchangeToConnect} onSuccess={handleExchangeConnected} slideOverPlace='inModal' />
            </Modal>
            <Modal isOpen={openExchangeToDisconnectModal} onDismiss={handleClose} title={'Are you sure?'} modalSize='small'>
                <div className="flex justify-items-center space-x-3 max-w-xs">
                    <SubmitButton isDisabled={false} isSubmitting={false} onClick={() => { handleDisconnectExchange(exchangeToDisconnect); handleClose() }} buttonStyle='outline' size="small" >Yes</SubmitButton>
                    <SubmitButton isDisabled={false} isSubmitting={false} onClick={handleClose} size='small'>No</SubmitButton>
                </div>
            </Modal>
        </div>
    )
}

export default UserExchanges;