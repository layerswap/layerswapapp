import { ChevronUp, Plug, Plus, RefreshCw } from 'lucide-react'
import { FC, ReactElement, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import clsx from "clsx";
import HistorySummary from "./HistorySummary";
import useWallet from "../../hooks/useWallet"
import Link from "next/link"
import Snippet, { HistoryItemSceleton } from "./Snippet"
import { groupBy } from "../utils/groupBy"
import ConnectButton from "../buttons/connectButton"
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
import { shouldDisplay } from "./Filters/filterSwaps";
import type { FilterNetworkOption } from "./Filters/types";
import { SwapResponse } from '@/lib/apiClients/layerSwapApiClient';
import { SwapDataProvider, SwapDataStateContext } from '@/context/swap';
import type { Wallet } from '@/Models/WalletProvider';
import { useSwapTransactionStore } from '@/stores/swapTransactionStore';
import { useManualDestAddressesStore } from '@/stores/manualDestAddressesStore';

type ListProps = {
    statuses?: string | number;
    refreshing?: boolean;
    onNewTransferClick?: () => void
}

const Comp: FC<ListProps> = ({ onNewTransferClick }) => {
    const { networks } = useSettingsState()
    const { wallets } = useWallet()
    const manualDestAddresses = useManualDestAddressesStore(s => s.manualDestAddresses)

    const {
        searchQuery, setSearchQuery,
        walletAddresses, selectedWalletAddrs, toggleWalletAddress,
        networkNames, toggleNetworkName,
        clearFilters,
        filtersActive,
    } = useHistoryFilters({ wallets, manualAddresses: manualDestAddresses })

    const { allAddresses, normalizedByRaw } = useMemo(() => {
        const all = new Set<string>()
        const map = new Map<string, string>()
        for (const w of wallets) {
            const network = networks.find(n => n.chain_id == w.chainId) || null
            for (const addr of w.addresses) {
                const normalized = new Address(addr, network, w.providerName).normalized
                all.add(normalized)
                map.set(addr, normalized)
            }
        }
        for (const m of manualDestAddresses) {
            const normalized = new Address(m.address, null, m.providerName).normalized
            all.add(normalized)
            map.set(m.address, normalized)
        }
        return { allAddresses: Array.from(all), normalizedByRaw: map }
    }, [wallets, networks, manualDestAddresses])

    const effectiveAddresses = useMemo(() => {
        if (!selectedWalletAddrs || selectedWalletAddrs.length === 0) return allAddresses
        const out = new Set<string>()
        for (const a of selectedWalletAddrs) out.add(normalizedByRaw.get(a) ?? a)
        return Array.from(out)
    }, [selectedWalletAddrs, allAddresses, normalizedByRaw])

    const { pendingDeposit, completed, isLoadingAny, isValidatingAny } = useSwapHistoryData(effectiveAddresses, networkNames)
    const search = useSwapByTransactionHash(searchQuery)

    const networkOptions = useMemo<FilterNetworkOption[]>(() =>
        networks
            .map(n => ({ name: n.name, display_name: n.display_name ?? n.name, logo: n.logo ?? '' }))
            .sort((a, b) => a.display_name.localeCompare(b.display_name)),
        [networks]
    )

    const filtersNode = useMemo(() => (
        <Filters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            walletAddresses={walletAddresses}
            toggleWalletAddress={toggleWalletAddress}
            networkNames={networkNames}
            toggleNetworkName={toggleNetworkName}
            wallets={wallets}
            manualAddresses={manualDestAddresses}
            networks={networkOptions}
            onClearAll={clearFilters}
        />
    ), [
        wallets, manualDestAddresses,
        networkOptions,
        searchQuery, setSearchQuery,
        walletAddresses, toggleWalletAddress,
        networkNames, toggleNetworkName,
        clearFilters,
    ])

    const noAccounts = wallets.length === 0 && manualDestAddresses.length === 0

    return (
        <div className="relative flex flex-col h-full min-h-0">
            {filtersNode}
            <div className="flex-1 min-h-0">
                <SwapsList
                    search={search}
                    wallets={wallets}
                    pendingDeposit={pendingDeposit}
                    completed={completed}
                    isLoadingAny={isLoadingAny}
                    isValidatingAny={isValidatingAny}
                    filtersActive={filtersActive}
                    clearFilters={clearFilters}
                    onNewTransferClick={onNewTransferClick}
                    noAccounts={noAccounts}
                />
            </div>
        </div>
    )
}

type SwapHistoryData = ReturnType<typeof useSwapHistoryData>

type SwapsListProps = {
    search: ReturnType<typeof useSwapByTransactionHash>
    wallets: Wallet[]
    pendingDeposit: SwapHistoryData['pendingDeposit']
    completed: SwapHistoryData['completed']
    isLoadingAny: boolean
    isValidatingAny: boolean
    filtersActive: boolean
    clearFilters: () => void
    onNewTransferClick?: () => void
    noAccounts: boolean
}

const SwapsList: FC<SwapsListProps> = ({
    search,
    wallets,
    pendingDeposit,
    completed,
    isLoadingAny,
    isValidatingAny,
    filtersActive,
    clearFilters,
    onNewTransferClick,
    noAccounts,
}) => {
    const [showAll, setShowAll] = useState(false)
    const [expanded, setExpanded] = useState<string | undefined>(undefined)
    const [isScrolling, setIsScrolling] = useState(false)
    const parentRef = useRef<HTMLDivElement>(null)
    const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
    const swapTransactions = useSwapTransactionStore(s => s.swapTransactions)

    const handleScroll = useCallback(() => {
        if (!isScrolling) setIsScrolling(true)
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
        scrollTimeout.current = setTimeout(() => setIsScrolling(false), 1000)
    }, [isScrolling])

    useEffect(() => {
        return () => {
            if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
        }
    }, [])

    const pendingSwaps = useMemo(
        () => pendingDeposit.swaps.filter(s => shouldDisplay(s, swapTransactions)),
        [pendingDeposit.swaps, swapTransactions]
    )
    const filteredCompleted = useMemo(
        () => completed.swaps.filter(s => shouldDisplay(s, swapTransactions)),
        [completed.swaps, swapTransactions]
    )

    const grouppedSwaps = useMemo(() => Object
        .entries(groupBy(filteredCompleted, ({ swap }) => new Date(swap.created_date).toLocaleDateString()))
        .map(([key, values]) => ({ key, values })), [filteredCompleted])

    const flattenedSwaps = useMemo(
        () => grouppedSwaps.flatMap(g => [g.key, ...g.values] as (string | SwapResponse)[]),
        [grouppedSwaps]
    )

    const list = useMemo(
        () => [...(showAll ? pendingSwaps : pendingSwaps.slice(0, 1)), ...flattenedSwaps],
        [showAll, pendingSwaps, flattenedSwaps]
    )

    const hiddenPendingCount = Math.max(0, pendingSwaps.length - 1)
    const pendingHaveMorepages = pendingDeposit.hasMore
    const hasAnySwaps = pendingDeposit.swaps.length + completed.swaps.length > 0

    const rowVirtualizer = useVirtualizer({
        count: list.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 35,
        getItemKey: (index) => {
            const item = list[index]
            if (typeof item === 'string') return `date-${item}`
            return `swap-${String(item?.swap?.id ?? `${item?.swap?.created_date}-${index}`)}`
        },
    })
    const items = rowVirtualizer.getVirtualItems()

    useEffect(() => {
        if (!expanded) return
        const stillPresent = list.some(item =>
            typeof item !== 'string' && String(item?.swap?.id) === expanded
        )
        if (!stillPresent) setExpanded(undefined)
    }, [list, expanded])

    useEffect(() => {
        setExpanded(undefined)
    }, [search.isActive])

    const handleLoadMore = async () => {
        if (completed.hasMore) await completed.loadMore()
    }
    const handleLoadMorePendingSwaps = async () => {
        await pendingDeposit.loadMore()
    }

    if (search.isActive) {
        return <SearchResult isLoading={search.isLoading} swap={search.swap} wallets={wallets} />
    }

    if ((isLoadingAny || isValidatingAny) && list.length === 0) {
        return <Snippet />
    }

    if (!list.length) {
        if (filtersActive && hasAnySwaps) return <NoMatches onClear={clearFilters} />
        if (noAccounts) return <ConnectWalletCard />
        return <BlankHistory onNewTransferClick={onNewTransferClick} />
    }

    return (
        <div
            ref={parentRef}
            onScroll={handleScroll}
            className={clsx('h-full overflow-y-scroll overflow-x-hidden -mr-4 pr-2 scrollbar:w-1.5! scrollbar:h-1.5! scrollbar-thumb:bg-transparent', {
                'styled-scroll': isScrolling,
            })}
        >
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
                            const data = list[virtualRow.index]

                            if (typeof data === 'string') {
                                return (
                                    <div
                                        key={virtualRow.key}
                                        data-index={virtualRow.index}
                                        ref={rowVirtualizer.measureElement}
                                    >
                                        <div className="w-full pb-3 last:mb-0">
                                            {data !== 'Pending' &&
                                                <p className="text-sm text-secondary-text font-normal pl-2">
                                                    <DaysAgo dateInput={data} />
                                                </p>
                                            }
                                        </div>
                                    </div>
                                )
                            }

                            const swap = data
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
                                        <div className="w-full flex justify-center mt-4">
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
    )
}

type HistoryEmptyStateProps = {
    title: string
    description: string
    action?: ReactNode
}

const HistoryEmptyState: FC<HistoryEmptyStateProps> = ({ title, description, action }) => (
    <div className="w-full h-full min-h-[inherit] flex flex-col justify-between items-center space-y-10">
        <div />
        <div className="w-full h-full flex flex-col justify-center items-center">
            <HistoryItemSceleton className="scale-[.63] w-full shadow-card mr-7" />
            <HistoryItemSceleton className="scale-[.63] -mt-12 shadow-card ml-7 w-full" />
            <div className="mt-2 text-center space-y-2">
                <h1 className="text-secondary-text text-[28px] font-bold tracking-wide">{title}</h1>
                <p className="max-w-xs text-center text-primary-text-tertiary text-base font-normal mx-auto">{description}</p>
            </div>
            {action ? <div className="mt-10">{action}</div> : null}
        </div>
    </div>
)

type BlankHistoryProps = {
    onNewTransferClick?: () => void,
}

const BlankHistory = ({ onNewTransferClick }: BlankHistoryProps) => (
    <HistoryEmptyState
        title="No Transfer History"
        description="Transfers you make with this wallet/account will appear here after excution."
        action={
            <Link onClick={onNewTransferClick} href={"/"} className="flex items-center gap-2 text-base text-secondary-text font-normal bg-secondary-500 hover:bg-secondary-400 py-2 px-3 rounded-lg">
                <Plus className="w-4 h-4" />
                <p>New Transfer</p>
            </Link>
        }
    />
)

const ConnectWalletCard = () => (
    <HistoryEmptyState
        title="Connect wallet"
        description="In order to see your transfer history you need to connect your wallet."
        action={
            <ConnectButton>
                <div className="flex items-center gap-2 text-base text-secondary-text font-normal bg-secondary-500 hover:bg-secondary-400 py-2 px-3 rounded-lg">
                    <Plug className="w-4 h-4" />
                    <p>Connect Wallet</p>
                </div>
            </ConnectButton>
        }
    />
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

const HistoryListWrapper = ({ children }: { children: ReactNode }): ReactElement => {
    const context = useContext(SwapDataStateContext)
    if (context) {
        return <>{children}</>
    }
    return (
        <SwapDataProvider>
            {children}
        </SwapDataProvider>
    )
}

const HistoryList = (props: ListProps) => {
    return (
        <HistoryListWrapper>
            <Comp {...props} />
        </HistoryListWrapper>
    )
}


export default HistoryList
