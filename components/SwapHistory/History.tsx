import { ChevronUp, Plus, RefreshCw } from 'lucide-react'
import { FC, useMemo, useState } from "react"
import HistorySummary from "./HistorySummary";
import useWallet from "../../hooks/useWallet"
import Link from "next/link"
import Snippet, { HistoryItemSceleton } from "./Snippet"
import { groupBy } from "../utils/groupBy"
import ConnectButton from "../buttons/connectButton"
import React from "react"
import { useVirtualizer } from '../../lib/virtual'
import SwapDetails from "./SwapDetailsComponent"
import { Address } from "../../lib/address";
import { useSettingsState } from "../../context/settings";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../shadcn/accordion";
import { useSwapHistoryData } from "../../hooks/useSwapHistoryData";
import { useHistoryFilters } from "../../hooks/useHistoryFilters";
import { useSwapByTransactionHash } from "../../hooks/useSwapByTransactionHash";
import Filters from "./Filters";
import NoMatches from "./Filters/NoMatches";
import SearchResult from "./Filters/SearchResult";
import { matchesFilters, isIncomplete } from "./Filters/filterSwaps";
import type { FilterNetworkOption } from "./Filters/types";
import { SwapResponse } from '@/lib/apiClients/layerSwapApiClient';

type ListProps = {
    statuses?: string | number;
    refreshing?: boolean;
    onNewTransferClick?: () => void
}

type Swap = SwapResponse & { type: 'user' | 'explorer' }

const HistoryList: FC<ListProps> = ({ onNewTransferClick }) => {
    const { networks } = useSettingsState()
    const { wallets } = useWallet()

    const [showAll, setShowAll] = useState(false)
    const [expanded, setExpanded] = useState<string | undefined>(undefined)

    const {
        searchQuery, setSearchQuery,
        walletInternalIds, toggleWalletInternalId,
        networkNames, toggleNetworkName,
        hideIncomplete, setHideIncomplete,
        clearFilters,
        filterOpts, filtersActive,
    } = useHistoryFilters({ wallets })

    const addresses = useMemo(() => wallets.map(w => {
        const network = networks.find(n => n.chain_id == w.chainId)
        return new Address(w.address, network || null, w.providerName).normalized
    }), [wallets, networks])

    const { pendingDeposit, completed, isLoadingAny, isValidatingAny } = useSwapHistoryData(addresses)
    const search = useSwapByTransactionHash(searchQuery)

    const filteredPendingRaw = useMemo(
        () => pendingDeposit.swaps.filter(s => matchesFilters(s, filterOpts)),
        [pendingDeposit.swaps, filterOpts]
    )
    const filteredPending = useMemo(
        () => hideIncomplete ? [] : filteredPendingRaw,
        [hideIncomplete, filteredPendingRaw]
    )
    const filteredCompleted = useMemo(
        () => completed.swaps.filter(s => {
            if (hideIncomplete && isIncomplete(s)) return false
            return matchesFilters(s, filterOpts)
        }),
        [completed.swaps, filterOpts, hideIncomplete]
    )

    const networkOptions = useMemo<FilterNetworkOption[]>(() =>
        networks
            .map(n => ({ name: n.name, display_name: n.display_name ?? n.name, logo: n.logo ?? '' }))
            .sort((a, b) => a.display_name.localeCompare(b.display_name)),
        [networks]
    )

    const hasPending = pendingDeposit.swaps.length > 0

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
                filteredCompleted as Swap[], ({ swap }) => new Date(swap.created_date).toLocaleDateString()
            ))
        .map(([key, values]) => ({ key, values })), [filteredCompleted])

    const pendingSwaps = filteredPending

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

    const hasAnySwaps = pendingDeposit.swaps.length + completed.swaps.length > 0

    const filtersNode = useMemo(() => wallets.length > 0 ? (
        <Filters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            walletInternalIds={walletInternalIds}
            toggleWalletInternalId={toggleWalletInternalId}
            networkNames={networkNames}
            toggleNetworkName={toggleNetworkName}
            hideIncomplete={hideIncomplete}
            setHideIncomplete={setHideIncomplete}
            wallets={wallets}
            networks={networkOptions}
            hasPending={hasPending}
            onClearAll={clearFilters}
        />
    ) : null, [
        wallets, networkOptions, hasPending,
        searchQuery, setSearchQuery,
        walletInternalIds, toggleWalletInternalId,
        networkNames, toggleNetworkName,
        hideIncomplete, setHideIncomplete,
        clearFilters,
    ])

    if (!wallets.length) return <ConnectWalletCard />

    if (search.isActive) {
        return (
            <div className="relative">
                {filtersNode}
                <SearchResult isLoading={search.isLoading} swap={search.swap} wallets={wallets} />
            </div>
        )
    }

    if ((isLoadingAny && !(Number(completed.swaps?.length) > 0))) return <Snippet />
    if (!list.length) {
        return (
            <div className="relative">
                {filtersNode}
                {filtersActive && hasAnySwaps
                    ? <NoMatches onClear={clearFilters} />
                    : <BlankHistory onNewTransferClick={onNewTransferClick} />}
            </div>
        )
    }

    return (
        <div className="relative">
            {filtersNode}
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
                                                        <ChevronUp className="transition-transform duration-200 w-6 h-6" />
                                                    ) : (
                                                        <span className="select-none">+{hiddenPendingCount} more</span>
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

const BlankHistory = ({ onNewTransferClick }: BlankHistoryProps) => (
    <div className="w-full h-full min-h-[inherit] flex flex-col justify-between items-center space-y-10">
        <div />
        <div className="w-full h-full flex flex-col justify-center items-center ">
            <HistoryItemSceleton className="scale-[.63] w-full shadow-card mr-7" />
            <HistoryItemSceleton className="scale-[.63] -mt-12 shadow-card ml-7 w-full" />
            <div className="mt-2 text-center space-y-2">
                <h1 className="text-secondary-text text-[28px] font-bold tracking-wide">
                    No Transfer History
                </h1>
                <p className="max-w-xs text-center text-primary-text-tertiary text-base font-normal mx-auto">
                    Transfers you make with this wallet/account will appear here after excution.
                </p>
            </div>
            <Link onClick={onNewTransferClick} href={"/"} className="mt-10 flex items-center gap-2 text-base text-secondary-text font-normal bg-secondary-500 hover:bg-secondary-400 py-2 px-3 rounded-lg">
                <Plus className="w-4 h-4" />
                <p>New Transfer</p>
            </Link>
        </div>
    </div>
)

const ConnectWalletCard = () => (
    <div className="w-full h-full flex flex-col justify-between items-center space-y-10">
        <div className="flex flex-col items-center justify-center text-center w-full h-full">
            <HistoryItemSceleton className="scale-[.63] w-full shadow-card mr-7" />
            <HistoryItemSceleton className="scale-[.63] -mt-12 shadow-card ml-7 w-full" />
            <div className="mt-4 text-center space-y-3">
                <h1 className="text-secondary-text text-[28px] font-bold tracking-wide">
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
)

type DaysAgoProps = {
    dateInput: string
}
function DaysAgo({ dateInput }: DaysAgoProps) {
    const today = new Date();
    const inputDate = new Date(dateInput);
    const timeDiff = today.getTime() - inputDate.getTime();
    const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24));

    switch (dayDiff) {
        case 0: return "Today";
        case 1: return "Yesterday";
        case 2: return "2 days ago";
        case 3: return "3 days ago";
        case 4: return "4 days ago";
        case 5: return "5 days ago";
        case 6: return "6 days ago";
        default:
            return dateInput;
    }
}

export default HistoryList
