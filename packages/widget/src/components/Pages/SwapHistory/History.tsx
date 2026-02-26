import { ChevronUp, Plus, RefreshCw } from 'lucide-react'
import { FC, useMemo, useState } from "react"
import HistorySummary from "./HistorySummary";
import useWallet from "@/hooks/useWallet"
import Snippet, { HistoryItemSceleton } from "./Snippet"
import { groupBy } from "@/components/utils/groupBy"
import ConnectButton from "@/components/Buttons/connectButton"
import React from "react"
import { useVirtualizer } from '@/lib/virtual'
import SwapDetails from "./SwapDetailsComponent"
import { useSettingsState } from "@/context/settings";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/shadcn/accordion";
import { useSwapHistoryData } from "@/hooks/useSwapHistoryData";
import { Address } from "@/lib/address/Address";

type ListProps = {
    statuses?: string | number;
    refreshing?: boolean;
    onNewTransferClick?: () => void
}

type Swap = any & { type: 'user' | 'explorer' }

const HistoryList: FC<ListProps> = ({ onNewTransferClick }) => {
    const { networks } = useSettingsState()
    const [showAll, setShowAll] = useState(false)
    const { wallets } = useWallet()

    const [expanded, setExpanded] = useState<string | undefined>(undefined)

    const addresses = useMemo(() => wallets.map(w => {
        const network = networks.find(n => n.chain_id == w.chainId)
        return new Address(w.address, network || null, w.providerName).normalized
    }), [wallets, networks])

    const { pendingDeposit, completed, isLoadingAny, isValidatingAny } = useSwapHistoryData(addresses)

    const handleLoadMore = async () => {
        if (completed.hasMore) await completed.loadMore()
    }
    const handleLoadMorePendingSwaps = async () => {
        await pendingDeposit.loadMore()
    }

    const parentRef = React.useRef(null)

    const grouppedSwaps = useMemo(() => Object
        .entries(
            groupBy(
                completed.swaps as Swap[], ({ swap }) => new Date(swap.created_date).toLocaleDateString()
            ))
        .map(([key, values]) => ({ key, values })), [completed])

    const pendingSwaps = useMemo(() => pendingDeposit.swaps || [], [pendingDeposit.swaps])

    const pendingHaveMorepages = pendingDeposit.hasMore;
    const hiddenPendingCount = useMemo(() => Math.max(0, pendingSwaps.length - 1), [pendingSwaps])

    const flattenedSwaps = useMemo(() => grouppedSwaps?.flatMap(g => {
        return [g.key, ...g.values]
    }), [grouppedSwaps])

    const list = useMemo(() => [
        ...(showAll ? pendingSwaps : (pendingSwaps.slice(0, 1))),
        ...flattenedSwaps
    ], [showAll, pendingSwaps, flattenedSwaps])

    const rowVirtualizer = useVirtualizer({
        count: (list?.length || 0),
        getScrollElement: () => parentRef.current,
        estimateSize: () => 35,
    })

    const items = rowVirtualizer.getVirtualItems()
    if ((isLoadingAny && !(Number(completed.swaps?.length) > 0))) return <Snippet />
    if (!wallets.length) return <ConnectWalletCard />
    if (!list.length) return <BlankHistory onNewTransferClick={onNewTransferClick} />

    return (
        <div className="relative">
            <div ref={parentRef}>
                <div
                    style={{
                        height: rowVirtualizer.getTotalSize(),
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            transform: `translateY(${items[0]?.start ? (items[0]?.start - 0) : 0}px)`,
                        }}
                    >
                        <Accordion
                            type="single"
                            collapsible
                            value={expanded}
                            onValueChange={(v: string | undefined) => setExpanded(v)}
                            className="w-full"
                        >
                            {items.map((virtualRow) => {
                                const data = list?.[virtualRow.index]

                                if (typeof data === 'string') {
                                    return (
                                        <div
                                            key={virtualRow.key}
                                            data-index={virtualRow.index}
                                            ref={rowVirtualizer.measureElement}
                                            className=""
                                        >
                                            <div className="w-full pb-3 mt-6 last:mb-0">
                                                {data !== 'Pending' &&
                                                    <p className="text-sm text-secondary-text font-normal pl-2">
                                                        <DaysAgo dateInput={data} />
                                                    </p>
                                                }
                                            </div>
                                        </div>
                                    )
                                }

                                const swap = data as Swap | undefined

                                if (!swap) return <></>

                                const swapId = String(swap?.swap?.id ?? `${swap?.swap?.created_date}-${virtualRow.index}`)

                                const pendingSwapsLength = showAll ? pendingSwaps.length : Math.min(1, pendingSwaps.length)
                                const endOfPendingSwaps = virtualRow.index === (pendingSwapsLength - 1)
                                const shouldShowToggleButton = hiddenPendingCount > 0 && endOfPendingSwaps

                                return (
                                    <div
                                        key={virtualRow.key}
                                        data-index={virtualRow.index}
                                        ref={rowVirtualizer.measureElement}
                                        className="mb-3 last:mb-0"
                                    >
                                        <AccordionItem value={swapId} className="border-none bg-secondary-500 rounded-3xl">
                                            <AccordionTrigger className={`mb-3 last:mb-0 rounded-3xl transition-shadow ${expanded === swapId ? 'shadow-accordion-open' : ''}`}>
                                                <div className="cursor-pointer">
                                                    <HistorySummary swapResponse={swap} wallets={wallets} />
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="-mt-3">
                                                <div className="flex items-center justify-center px-4 pt-3 pb-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpanded(undefined)}
                                                        className="inline-flex items-center gap-1 leading-5 text-sm text-secondary-text hover:text-primary-text transition-colors"
                                                    >
                                                        <span>Hide details</span>
                                                        <ChevronUp className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="px-4 pb-2">
                                                    <SwapDetails swapResponse={swap} />
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>

                                        {shouldShowToggleButton && (
                                            <div className="w-full flex justify-center my-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAll(!showAll)}
                                                    className="flex items-center gap-1 text-sm font-normal text-secondary-text hover:text-primary-text px-3 py-1 rounded-lg bg-secondary-400"
                                                >
                                                    {showAll ? (
                                                        <>
                                                            <ChevronUp className="transition-transform duration-200 w-6 h-6" />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="select-none">+{hiddenPendingCount} more</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}

                                        {pendingHaveMorepages && virtualRow.index === pendingSwaps.length - 1 &&
                                            <button
                                                disabled={pendingDeposit.isLoading || pendingDeposit.isValidating}
                                                type="button"
                                                onClick={handleLoadMorePendingSwaps}
                                                className="text-primary inline-flex gap-1 items-center justify-center disabled:opacity-80 m-auto w-full"
                                            >
                                                <RefreshCw className={`w-4 h-4 ${(pendingDeposit.isLoading || pendingDeposit.isValidating) && 'animate-spin'}`} />
                                                <span>Load more pending swaps</span>
                                            </button>
                                        }
                                        {virtualRow.index === list.length - 1 && completed.hasMore &&
                                            <button
                                                disabled={isLoadingAny || isValidatingAny}
                                                type="button"
                                                onClick={handleLoadMore}
                                                className="text-primary inline-flex gap-1 items-center justify-center disabled:opacity-80 m-auto w-full py-4"
                                            >
                                                <RefreshCw className={`w-4 h-4 ${(isLoadingAny || isValidatingAny) && 'animate-spin'}`} />
                                                <span>Load more</span>
                                            </button>
                                        }
                                    </div>
                                )
                            })}
                        </Accordion>
                    </div>
                </div>
            </div>
        </div>
    )
}

type BlankHistoryProps = {
    onNewTransferClick?: () => void,
}

const BlankHistory = ({ onNewTransferClick }: BlankHistoryProps) => {

    return <div className="w-full h-full min-h-[inherit] flex flex-col justify-between items-center space-y-10">
        <div />
        <div className="w-full h-full flex flex-col justify-center items-center ">
            <HistoryItemSceleton className="scale-[.63] w-full shadow-card mr-7" />
            <HistoryItemSceleton className="scale-[.63] -mt-12 shadow-card ml-7 w-full" />
            <div className="mt-2 text-center space-y-2">
                <h1 className="text-secondary-text text-[28px] font-bold tracking-wide" >
                    No Transfer History
                </h1>
                <p className="max-w-xs text-center text-primary-text-tertiary text-base font-normal mx-auto">
                    Transfers you make with this wallet/account will appear here after excution.
                </p>
            </div>
            <button type='button' onClick={onNewTransferClick} className="mt-10 flex items-center gap-2 text-base text-secondary-text font-normal bg-secondary-500 hover:bg-secondary-400 py-2 px-3 rounded-lg">
                <Plus className="w-4 h-4" />
                <p>New Transfer</p>
            </button>

        </div>
    </div>

}

const ConnectWalletCard = () => {
    return <div className="w-full h-full flex flex-col justify-between items-center space-y-10">
        <div className="flex flex-col items-center justify-center text-center w-full h-full">
            <HistoryItemSceleton className="scale-[.63] w-full shadow-card mr-7" />
            <HistoryItemSceleton className="scale-[.63] -mt-12 shadow-card ml-7 w-full" />
            <div className="mt-4 text-center space-y-3">
                <h1 className="text-secondary-text text-[28px] font-bold tracking-wide" >
                    Connect wallet
                </h1>
                <p className="max-w-xs text-center text-primary-text-tertiary text-base font-normal mx-auto">
                    In order to see your transfer history you need to connect your wallet.
                </p>
            </div>
        </div>
        <div className="flex flex-col items-center w-full space-y-3">
            <ConnectButton className="w-full">
                <div className="w-full py-2.5 px-3 text-xl font-semibold bg-primary-text-tertiary hover:opacity-90 duration-200 active:opacity-80 transition-opacity rounded-lg text-secondary-900">
                    <div className="text-center text-xl font-semibold">Connect Wallet</div>
                </div>
            </ConnectButton>
        </div>
    </div>
}

type DaysAgoProps = {
    dateInput: string
}
function DaysAgo({ dateInput }: DaysAgoProps) {
    // Get the current date
    const today = new Date();

    // Calculate the difference in time between the input date and today
    const inputDate = new Date(dateInput);
    const timeDiff = today.getTime() - inputDate.getTime();

    // Convert the time difference from milliseconds to days
    const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24));

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
            return dateInput;
    }
}

export default HistoryList