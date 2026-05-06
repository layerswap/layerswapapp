import CopyButton from '@/components/buttons/copyButton'
import useCopyClipboard from '@/hooks/useCopyClipboard'
import LayerSwapApiClient, { CreateSwapParams, DepositAction, Refuel, SwapBasicData } from '@/lib/apiClients/layerSwapApiClient'
import { QRCodeSVG } from 'qrcode.react'
import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import useExchangeNetworks from '@/hooks/useExchangeNetworks'
import { Check, ChevronDown, ChevronUp, Clock, Copy, Zap } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Network, NetworkRoute, NetworkRouteToken } from '@/Models/Network'
import SubmitButton from '@/components/buttons/submitButton'
import { Widget } from '@/components/Widget/Index'
import { Partner } from '@/Models/Partner'
import { formatUsd } from '@/components/utils/formatUsdAmount'
import { formatPercent } from '@/components/utils/formatPercent'
import { DetailedQuoteModel, useDetailedQuote } from '@/hooks/useDetailedQuote'
import useDepositAddressSources from '@/hooks/useDepositAddressSources'
import { useSwapDataUpdate } from '@/context/swap'
import { Selector, SelectorContent, SelectorTrigger } from '@/components/Select/Selector/Index'
import { SelectedRouteDisplay } from '@/components/Input/RoutePicker/Routes'
import { Content } from '@/components/Input/RoutePicker/Content'
import { RowElement } from '@/Models/Route'
import { groupRoutes } from '@/hooks/useFormRoutes'
import { useRecentNetworksStore } from '@/stores/recentRoutesStore'
import { useRouteTokenSwitchStore } from '@/stores/routeTokenSwitchStore'
import { useRouteSortingStore } from '@/stores/routeSortingStore'
import useWallet from '@/hooks/useWallet'
import useSuggestionsLimit from '@/hooks/useSuggestionsLimit'

interface Props {
    swapBasicData: SwapBasicData;
    depositActions: DepositAction[] | undefined;
    refuel?: Refuel | undefined
    partner?: Partner;
    type: 'widget' | 'contained',
}


function formatCompletionTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `~${hours}h`;
    if (minutes > 0) return `~${minutes} min`;
    return `~${seconds}s`;
}

function formatFee(percentageFee: number, fixedFeeUsd: number): string {
    const parts: string[] = [];
    const pct = formatPercent(percentageFee);
    if (pct) parts.push(pct);
    if (fixedFeeUsd > 0) parts.push(formatUsd(fixedFeeUsd));
    return parts.join(' + ') || 'Free';
}

function truncateAddress(addr: string, front = 6, back = 6): string {
    if (!addr || addr.length <= front + back + 1) return addr;
    return `${addr.slice(0, front)}…${addr.slice(-back)}`;
}

function formatTokenAmount(value: number): string {
    if (!Number.isFinite(value)) return '';
    if (value === 0) return '0';
    let maximumFractionDigits: number;
    if (value >= 1000) maximumFractionDigits = 0;
    else if (value >= 10) maximumFractionDigits = 2;
    else if (value >= 1) maximumFractionDigits = 4;
    else maximumFractionDigits = 6;
    return value.toLocaleString('en-US', { maximumFractionDigits });
}

function formatTierRange(tier: DetailedQuoteModel, isFirst: boolean, isLast: boolean, symbol: string): string {
    const min = formatTokenAmount(tier.min_amount);
    const max = formatTokenAmount(tier.max_amount);
    if (isFirst) return `Up to ${max} ${symbol}`;
    if (isLast) return `Over ${min} ${symbol}`;
    return `${min} – ${max} ${symbol}`;
}

/** Resolve deposit address for a given network from deposit actions */
function resolveDepositAddress(
    network: Network | undefined,
    depositActions: DepositAction[] | undefined
): string | undefined {
    if (!depositActions || !network) return depositActions?.[0]?.to_address
    const match = depositActions.find(a => a.network?.type === network.type)
    return match?.to_address ?? depositActions[0]?.to_address
}

