import LayerSwapApiClient, { SwapResponse } from "../../../lib/layerSwapApiClient"
import { ApiResponse, EmptyApiResponse } from "../../../Models/ApiResponse"
import { ChevronDown, Plus, RefreshCw } from 'lucide-react'
import { FC, useEffect, useMemo, useState } from "react"
import HistorySummary from "../HistorySummary";
import useSWRInfinite from 'swr/infinite'
import useWallet from "../../../hooks/useWallet"
import Link from "next/link"
import axios from "axios"
import Snippet, { HistoryItemSceleton } from "./Snippet"
import { groupBy } from "../../utils/groupBy"
import { useAuthState, UserType } from "../../../context/authContext"
import ConnectButton from "../../buttons/connectButton"
import { FormWizardProvider } from "../../../context/formWizardProvider"
import { TimerProvider } from "../../../context/timerContext"
import GuestCard from "../../guestCard"
import { AuthStep } from "../../../Models/Wizard"
import { SwapStatus } from "../../../Models/SwapStatus"
import ResizablePanel from "../../ResizablePanel"
import { useHistoryContext } from "../../../context/historyContext"
import React from "react"
import { useVirtualizer } from '@tanstack/react-virtual'
import Modal from "../../modal/modal";
import SwapDetails from "../SwapDetailsComponent"

const PAGE_SIZE = 20
type ListProps = {
    statuses?: string | number;
    refreshing?: boolean;
    loadExplorerSwaps: boolean;
    componentType?: 'steps' | 'page'
    onSwapSettled?: () => void,
    onNewTransferClick?: () => void
}

const getSwapsKey = () => (index: number, userId: string | undefined) => {
    if (!userId) return null
    return `/internal/swaps?page=${index + 1}`
}

const getExplorerKey = (addresses: string[]) => (index) => {
    if (!addresses?.[index])
        return null;
    return `/explorer/${addresses[index]}`
}

type Swap = SwapResponse & { type: 'user' | 'explorer' }

