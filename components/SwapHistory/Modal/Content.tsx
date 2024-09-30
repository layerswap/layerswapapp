import LayerSwapApiClient, { SwapResponse } from "../../../lib/layerSwapApiClient"
import { ApiResponse, EmptyApiResponse } from "../../../Models/ApiResponse"
import { Eye, EyeOff, Plus, RefreshCw } from 'lucide-react'
import Modal from "../../modal/modal"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
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
    statuses?: string | number;
    refreshing: boolean;
    loadExplorerSwaps: boolean;
}

const getSwapsKey = () => (index: number, include_expired: boolean) =>
    `/internal/swaps?page=${index + 1}&include_expired=${include_expired}`

const getExplorerKey = (addresses: string[]) => (index) => {
    if (!addresses?.[index])
        return null;
    return `/explorer/${addresses[index]}`
}

type Swap = SwapResponse & { type: 'user' | 'explorer' }

const List: FC<ListProps> = ({ refreshing, loadExplorerSwaps }) => {
    const [openSwapDetailsModal, setOpenSwapDetailsModal] = useState(false)
    const [selectedSwap, setSelectedSwap] = useState<Swap | undefined>()
    const [showIncompleteSwaps, setShowIncompleteSwaps] = useState(false)
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
            (index) => getKey(index, showIncompleteSwaps),
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
        return p?.data?.filter(s => !showIncompleteSwaps ? s.swap.status === 'completed' : true)
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

    const swapsGrouppedByDate = !allEmpty ? Object.entries(groupBy(userSwaps as Swap[], ({ swap }) => new Date(swap.created_date).toLocaleDateString())).map(([date, values]) => ({ date, values })) : null

    return <>
        <AnimatePresence >
            <div className="h-full space-y-3 mt-3 ">
                <button onClick={() => setShowIncompleteSwaps(!showIncompleteSwaps)} className="text-secondary-text px-2 py-1.5 bg-secondary-700 hover:bg-secondary-600 hover:text-primary-text rounded-md justify-start items-center gap-1.5 inline-flex">
                    {
                        showIncompleteSwaps ?
                            <Eye className="w-4 h-4 relative" />
                            :
                            <EyeOff className="w-4 h-4 relative" />
                    }
                    <div className="text-sm font-normal">Incomplete swaps</div>
                </button>
                {
                    swapsGrouppedByDate && <motion.div
                        variants={container}
                        initial="initial"
                        animate={refreshing ? "loading" : "highlight"}
                        exit={"initial"}
                        className="text-sm flex flex-col gap-5 font-medium focus:outline-none overflow-y-auto styled-scroll max-h-[83vh] sm:max-h-[550px]"
                    >
                        {
                            swapsGrouppedByDate.map(({ date, values }) => {

                                return <div key={date} className="flex flex-col gap-1.5">
                                    <motion.p variants={item as any} className="text-sm text-secondary-text font-normal pl-2">
                                        {resolveDate(date)}
                                    </motion.p>
                                    <div className="space-y-3">
                                        {
                                            values?.map((swap) => {

                                                if (!swap) return <></>

                                                return <motion.div
                                                    onClick={() => handleopenSwapDetails(swap)}
                                                    key={swap.swap.id}
                                                    variants={item as any}
                                                >
                                                    <Summary swapResponse={swap} />
                                                </motion.div>
                                            })
                                        }
                                    </div>
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
                    </motion.div>
                }
            </div>
        </AnimatePresence>
        <Modal
            height="90%"
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