const ManualWithdraw: FC<Props> = ({ swapBasicData, depositActions, refuel, type }) => {
    const [copied, copy] = useCopyClipboard()
    const { setSwapId } = useSwapDataUpdate()
    const [isCreatingSwap, setIsCreatingSwap] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const { wallets } = useWallet()
    const { suggestionsLimit } = useSuggestionsLimit({ hasWallet: wallets.length > 0 })
    const groupByToken = useRouteTokenSwitchStore((s) => s.showTokens)
    const sortingOption = useRouteSortingStore((s) => s.sortingOption)
    const routesHistory = useRecentNetworksStore(state => state.recentRoutes)

    // For exchange swaps: fetch withdrawal networks from the exchange
    const isExchange = !!swapBasicData?.source_exchange;
    const exchangeNetworkParams = useMemo(() => ({
        fromExchange: swapBasicData?.source_exchange?.name,
        to: swapBasicData?.destination_network?.name,
        toAsset: swapBasicData?.destination_token?.symbol
    }), [swapBasicData]);

    const { networks: exchangeWithdrawalNetworks, isLoading: exchangeSourceNetworksLoading } = useExchangeNetworks(exchangeNetworkParams);

    // For non-exchange swaps: fetch available source networks
    const apiClient = useMemo(() => new LayerSwapApiClient(), []);
    const { data: sourceRoutesData, isLoading: sourceRoutesLoading } = useDepositAddressSources({
        destinationNetwork: swapBasicData?.destination_network?.name,
        destinationToken: swapBasicData?.destination_token?.symbol,
        enabled: !isExchange,
    });

    // Build available source routes
    const availableRoutes: NetworkRoute[] = useMemo(() => {
        if (isExchange) {
            // Group exchange networks into NetworkRoute-like objects
            const byNetwork = new Map<string, NetworkRoute>()
            for (const n of exchangeWithdrawalNetworks ?? []) {
                const existing = byNetwork.get(n.network.name)
                if (existing) {
                    existing.tokens.push(n.token as NetworkRouteToken)
                } else {
                    byNetwork.set(n.network.name, { ...n.network, tokens: [n.token as NetworkRouteToken] } as NetworkRoute)
                }
            }
            return Array.from(byNetwork.values())
        }
        const routes = sourceRoutesData?.data
        if (!routes) return []
        return routes.map(route => ({
            ...route,
            tokens: route.tokens?.filter(t => t.status === 'active') ?? [],
        })).filter(route => route.tokens.length > 0)
    }, [isExchange, exchangeWithdrawalNetworks, sourceRoutesData])

    const isNetworksLoading = isExchange ? exchangeSourceNetworksLoading : sourceRoutesLoading;

    // Track selected network + token
    const [selectedRoute, setSelectedRoute] = useState<{ network: NetworkRoute; token: NetworkRouteToken } | null>(null)

    // Collapsed state for tiered-fee disclosure — always starts collapsed, resets on route change
    const [isFeesExpanded, setIsFeesExpanded] = useState(false)
    useEffect(() => {
        setIsFeesExpanded(false)
    }, [selectedRoute?.network.name, selectedRoute?.token.symbol])

    // Default to first available route/token
    useEffect(() => {
        if (availableRoutes.length > 0 && !selectedRoute) {
            const first = availableRoutes[0]
            const firstToken = first.tokens[0]
            if (firstToken) setSelectedRoute({ network: first, token: firstToken })
        }
    }, [availableRoutes])

    // Create a new swap when the selected source network changes
    const recreateSwap = useCallback(async (network: NetworkRoute, token: NetworkRouteToken) => {
        if (!swapBasicData) return
        setIsCreatingSwap(true)
        try {
            const params: CreateSwapParams = {
                source_network: network.name,
                source_token: token.symbol,
                destination_network: swapBasicData.destination_network.name,
                destination_token: swapBasicData.destination_token.symbol,
                destination_address: swapBasicData.destination_address,
                use_deposit_address: true,
                refuel: !!refuel,
                source_exchange: swapBasicData.source_exchange?.name,
            }
            const response = await apiClient.CreateSwapAsync(params)
            const newSwapId = response?.data?.swap?.id
            if (newSwapId) {
                setSwapId(newSwapId)
            }
        } finally {
            setIsCreatingSwap(false)
        }
    }, [swapBasicData, refuel, apiClient, setSwapId])

    // Build RowElements with groupings, search, and suggestions via shared groupRoutes
    const routeElements: RowElement[] = useMemo(() => {
        return groupRoutes({
            routes: availableRoutes,
            direction: 'from',
            balances: null,
            groupBy: groupByToken ? 'token' : 'network',
            recents: routesHistory,
            balancesLoaded: false,
            search: searchQuery,
            suggestionsLimit,
            sortingOption,
            skipBalanceGate: true,
        })
    }, [availableRoutes, searchQuery, groupByToken, routesHistory, suggestionsLimit, sortingOption])

    const handleRouteSelect = useCallback((route: NetworkRoute, token: NetworkRouteToken) => {
        setSelectedRoute({ network: route, token })
        recreateSwap(route, token)
    }, [recreateSwap])

    // Fetch quote for the selected network
    const { detailedQuotes, isLoading: isQuoteLoading } = useDetailedQuote({
        sourceNetwork: selectedRoute?.network.name,
        sourceToken: selectedRoute?.token.symbol,
        destinationNetwork: swapBasicData?.destination_network?.name,
        destinationToken: swapBasicData?.destination_token?.symbol,
        destinationAddress: swapBasicData?.destination_address,
        refuel: !!refuel,
        useDepositAddress: true,
    })

    const sortedTiers = useMemo(() => {
        if (!detailedQuotes) return []
        return [...detailedQuotes].sort((a, b) => a.min_amount - b.min_amount)
    }, [detailedQuotes])

    const bestQuote = detailedQuotes?.[0]

    const tokenSymbol = selectedRoute?.token.symbol

    const minDepositDisplay = useMemo(() => {
        const min = sortedTiers[0]?.min_amount
        if (!min || !tokenSymbol) return null
        return `${formatTokenAmount(min)} ${tokenSymbol}`
    }, [sortedTiers, tokenSymbol])

    const depositAddress = resolveDepositAddress(selectedRoute?.network, depositActions)

    const handleCopy = () => {
        if (depositAddress) copy(depositAddress)
    }

    const hasMultipleOptions = availableRoutes.length > 1 || availableRoutes.some(r => r.tokens.length > 1)

    return (
        <>
            <Widget.Content>
                <div className='flex flex-col flex-1 h-full min-h-0 w-full'>

                    {isNetworksLoading ? (
                        <div className="space-y-4 animate-pulse">
                            <div className="flex flex-col items-center gap-3 py-4">
                                <div className="h-10 w-10 bg-secondary-400 rounded-full" />
                                <div className="h-6 bg-secondary-400 rounded w-2/3" />
                            </div>
                            <div className="bg-secondary-500 rounded-2xl p-6">
                                <div className="h-40 bg-secondary-400 rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <div className="h-4 bg-secondary-400 rounded w-full" />
                                <div className="h-4 bg-secondary-400 rounded w-3/4" />
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Network & token selector */}
                            <div className="mb-1 px-1">
                                <span className="text-xs text-secondary-text uppercase tracking-wide">Pay from</span>
                            </div>
                            <div className="mb-3">
                                <Selector>
                                    <SelectorTrigger disabled={!hasMultipleOptions} className="py-1.5 px-2 border border-secondary-400/50">
                                        <SelectedRouteDisplay
                                            route={selectedRoute?.network}
                                            token={selectedRoute?.token}
                                            placeholder="Select network"
                                        />
                                    </SelectorTrigger>
                                    <SelectorContent isLoading={isNetworksLoading}>
                                        {({ closeModal }) => (
                                            <Content
                                                onSelect={(r, t) => { handleRouteSelect(r, t); closeModal(); }}
                                                searchQuery={searchQuery}
                                                setSearchQuery={setSearchQuery}
                                                rowElements={routeElements}
                                                direction="from"
                                                selectedRoute={selectedRoute?.network.name}
                                                selectedToken={selectedRoute?.token.symbol}
                                            />
                                        )}
                                    </SelectorContent>
                                </Selector>
                            </div>

                            {/* Address + QR side-by-side */}
                            <div className="bg-secondary-500 rounded-xl mb-3 p-3.5">
                                <div className="flex items-end gap-4 bg-secondary-300 rounded-lg">
                                    {/* Left: full address (wrapping) + minimum */}
                                    <div className="flex-1 min-w-0 flex flex-col gap-1.5 pl-2 pb-1">
                                        {isCreatingSwap || !depositAddress ? (
                                            <span className="inline-block bg-secondary-400 h-5 rounded animate-pulse w-32" />
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleCopy}
                                                aria-label={copied ? 'Copied' : 'Copy deposit address'}
                                                className="group/copy max-w-[170px] cursor-pointer text-left"
                                            >
                                                <span
                                                    className={`font-mono text-xs break-all leading-snug transition-colors ${copied ? 'text-primary-text' : 'text-secondary-text group-hover/copy:text-primary-text'}`}
                                                >
                                                    {depositAddress}
                                                    <span className="inline-flex items-center align-middle ml-1 w-3.5 h-3.5 relative">
                                                        <AnimatePresence mode="wait" initial={false}>
                                                            {copied ? (
                                                                <motion.span
                                                                    key="check"
                                                                    initial={{ scale: 0.6, opacity: 0 }}
                                                                    animate={{ scale: 1, opacity: 1 }}
                                                                    exit={{ scale: 0.6, opacity: 0 }}
                                                                    transition={{ duration: 0.15 }}
                                                                    className="absolute inset-0 inline-flex items-center justify-center"
                                                                >
                                                                    <Check className="h-3.5 w-3.5 text-secondary-text group-hover/copy:text-primary-text transition-colors" />
                                                                </motion.span>
                                                            ) : (
                                                                <motion.span
                                                                    key="copy"
                                                                    initial={{ scale: 0.6, opacity: 0 }}
                                                                    animate={{ scale: 1, opacity: 1 }}
                                                                    exit={{ scale: 0.6, opacity: 0 }}
                                                                    transition={{ duration: 0.15 }}
                                                                    className="absolute inset-0 inline-flex items-center justify-center"
                                                                >
                                                                    <Copy className="h-3.5 w-3.5 text-secondary-text group-hover/copy:text-primary-text transition-colors" />
                                                                </motion.span>
                                                            )}
                                                        </AnimatePresence>
                                                    </span>
                                                </span>
                                            </button>
                                        )}
                                        {minDepositDisplay && depositAddress && !isCreatingSwap && (
                                            <span className="text-base text-primary-text ">
                                                {`Minimum ${minDepositDisplay}`}
                                            </span>
                                        )}
                                    </div>

                                    {/* Right: QR */}
                                    <div className="shrink-0 bg-white p-1.5 rounded-lg border-4 border-secondary-500">
                                        {isCreatingSwap || !depositAddress ? (
                                            <div className="h-[140px] w-[140px] bg-secondary-100 rounded animate-pulse" />
                                        ) : (
                                            <QRCodeSVG
                                                className="rounded"
                                                value={depositAddress}
                                                includeMargin={false}
                                                size={140}
                                                level="H"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Fee + ETA summary — compact for single-tier, expanded table for multi-tier */}
                            <div className="bg-secondary-500 rounded-xl px-3.5 py-3">
                                {isQuoteLoading && !bestQuote ? (
                                    <div className="flex items-center gap-3 animate-pulse">
                                        <div className="h-4 bg-secondary-400 rounded w-24" />
                                        <div className="h-4 bg-secondary-400 rounded w-16" />
                                    </div>
                                ) : sortedTiers.length === 1 ? (
                                    <div className="flex items-center gap-3 text-xs text-secondary-text">
                                        <span className="flex items-center gap-1">
                                            <Zap className="h-3 w-3" />
                                            <span>{formatFee(sortedTiers[0].total_percentage_fee, sortedTiers[0].total_fixed_fee_in_usd)}</span>
                                        </span>
                                        {bestQuote && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                <span>{formatCompletionTime(bestQuote.avg_completion_milliseconds)}</span>
                                            </span>
                                        )}
                                    </div>
                                ) : sortedTiers.length > 1 && tokenSymbol ? (
                                    isFeesExpanded ? (
                                        <div className="flex flex-col gap-2 text-xs">
                                            <div className="flex items-center justify-between text-secondary-text">
                                                <span className="flex items-center gap-1">
                                                    <Zap className="h-3 w-3" />
                                                    <span>{"Fees by amount"}</span>
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsFeesExpanded(false)}
                                                    className="inline-flex items-center hover:text-primary-text transition-colors"
                                                    aria-label="Hide fee tiers"
                                                >
                                                    <ChevronUp className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <div className="flex flex-col gap-0.5 border-t border-secondary-400/40 pt-2 pl-4">
                                                {sortedTiers.map((tier, idx) => {
                                                    const range = formatTierRange(
                                                        tier,
                                                        idx === 0,
                                                        idx === sortedTiers.length - 1,
                                                        tokenSymbol
                                                    )
                                                    const fee = formatFee(tier.total_percentage_fee, tier.total_fixed_fee_in_usd)
                                                    return (
                                                        <div
                                                            key={`${tier.min_amount}-${tier.max_amount}`}
                                                            className="flex items-center justify-between gap-4 text-xs"
                                                        >
                                                            <span className="text-secondary-text">{range}</span>
                                                            <span className="flex items-center gap-3">
                                                                <span className="text-primary-text">{fee}</span>
                                                                <span className="tabular-nums min-w-14 text-right text-secondary-text/80">
                                                                    {formatCompletionTime(tier.avg_completion_milliseconds)}
                                                                </span>
                                                            </span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-1.5 text-xs text-secondary-text">
                                            <div className="flex items-center gap-3">
                                                <span className="flex items-center gap-1 min-w-0">
                                                    <Zap className="h-3 w-3 shrink-0" />
                                                    <span className="text-primary-text">{formatFee(sortedTiers[0].total_percentage_fee, sortedTiers[0].total_fixed_fee_in_usd)}</span>
                                                    <span className="truncate">{`· ${formatTierRange(sortedTiers[0], true, false, tokenSymbol)}`}</span>
                                                </span>
                                                <span className="flex items-center gap-1 ml-auto shrink-0">
                                                    <Clock className="h-3 w-3" />
                                                    <span>{formatCompletionTime(sortedTiers[0].avg_completion_milliseconds)}</span>
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setIsFeesExpanded(true)}
                                                className="flex items-center justify-between w-full hover:text-primary-text transition-colors border-t border-secondary-400/40 pt-2 mt-0.5 rounded-t-none"
                                                aria-label="Show fee for larger sends"
                                            >
                                                <span>{`${formatFee(sortedTiers[1].total_percentage_fee, sortedTiers[1].total_fixed_fee_in_usd)} for larger sends`}</span>
                                                <ChevronDown className="h-4 w-4 shrink-0" />
                                            </button>
                                        </div>
                                    )
                                ) : null}
                            </div>
                        </>
                    )}
                </div>
            </Widget.Content>
            <Widget.Footer sticky={type == 'widget'}>
                <SubmitButton onClick={handleCopy}>
                    {copied ? 'Copied!' : 'Copy deposit address'}
                </SubmitButton>
            </Widget.Footer>

        </>
    )
}

export default ManualWithdraw