const HistoryList: FC<ListProps> = ({ loadExplorerSwaps, componentType = 'page', onSwapSettled, onNewTransferClick }) => {

    const [openSwapDetailsModal, setOpenSwapDetailsModal] = useState(false)
    const [showAll, setShowAll] = useState(false)
    const { wallets } = useWallet()
    const { userId } = useAuthState()
    const addresses = wallets.map(w => w.address)
    const { setSelectedSwap, selectedSwap } = useHistoryContext()
    const handleopenSwapDetails = (swap: Swap, index: number) => {
        onSwapSettled && onSwapSettled()
        setSelectedSwap(swap)
        setOpenSwapDetailsModal(true)
    }
    const getKey = useMemo(() => getSwapsKey(), [])
    const getFromExplorerKey = getExplorerKey(addresses)
    const apiClient = new LayerSwapApiClient()


    const { data: userSwapPages, size, setSize, isLoading: userSwapsLoading, isValidating, mutate } =
        useSWRInfinite<ApiResponse<Swap[]>>(
            (index) => getKey(index, userId),
            apiClient.fetcher,
            { revalidateAll: true, dedupingInterval: 10000 }
        )

    const explorerDataFetcher = async (url: string) => {
        const uri = LayerSwapApiClient.apiBaseEndpoint + "/api/v2" + url
        const data = await axios.get(uri).then(res => res.data).catch(e => {
            if (e) return { data: [] }
        })
        return data
    }

    const { data: explorerPages, error: explorerError, isLoading: explorerSwapsLoading, setSize: setExplorerSize, size: explorerSize } = useSWRInfinite<ApiResponse<Swap[]>>(
        loadExplorerSwaps ? getFromExplorerKey : () => null,
        explorerDataFetcher,
        { revalidateAll: true, dedupingInterval: 60000, parallel: true, initialSize: addresses?.length }
    )

    useEffect(() => {
        if (explorerSize !== addresses.length) setExplorerSize(addresses.length)
    }, [addresses.length])

    const handleSWapDetailsShow = (show: boolean) => {
        if (componentType === 'page') {
            setOpenSwapDetailsModal(show)
            if (!show) {
                mutate()
            }
        }
    }

    const userSwaps = (!(userSwapPages?.[0] instanceof EmptyApiResponse) && userSwapPages?.map(p => {
        p.data?.forEach(s => {
            s.type = 'user'
        })
        return p?.data
    }).flat(1)) || []

    const explorerSwaps = explorerPages?.map(p => {
        p.data?.forEach(s => {
            s.type = 'explorer'
        })
        return p?.data?.filter(s => s.swap.status === 'completed')
    }).flat(1) || []

    const userSwapsisEmpty = !userSwapsLoading && userSwaps.length === 0
    const explorerSwapsisEmpty = !explorerSwapsLoading && explorerSwaps.length === 0

    const isReachingEnd =
        userSwapsisEmpty || (userSwapPages && Number(userSwapPages[userSwapPages.length - 1]?.data?.length) < PAGE_SIZE);

    const handleLoadMore = async () => {
        await setSize(size + 1)
    }
    // TODO filter explorer swaps by status
    !userSwapsLoading && explorerSwaps?.forEach(es => {
        if (!es || userSwaps?.find(us => us?.swap.created_date === es.swap.created_date))
            return
        const userLoadedOldestSwap = userSwaps?.[userSwaps?.length - 1]
        if (!userLoadedOldestSwap) {
            userSwaps.push(es)
            return
        }
        const userLoadedOldestSwapDate = new Date(userLoadedOldestSwap.swap.created_date)
        const swapDate = new Date(es.swap.created_date)
        if (userLoadedOldestSwapDate > swapDate && !isReachingEnd)
            return
        else {
            const index = userSwaps.findLastIndex(us => us && new Date(us?.swap.created_date) > swapDate)
            userSwaps.splice(index + 1 || 0, 0, es)
        }
    })

    const allEmpty = !!userSwapsisEmpty && !!explorerSwapsisEmpty
    useEffect(() => {
        mutate()
    }, [userId])
    const parentRef = React.useRef(null)

    const grouppedSwaps = !allEmpty
        ? Object
            .entries(
                groupBy(
                    userSwaps as Swap[], ({ swap }) =>
                    swap.status === SwapStatus.Created
                        || swap.status === SwapStatus.LsTransferPending
                        || swap.status === SwapStatus.UserTransferPending
                        || swap.status === SwapStatus.UserTransferDelayed
                        ? 'Pending'
                        : new Date(swap.created_date).toLocaleDateString()
                ))
            .map(([key, values]) => ({ key, values })).sort((a, b) => a.key === 'Pending' ? -1 : b.key === 'Pending' ? 1 : 0)
        : null

    const flattenedSwaps = grouppedSwaps?.flatMap(g => {
        if (g.key == "Pending" && !showAll) return [g.key, ...g.values.slice(0, 1)]
        return [g.key, ...g.values]
    })

    const rowVirtualizer = useVirtualizer({
        count: flattenedSwaps?.length || 0,
        getScrollElement: () => window.document.getElementById('virtualListContainer'),
        estimateSize: () => 35,
    })

    const items = rowVirtualizer.getVirtualItems()

    if ((userSwapsLoading && !(Number(userSwaps?.length) > 0) || explorerSwapsLoading)) return <Snippet />
    if (!wallets.length && !userId) return <ConnectOrSignIn />
    if (!flattenedSwaps?.length) return <BlankHistory componentType={componentType} onNewTransferClick={onNewTransferClick} />

    return (
        <>
            <div
                ref={parentRef}
            >
                <div
                    style={{
                        height: rowVirtualizer.getTotalSize(),
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    <div
                        className="space-y-2"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            transform: `translateY(${items[0]?.start ?? 0}px)`,
                        }}
                    >
                        {items.map((virtualRow) => {
                            const data = flattenedSwaps?.[virtualRow.index]
                            if (typeof data === 'string') {
                                if (data === "Pending" && Number(grouppedSwaps?.[0]?.values?.length) > 1) {
                                    return (<div className="w-full flex justify-end">
                                        <button onClick={() => setShowAll(!showAll)} className='flex items-center gap-1 text-xs font-normal text-secondary-text hover:text-primary-text pr-2'>
                                            <p className="select-none">See all incomplete swaps</p>
                                            <ChevronDown className={`${showAll && 'rotate-180'} transition-transform duation-200 w-4 h-4`} />
                                        </button>
                                    </div>)
                                }
                                return (
                                    <div
                                        key={virtualRow.key}
                                        data-index={virtualRow.index}
                                        ref={rowVirtualizer.measureElement}
                                    >
                                        <div className="w-full mt-5">
                                            {
                                                data !== 'Pending' &&
                                                <p className="text-sm text-secondary-text font-normal pl-2">
                                                    {resolveDate(data)}
                                                </p>
                                            }
                                        </div>
                                    </div>
                                )
                            }
                            const swap = data
                            if (!swap) return <></>
                            return (
                                <div
                                    onClick={() => handleopenSwapDetails(swap, virtualRow.index)}
                                    key={virtualRow.key}
                                    data-index={virtualRow.index}
                                    ref={rowVirtualizer.measureElement}
                                >
                                    <div>
                                        <HistorySummary swapResponse={swap} wallets={wallets} />
                                    </div>
                                </div>
                            )
                        })}
                        {
                            !isReachingEnd &&
                            <button
                                disabled={isReachingEnd || userSwapsLoading || explorerSwapsLoading || isValidating}
                                type="button"
                                onClick={handleLoadMore}
                                className="text-primary inline-flex gap-1 items-center justify-center disabled:opacity-80 m-auto w-full"
                            >

                                <RefreshCw className={`w-4 h-4 ${(userSwapsLoading || explorerSwapsLoading || isValidating) && 'animate-spin'}`} />
                                <span>Load more</span>
                            </button>
                        }
                    </div>
                </div>
            </div>
            {
                componentType === 'page' &&
                <Modal
                    height="full"
                    show={openSwapDetailsModal}
                    setShow={handleSWapDetailsShow}
                    header='Swap details'
                    modalId="swapDetails"
                >
                    {
                        selectedSwap &&
                        <SwapDetails swapResponse={selectedSwap} />
                    }
                </Modal>
            }
        </>
    )
}

