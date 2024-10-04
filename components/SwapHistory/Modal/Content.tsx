import LayerSwapApiClient, { SwapResponse } from "../../../lib/layerSwapApiClient"
import { ApiResponse, EmptyApiResponse } from "../../../Models/ApiResponse"
import { ChevronDown, Plus, RefreshCw } from 'lucide-react'
import Modal from "../../modal/modal"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import Summary from "../Summary";
import useSWRInfinite from 'swr/infinite'
import useWallet from "../../../hooks/useWallet"
import Link from "next/link"
import axios from "axios"
import SwapDetails from "../SwapDetailsComponent"
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

const PAGE_SIZE = 20
type ListProps = {
    statuses?: string | number;
    refreshing: boolean;
    loadExplorerSwaps: boolean;
}

const getSwapsKey = () => (index: number) =>
    `/internal/swaps?page=${index + 1}`

const getExplorerKey = (addresses: string[]) => (index) => {
    if (!addresses?.[index])
        return null;
    return `/explorer/${addresses[index]}`
}

type Swap = SwapResponse & { type: 'user' | 'explorer' }

const List: FC<ListProps> = ({ loadExplorerSwaps }) => {
    const [openSwapDetailsModal, setOpenSwapDetailsModal] = useState(false)
    const [selectedSwap, setSelectedSwap] = useState<Swap | undefined>()
    const [showAll, setShowAll] = useState(false)
    const { wallets } = useWallet()
    const { userId } = useAuthState()
    const addresses = wallets.map(w => w.address)

    const handleopenSwapDetails = (swap: Swap) => {
        setSelectedSwap(swap)
        setOpenSwapDetailsModal(true)
    }

    const getKey = useMemo(() => getSwapsKey(), [])
    const getFromExplorerKey = getExplorerKey(addresses)

    const apiClient = new LayerSwapApiClient()

    const { data: userSwapPages, size, setSize, isLoading: userSwapsLoading, isValidating, mutate } =
        useSWRInfinite<ApiResponse<Swap[]>>(
            getKey,
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

    const handleSWapDetailsShow = useCallback((show: boolean) => {
        setOpenSwapDetailsModal(show)
        if (!show)
            mutate()
    }, [])

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

    const userSwapsisEmpty =
        !userSwapPages
        || (userSwapPages && (userSwapPages?.[0] instanceof EmptyApiResponse))

    const explorerSwapsisEmpty =
        (explorerPages?.[0] instanceof EmptyApiResponse)
        || (!explorerSwapsLoading && !(explorerSwaps?.length >= 1))
        || explorerError

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

    if ((userSwapsLoading || explorerSwapsLoading) && !(Number(userSwaps?.length) > 0)) return <Snippet />
    if (!wallets.length && !userId) return <ConnectOrSignIn />
    if (allEmpty) return <BlankHistory />

    const grouppedSwaps = !allEmpty ?
        Object.entries(
            groupBy(
                userSwaps as Swap[], ({ swap }) => swap.status === SwapStatus.Completed ? new Date(swap.created_date).toLocaleDateString() : 'Pending')).map(([key, values]) => ({ key, values }
                ))
        : null


    return <>
        <div className="h-full space-y-3 pt-3 ">
            {
                grouppedSwaps && <div
                    className="text-sm flex flex-col gap-5 font-medium focus:outline-none h-full"
                >
                    {
                        grouppedSwaps.map(({ key, values }) => {

                            return <div key={key} className="flex flex-col gap-1.5">
                                <div className="w-full">
                                    {
                                        key !== 'Pending' &&
                                        <p className="text-sm text-secondary-text font-normal pl-2">
                                            {resolveDate(key)}
                                        </p>
                                    }
                                    {
                                        key == 'Pending' && values.length > 1 &&
                                        <div className="w-full flex justify-end">
                                            <button onClick={() => setShowAll(!showAll)} className='flex items-center gap-1 text-xs font-normal text-secondary-text pr-2'>
                                                <p>See all</p>
                                                <ChevronDown className={`${showAll && 'rotate-180'} transition-transform duation-200 w-4 h-4`} />
                                            </button>
                                        </div>
                                    }
                                </div>
                                <ResizablePanel className="space-y-3 pb-1">
                                    {
                                        values.filter((v, index) => ((key === 'Pending' && !showAll) ? index == 0 : true))?.map((swap) => {

                                            if (!swap) return <></>

                                            return <div
                                                onClick={() => handleopenSwapDetails(swap)}
                                                key={swap.swap.id}
                                            >
                                                <Summary swapResponse={swap} />
                                            </div>
                                        })
                                    }
                                </ResizablePanel>
                            </div>
                        })
                    }

                    {
                        !isReachingEnd &&
                        <button
                            disabled={isReachingEnd || userSwapsLoading || explorerSwapsLoading || isValidating}
                            type="button"
                            onClick={handleLoadMore}
                            className="text-primary inline-flex gap-1 items-center justify-center disabled:opacity-80"
                        >

                            <RefreshCw className={`w-4 h-4 ${(userSwapsLoading || explorerSwapsLoading || isValidating) && 'animate-spin'}`} />
                            <span>Load more</span>
                        </button>
                    }
                </div>
            }
        </div>
        <Modal
            height="full"
            show={openSwapDetailsModal}
            setShow={handleSWapDetailsShow}
            header='Swap detail'
            modalId="pendingSwapDetails"
        >
            {
                selectedSwap &&
                <SwapDetails swapResponse={selectedSwap} />
            }
        </Modal>
    </>
}

const BlankHistory = () => {

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
            <Link href={"/"} className="mt-10 flex items-center gap-2 text-base text-secondary-text font-normal bg-secondary-500 hover:bg-secondary-600 py-2 px-3 rounded-lg">
                <Plus className="w-4 h-4" />
                <p>New Transfer</p>
            </Link>
        </div>
        <div className="w-full">
            <SignIn />
        </div>
    </div>

}

const ConnectOrSignIn = () => {
    return <div className="w-full h-full min-h-[inherit] flex flex-col justify-between items-center ">
        <div />
        <div className="flex flex-col items-center text-center w-full h-full">
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
            <ConnectButton className="w-full">
                <div className="w-full py-2.5 px-3 text-xl font-semibold bg-primary-text-placeholder hover:opacity-90 duration-200 active:opacity-80 transition-opacity rounded-lg text-secondary-950">
                    <div className="text-center text-xl font-semibold">Connect Wallet</div>
                </div>
            </ConnectButton>
            <SignIn />
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
                    <GuestCard />
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


export default List