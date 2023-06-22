import { useRouter } from "next/router"
import { useCallback, useEffect, useState } from "react"
import { AlertCircle } from 'lucide-react';
import { Combobox } from "@headlessui/react"
import { useSettingsState } from "../context/settings"
import LayerswapApiClient from "../lib/layerSwapApiClient"
import Image from 'next/image'
import ConnectApiKeyExchange from "./Swap/Form/connectApiKeyExchange"
import SubmitButton from "./buttons/submitButton";
import { useAuthState } from "../context/authContext";
import toast from "react-hot-toast";
import shortenAddress, { shortenEmail } from "./utils/ShortenAddress";
import { ExchangesComponentSceleton } from "./Sceletons";
import KnownInternalNames from "../lib/knownIds";
import ClickTooltip from "./Tooltips/ClickTooltip";
import ConnectOauthExchange from "./connectOauthExchange";
import Modal from "./modal/modal";
import { Layer } from "../Models/Layer";
import HeaderWithMenu from "./HeaderWithMenu";

type UserExchange = {
    note?: string,
    is_connected: boolean
} & Layer & { isExchange: true }

function UserExchanges() {

    const settings = useSettingsState()
    const [userExchanges, setUserExchanges] = useState<UserExchange[]>()
    const [loading, setLoading] = useState(false)
    const router = useRouter();
    const [exchangeToConnect, setExchangeToConnect] = useState<Layer & { isExchange: true }>()
    const [exchangeLoading, setExchangeLoading] = useState<Layer & { isExchange: true }>()
    const { email } = useAuthState()
    const [exchangeToDisconnect, setExchangeToDisconnect] = useState<Layer & { isExchange: true }>()
    const [openExchangeToConnectModal, setOpenExchangeToConnectModal] = useState(false)
    const [openExchangeToDisconnectModal, setOpenExchangeToDisconnectModal] = useState(false)

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
            const { data: userExchanges, error } = await layerswapApiClient.GetExchangeAccounts()

            if (error) {
                toast.error(error.message);
                return;
            }

            const mappedExchanges = settings
                .layers
                ?.filter(l => l.isExchange)
                .map((e: Layer & { isExchange: true }) => {
                    return {
                        ...e,
                        is_connected: userExchanges?.some(ue => ue.exchange === e.internal_name),
                        note: userExchanges?.find(ue => ue.exchange === e.internal_name)?.note,
                        authorization_flow: e?.authorization_flow
                    }
                })

            setUserExchanges(mappedExchanges)
        }
        catch (e) {
            toast.error(e.message)
        }

    }, [settings.exchanges])

    const handleConnectExchange = (exchange: Layer & { isExchange: true }) => {
        setExchangeToConnect(exchange)
        setOpenExchangeToConnectModal(true)
    }

    const handleDisconnectExchange = useCallback(async (exchange: Layer & { isExchange: true }) => {
        setExchangeLoading(exchange)
        try {
            const layerswapApiClient = new LayerswapApiClient(router, '/exchanges')
            await layerswapApiClient.DeleteExchange(exchange?.internal_name)
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
        try {
            await getAndMapExchanges()
        }
        catch (e) {
            toast.error(e.message)
        }
        finally {
            setLoading(false)
            setOpenExchangeToConnectModal(false)
        }
    }, [router.query])

    function shortenUniversalAddress(data: string) {
        if (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(data)) {
            return shortenEmail(data)
        } else {
            return shortenAddress(data);
        }
    }

    const handleGoBack = useCallback(() => {
        router.back()
    }, [router])

    return (
        <>
            <div className='bg-secondary-900 sm:shadow-card rounded-lg mb-6 w-full text-white overflow-hidden relative min-h-[600px]'>
                <HeaderWithMenu goBack={handleGoBack}></HeaderWithMenu>
                <div className="hidden md:block px-6">
                    <p className="text-2xl font-bold relative">Account</p>
                    <span className="text-primary-text font-medium absolute">{email}</span>
                </div>
                <div className="relative mb-6 px-6 mt-10 inset-0 flex flex-col styled-scroll">
                    <div className="relative min-h-full items-center justify-center text-center">
                        <Combobox
                            as="div"
                            className="transform transition-all"
                        >
                            <Combobox.Options static className="border-0 grid grid-cols-1 gap-2">
                                {
                                    loading ? <ExchangesComponentSceleton />
                                        :
                                        <>
                                            {userExchanges?.length > 0 && (
                                                userExchanges.map((item) => (

                                                    item.authorization_flow !== 'none' &&

                                                    <Combobox.Option
                                                        key={item.internal_name}
                                                        value={item}
                                                        disabled={false}
                                                        className={`bg-secondary-700  select-none rounded-lg p-3`}
                                                        onClick={() => { }}
                                                    >
                                                        {({ active }) => (
                                                            <div className="py-1 px-2 grid grid-cols-3 grid-rows-1 gap-3">
                                                                <div className="flex items-center col-span-2 space-x-3">
                                                                    <Image
                                                                        src={settings.resolveImgSrc(item)}
                                                                        alt="Exchange Logo"
                                                                        height="30"
                                                                        width="30"
                                                                        layout="fixed"
                                                                        className="rounded-md h-8 w-8 object-contain"
                                                                    />
                                                                    <div className="text-base font-medium text-left">
                                                                        <p>{item.display_name}</p>
                                                                        {
                                                                            item?.note &&
                                                                            <div className="flex items-center">
                                                                                <p className="text-xs font-normal">
                                                                                    {shortenUniversalAddress(item.note)}
                                                                                </p>
                                                                                <ClickTooltip text={item.note} moreClassNames='break-all' />
                                                                            </div>
                                                                        }
                                                                    </div>
                                                                </div>
                                                                <div className="text-xs">
                                                                    <>
                                                                        {
                                                                            item.is_connected ?
                                                                                <SubmitButton onClick={() => { setExchangeToDisconnect(item); setOpenExchangeToDisconnectModal(true) }} buttonStyle="outline" isDisabled={false} isSubmitting={exchangeLoading?.internal_name === item?.internal_name}>Disconnect</SubmitButton>
                                                                                : <SubmitButton onClick={() => handleConnectExchange(item)} buttonStyle="filled" isDisabled={false} isSubmitting={exchangeLoading?.internal_name === item?.internal_name}>Connect</SubmitButton>
                                                                        }
                                                                    </>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Combobox.Option>
                                                ))
                                            )}
                                        </>
                                }
                            </Combobox.Options>

                            {userExchanges?.length === 0 && (
                                <div className="py-8 px-6 text-center text-primary-text text-sm sm:px-14">
                                    <AlertCircle
                                        name="exclamation-circle"
                                        className="mx-auto h-16 w-16 text-primary"
                                    />
                                    <p className="mt-4 font-semibold">No 'items' found.</p>
                                    <p className="mt-2">Please try later.</p>
                                </div>
                            )}
                        </Combobox>
                    </div>
                </div>
                <div id="widget_root" />
            </div>
            <Modal height='fit' show={openExchangeToConnectModal && exchangeToConnect?.authorization_flow === "o_auth2"} setShow={setOpenExchangeToConnectModal} header={`Connect ${exchangeToConnect?.display_name}`} >
                <ConnectOauthExchange exchange={exchangeToConnect} onClose={handleExchangeConnected} />
            </Modal>
            <Modal  show={openExchangeToConnectModal && exchangeToConnect?.authorization_flow === "api_credentials"} setShow={setOpenExchangeToConnectModal} header={`Connect ${exchangeToConnect?.display_name}`}>
                <ConnectApiKeyExchange exchange={exchangeToConnect} onSuccess={handleExchangeConnected} stickyFooter={false} />
            </Modal>
            <Modal height="fit" show={openExchangeToDisconnectModal} setShow={setOpenExchangeToDisconnectModal} header={'Are you sure?'} >
                <div className="space-y-3">
                    <p className="text-slate-300 text-sm font-medium">
                        {
                            exchangeToDisconnect?.internal_name == KnownInternalNames.Exchanges.Coinbase ?
                                <span>The Layerswap application will be disconnected from your Coinbase account.</span>
                                :
                                <span>Your API Keys will be permanently removed from Layerswap.</span>
                        } If you have an in progress swap, it'll fail.
                    </p>
                    <div className="flex items-center space-x-3">
                        <SubmitButton isDisabled={false} isSubmitting={false} onClick={() => { handleDisconnectExchange(exchangeToDisconnect); handleClose() }} buttonStyle='outline' size="small" >Yes</SubmitButton>
                        <SubmitButton isDisabled={false} isSubmitting={false} onClick={handleClose} size='small'>No</SubmitButton>
                    </div>
                </div>
            </Modal>
        </>
    )
}

export default UserExchanges;