const BlankHistory = ({ componentType, onNewTransferClick }: { componentType?: 'steps' | 'page', onNewTransferClick?: () => void }) => {

    return <div className="w-full h-full min-h-[inherit] flex flex-col justify-between items-center ">
        <div />
        <div className="w-full h-full flex flex-col justify-center items-center ">
            <HistoryItemSceleton className="scale-[.63] w-full shadow-lg mr-7" />
            <HistoryItemSceleton className="scale-[.63] -mt-12 shadow-card ml-7 w-full" />
            <div className="mt-2 text-center space-y-2">
                <h1 className="text-secondary-text text-[28px] font-bold tracking-wide" >
                    No Transfer History
                </h1>
                <p className="max-w-xs text-center text-primary-text-muted text-base font-normal mx-auto">
                    Transfers you make with this wallet/account will appear here after excution.
                </p>
            </div>
            {
                componentType === 'steps' ?
                    <button onClick={onNewTransferClick} className="mt-10 flex items-center gap-2 text-base text-secondary-text font-normal bg-secondary-500 hover:bg-secondary-600 py-2 px-3 rounded-lg">
                        <Plus className="w-4 h-4" />
                        <p>New Transfer</p>
                    </button>
                    :
                    <Link href={"/"} className="mt-10 flex items-center gap-2 text-base text-secondary-text font-normal bg-secondary-500 hover:bg-secondary-600 py-2 px-3 rounded-lg">
                        <Plus className="w-4 h-4" />
                        <p>New Transfer</p>
                    </Link>
            }

        </div>
        <div className="w-full">
            <SignIn />
        </div>
    </div>

}

const ConnectOrSignIn = () => {

    return <div className="w-full h-full  flex flex-col justify-between items-center ">
        <div className="flex flex-col items-center justify-center text-center w-full h-full">
            <HistoryItemSceleton className="scale-[.63] w-full shadow-lg mr-7" />
            <HistoryItemSceleton className="scale-[.63] -mt-12 shadow-card ml-7 w-full" />
            <div className="mt-4 text-center space-y-3">
                <h1 className="text-secondary-text text-[28px] font-bold tracking-wide" >
                    Connect wallet or sign in
                </h1>
                <p className="max-w-xs text-center text-primary-text-muted text-base font-normal mx-auto">
                    In order to see your transfer history you need to connect your wallet or Sign in with your email.
                </p>
            </div>
        </div>
        <div className="flex flex-col items-center w-full space-y-3">
            <ConnectButton className="w-full" side="top">
                <div className="w-full py-2.5 px-3 text-xl font-semibold bg-primary-text-placeholder hover:opacity-90 duration-200 active:opacity-80 transition-opacity rounded-lg text-secondary-950">
                    <div className="text-center text-xl font-semibold">Connect Wallet</div>
                </div>
            </ConnectButton>
            <div className="w-full overflow-hidden">
                <SignIn />
            </div>
        </div>
    </div>
}

const SignIn = () => {

    const { userType } = useAuthState()
    const [showGuestCard, setShowGuestCard] = useState(false)

    if (!(userType && userType != UserType.AuthenticatedUser)) return null

    return <FormWizardProvider initialStep={AuthStep.Email} initialLoading={false} hideMenu noToolBar>
        <TimerProvider>
            {
                showGuestCard ?
                    <div className="animate-fade-in">
                        <GuestCard />
                    </div>
                    :
                    <button onClick={() => setShowGuestCard(true)} className="text-secondary-text w-fit mx-auto flex justify-center mt-2 underline hover:no-underline">
                        <span>Sign in with your email</span>
                    </button>
            }
        </TimerProvider>
    </FormWizardProvider>

}

function resolveDate(dateInput) {
    // Get the current date
    const today = new Date();

    // Calculate the difference in time between the input date and today
    const inputDate = new Date(dateInput);
    const timeDiff = today.getTime() - inputDate.getTime();

    // Convert the time difference from milliseconds to days
    const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24));

    // Format the input date to DD/MM/YYYY
    const formatDate = (date) => {
        const day = ("0" + date.getDate()).slice(-2);
        const month = ("0" + (date.getMonth() + 1)).slice(-2);
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    // Resolve the output based on the difference in days
    switch (dayDiff) {
        case 0:
            return "Today";
        case 1:
            return "Yesterday";
        case 2:
            return "2 days ago";
        case 3:
            return "3 days ago";
        case 4:
            return "4 days ago";
        case 5:
            return "5 days ago";
        case 6:
            return "6 days ago";
        default:
            // If the date is more than 6 days ago, return it in DD/MM/YYYY format
            return formatDate(inputDate);
    }
}

export default HistoryList