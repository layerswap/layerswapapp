import LayerSwapApiClient, { SwapItem, TransactionType } from "../../../lib/layerSwapApiClient"
import { ApiResponse, EmptyApiResponse } from "../../../Models/ApiResponse"
import { useSettingsState } from "../../../context/settings"
import { SwapDataProvider } from "../../../context/swap"
import WithdrawalPage from "../../Swap"
import { ArrowDownIcon, ChevronRightIcon, Scroll } from 'lucide-react'
import Modal from "../../modal/modal"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import Summary from "../Summary";
import useSWRInfinite from 'swr/infinite'
import SpinIcon from "../../icons/spinIcon";
import useWallet from "../../../hooks/useWallet"
import Link from "next/link"
import AppSettings from "../../../lib/AppSettings"
import axios from "axios"
import SwapDetails from "../SwapDetailsComponent"
import Snippet from "./Snippet"

const PAGE_SIZE = 20
const container = {
    initial: {
        transition: {
            type: "spring",
            staggerChildren: 0.03,
            staggerDirection: 1,
            duration: 3
        }
    },
    highlight: {
        transition: {
            type: "spring",
            staggerChildren: 0.03,
            staggerDirection: 1,
            duration: 0.3
        }
    }
}

const item = {
    initial: {
        transition: {
            duration: 3
        }
    },
    highlight: {
        filter: [
            null,
            null,
            "blur(3px) drop-shadow(4px 4px 4px rgb(var(--ls-colors-secondary-500)))",
            "blur(0px)",
            null
        ],
        y: [0, -5, 3, -2, 0]
    },
    loading: {
        filter: [null, "blur(2px)"],
        transition: {
            type: "spring",
            duration: 0.5,
        }
    }
}

type ListProps = {
    statuses: string | number;
    refreshing: boolean;
    loadExplorerSwaps: boolean;
}

const getSwapsKey = (statuses: string | number) => (index) =>
    `/swaps?page=${index + 1}&status=${statuses}&version=${LayerSwapApiClient.apiVersion}`

const getExplorerKey = (addresses: string[]) => (index) => {
    if (!addresses?.[index])
        return null;
    return `/explorer/${addresses[index]}?version=${LayerSwapApiClient.apiVersion}`
}

const List: FC<ListProps> = ({ statuses, refreshing, loadExplorerSwaps }) => {
    const [openSwapDetailsModal, setOpenSwapDetailsModal] = useState(false)
    const [selectedSwap, setSelectedSwap] = useState<SwapItem | undefined>()
    const settings = useSettingsState()
    const { layers, exchanges } = settings
    const { wallets } = useWallet()
    const addresses = wallets.map(w => w.address)
    const [cachedSize, setCachedSize] = useState(1)

    const handleopenSwapDetails = (swap: SwapItem) => {
        setSelectedSwap(swap)
        setOpenSwapDetailsModal(true)
    }

    const getKey = useMemo(() => getSwapsKey(statuses), [statuses])
    const getFromExplorerKey = getExplorerKey(addresses)

    const apiClient = new LayerSwapApiClient()

    const { data: userSwapPages, size, setSize, isLoading: userSwapsLoading, mutate } =
        useSWRInfinite<ApiResponse<SwapItem[]>>(
            getKey,
            apiClient.fetcher,
            { revalidateAll: true, dedupingInterval: 10000 }
        )

    const explorerDataFetcher = async (url: string) => {
        const uri = LayerSwapApiClient.apiBaseEndpoint + "/api" + url
        const data = await axios.get(uri).then(res => res.data).catch(e => {
            if (e) return { data: [] }
        })
        return data
    }

    const { data: explorerPages, error: explorerError, isLoading: explorerSwapsLoading, setSize: setExplorerSize, size: explorerSize } = useSWRInfinite<ApiResponse<SwapItem[]>>(
        loadExplorerSwaps ? getFromExplorerKey : () => null,
        explorerDataFetcher,
        { revalidateAll: true, dedupingInterval: 60000, parallel: true, initialSize: addresses?.length }
    )

    useEffect(() => {
        if (explorerSize !== addresses.length) setExplorerSize(addresses.length)
    }, [addresses.length])

    const handleSWapDetailsShow = useCallback((show: boolean) => {
        setOpenSwapDetailsModal(show)
        if (!show)
            mutate()
    }, [])

    const userSwaps = userSwapPages?.map(p => p.data).flat(1) || []
    const explorerSwaps = explorerPages?.map(p => p?.data?.filter(s => s.status === 'completed')).flat(1) || []

    const userSwapsisEmpty =
        (userSwapPages?.[0] instanceof EmptyApiResponse)

    const explorerSwapsisEmpty =
        (explorerPages?.[0] instanceof EmptyApiResponse)
        || (!explorerSwapsLoading && !(explorerSwaps?.length >= 1))
        || explorerError

    const isReachingEnd =
        userSwapsisEmpty || (userSwapPages && Number(userSwapPages[userSwapPages.length - 1]?.data?.length) < PAGE_SIZE);

    const handleLoadMore = () => {
        setSize(size + 1)
        setCachedSize(size + 1)
    }
    // TODO filter explorer swaps by status
    !userSwapsLoading && explorerSwaps?.forEach(es => {
        if (!es || userSwaps?.find(us => us?.created_date === es.created_date))
            return
        const userLoadedOldestSwap = userSwaps?.[userSwaps?.length - 1]
        if (!userLoadedOldestSwap) {
            userSwaps.push(es)
            return
        }
        const userLoadedOldestSwapDate = new Date(userLoadedOldestSwap.created_date)
        const swapDate = new Date(es.created_date)
        if (userLoadedOldestSwapDate > swapDate && !isReachingEnd)
            return
        else {
            const index = userSwaps.findLastIndex(us => us && new Date(us?.created_date) > swapDate)
            userSwaps.splice(index + 1 || 0, 0, es)
        }
    })

    const allEmpty = userSwapsisEmpty && explorerSwapsisEmpty

    return <>
        <AnimatePresence >
            {(userSwapsLoading || explorerSwapsLoading) && !(Number(userSwaps?.length) > 0) ?
                <Snippet />
                :
                <motion.div
                    variants={container}
                    initial="initial"
                    animate={refreshing ? "loading" : "highlight"}
                    exit={"initial"}
                    className="text-sm py-3 space-y-4 font-medium focus:outline-none h-full"
                >
                    {
                        userSwaps?.map((swap) => {
                            const {
                                source_network: source_network_internal_name,
                                source_exchange: source_exchange_internal_name,
                                destination_exchange: destination_exchange_internal_name,
                                destination_network: destination_network_internal_name,
                                source_network_asset,
                                destination_network_asset
                            } = swap || {}


                            const source_layer = layers.find(n => n.internal_name === source_network_internal_name)
                            const sourceAsset = source_layer?.assets?.find(currency => currency?.asset === source_network_asset)
                            const destination_layer = layers?.find(l => l.internal_name === destination_network_internal_name)
                            const destinationAsset = destination_layer?.assets?.find(currency => currency?.asset === destination_network_asset)
                            const sourceExchange = exchanges.find(e => e.internal_name === source_exchange_internal_name)
                            const destExchange = exchanges.find(e => e.internal_name === destination_exchange_internal_name)


                            if (!swap || !source_layer || !sourceAsset || !destinationAsset || !destination_layer) {
                                return <></>
                            }

                            const swapRefuelTransaction = swap?.transactions?.find(t => t.type === TransactionType.Refuel)
                            const swapInputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Input)
                            const swapOutputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Output)

                            const requested_amount = swap.requested_amount

                            const destinationNetworkNativeAsset = layers.find(n => n.internal_name === destination_layer?.internal_name)?.assets.find(a => a.is_native);
                            const refuel_amount_in_usd = Number(destinationAsset?.refuel_amount_in_usd)
                            const native_usd_price = Number(destinationNetworkNativeAsset?.usd_price)

                            const refuelAmountInNativeCurrency = swap?.has_refuel
                                ? ((swapRefuelTransaction?.amount ??
                                    (refuel_amount_in_usd / native_usd_price))) : undefined;
                            const receive_amount = swapOutputTransaction?.amount

                            return <motion.div
                                onClick={() => handleopenSwapDetails(swap)}
                                key={swap.id}
                                variants={item as any}
                            >
                                {
                                    <Summary
                                        sourceCurrency={sourceAsset}
                                        destinationCurrency={destinationAsset}
                                        source={source_layer}
                                        destination={destination_layer}
                                        requestedAmount={swap.requested_amount || swapInputTransaction?.amount}
                                        receiveAmount={receive_amount}
                                        destinationAddress={swap.destination_address}
                                        hasRefuel={swap?.has_refuel}
                                        refuelAmount={refuelAmountInNativeCurrency}
                                        fee={swap.fee}
                                        swap={swap}
                                        exchange_account_connected={swap?.exchange_account_connected}
                                        exchange_account_name={swap?.exchange_account_name}
                                        destExchange={destExchange}
                                        sourceExchange={sourceExchange}
                                    />
                                }
                            </motion.div>
                        })
                    }
                    {
                        allEmpty &&
                        <div className="absolute top-1/4 right-0 text-center w-full">
                            <Scroll className='h-40 w-40 text-secondary-700 mx-auto' />
                            <p className="my-2 text-xl">It&apos;s empty here</p>
                            <p className="px-14 text-primary-text">You can find all your transactions by searching with address in</p>
                            <Link target="_blank" href={AppSettings.ExplorerURl} className="underline hover:no-underline cursor-pointer hover:text-secondary-text text-primary-text font-light">
                                <span>Layerswap Explorer</span>
                            </Link>
                        </div>
                    }
                    <button
                        disabled={isReachingEnd || userSwapsLoading}
                        type="button"
                        onClick={handleLoadMore}
                        className=" hidden"
                    >

                        <span>Load more</span>
                    </button>
                </motion.div >}
        </AnimatePresence>
        <Modal
            height='90%'
            show={openSwapDetailsModal}
            setShow={handleSWapDetailsShow}
            header={`Swap`}
            modalId="pendingSwapDetails"
        >
            <SwapDataProvider id={selectedSwap?.id}>
                {
                    selectedSwap?.id ?
                        < WithdrawalPage type="contained" />
                        :
                        <SwapDetails swap={selectedSwap!} />
                }
            </SwapDataProvider>
        </Modal>
    </>
}

export default List