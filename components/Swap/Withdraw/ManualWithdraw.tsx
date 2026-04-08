import CopyButton from '@/components/buttons/copyButton'
import { ImageWithFallback } from '@/components/Common/ImageWithFallback'
import { Address } from "@/lib/address";
import useCopyClipboard from '@/hooks/useCopyClipboard'
import LayerSwapApiClient, { CreateSwapParams, DepositAction, Refuel, SwapBasicData } from '@/lib/apiClients/layerSwapApiClient'
import { QRCodeSVG } from 'qrcode.react'
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useExchangeNetworks from '@/hooks/useExchangeNetworks'
import { ChevronDown, Clock, Zap } from 'lucide-react'
import VaulDrawer from '@/components/modal/vaulModal'
import { Network, NetworkRoute, NetworkType, Token } from '@/Models/Network'
import SubmitButton from '@/components/buttons/submitButton'
import { Widget } from '@/components/Widget/Index'
import { Partner } from '@/Models/Partner'
import { formatUsd } from '@/components/utils/formatUsdAmount'
import useSWR from 'swr'
import { ApiResponse } from '@/Models/ApiResponse'
import { DetailedQuoteModel, useDetailedQuote } from '@/hooks/useDetailedQuote'
import { useSwapDataUpdate } from '@/context/swap'

interface Props {
    swapBasicData: SwapBasicData;
    depositActions: DepositAction[] | undefined;
    refuel?: Refuel | undefined
    partner?: Partner;
    type: 'widget' | 'contained',
}

/** Human-friendly labels for network types */
const NETWORK_TYPE_LABELS: Record<string, string> = {
    [NetworkType.EVM]: 'EVM Networks',
    [NetworkType.Starknet]: 'Starknet',
    [NetworkType.Solana]: 'Solana',
    [NetworkType.Cosmos]: 'Cosmos',
    [NetworkType.StarkEx]: 'StarkEx',
    [NetworkType.ZkSyncLite]: 'zkSync Lite',
    [NetworkType.TON]: 'TON',
    [NetworkType.Fuel]: 'Fuel',
    [NetworkType.Bitcoin]: 'Bitcoin',
}

type NetworkOption = { network: Network; token: Token }

/** Data for one network-type address group */
type AddressGroup = {
    type: NetworkType
    label: string
    depositAddress: string | undefined
    networks: NetworkOption[]
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
    if (percentageFee > 0) parts.push(`${percentageFee.toFixed(2)}%`);
    if (fixedFeeUsd > 0) parts.push(formatUsd(fixedFeeUsd));
    return parts.join(' + ') || 'Free';
}

/** Build address groups from network options and deposit actions (no quotes needed) */
function buildAddressGroups(
    networkOptions: NetworkOption[],
    depositActions: DepositAction[] | undefined
): AddressGroup[] {
    const addressByType = new Map<NetworkType, string>()
    if (depositActions) {
        for (const action of depositActions) {
            if (action.to_address && action.network?.type) {
                addressByType.set(action.network.type, action.to_address)
            }
        }
    }

    const byType = new Map<NetworkType, NetworkOption[]>()
    for (const opt of networkOptions) {
        const existing = byType.get(opt.network.type) ?? []
        existing.push(opt)
        byType.set(opt.network.type, existing)
    }

    const groups: AddressGroup[] = []
    for (const [type, networks] of byType) {
        groups.push({
            type,
            label: NETWORK_TYPE_LABELS[type] || type,
            depositAddress: addressByType.get(type) || depositActions?.[0]?.to_address,
            networks,
        })
    }

    return groups
}

const ManualWithdraw: FC<Props> = ({ swapBasicData, depositActions, refuel, type }) => {
    const [copied, copy] = useCopyClipboard()
    const { setSwapId } = useSwapDataUpdate()
    const [isCreatingSwap, setIsCreatingSwap] = useState(false)

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
    const sourcesUrl = useMemo(() => {
        if (isExchange || !swapBasicData?.destination_network?.name || !swapBasicData?.destination_token?.symbol) return null;
        const params = new URLSearchParams({
            destination_network: swapBasicData.destination_network.name,
            destination_token: swapBasicData.destination_token.symbol,
            include_unmatched: 'false',
            include_swaps: 'false',
            include_unavailable: 'false',
        });
        return `/sources?${params.toString()}`;
    }, [isExchange, swapBasicData?.destination_network?.name, swapBasicData?.destination_token?.symbol]);

    const { data: sourceRoutesData, isLoading: sourceRoutesLoading } = useSWR<ApiResponse<NetworkRoute[]>>(
        sourcesUrl,
        apiClient.fetcher,
        { dedupingInterval: 10000, keepPreviousData: true }
    );

    // Build unified list of selectable networks
    const networkOptions = useMemo(() => {
        if (isExchange) {
            return exchangeWithdrawalNetworks?.map(n => ({ network: n.network, token: n.token })) ?? [];
        }
        const routes = sourceRoutesData?.data;
        if (!routes) return [];
        return routes
            .filter(route => route.deposit_methods?.includes('deposit_address'))
            .flatMap(route =>
                route.tokens
                    ?.filter(t => t.status === 'active')
                    .map(token => ({ network: route as Network, token: token as Token })) ?? []
            );
    }, [isExchange, exchangeWithdrawalNetworks, sourceRoutesData]);

    const isNetworksLoading = isExchange ? exchangeSourceNetworksLoading : sourceRoutesLoading;

    const currentTokenSymbol = swapBasicData?.source_token?.symbol;

    // Build address groups from networkOptions (renders immediately, no quotes needed)
    const addressGroups = useMemo(
        () => buildAddressGroups(networkOptions, depositActions),
        [networkOptions, depositActions]
    )

    const hasMultipleTypes = addressGroups.length > 1

    // Track selected group and selected network within group
    const [selectedGroupIndex, setSelectedGroupIndex] = useState(0)
    const selectedGroup = addressGroups[selectedGroupIndex]
    const [selectedNetworkIndex, setSelectedNetworkIndex] = useState(0)
    const selectedNetwork = selectedGroup?.networks[selectedNetworkIndex]

    // Reset selections when groups change
    useEffect(() => {
        setSelectedGroupIndex(0)
        setSelectedNetworkIndex(0)
    }, [addressGroups.length])

    // Create a new swap when the selected source network changes
    const recreateSwap = useCallback(async (source: NetworkOption) => {
        if (!swapBasicData) return
        setIsCreatingSwap(true)
        try {
            const params: CreateSwapParams = {
                source_network: source.network.name,
                source_token: source.token.symbol,
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

    const handleGroupChange = useCallback((index: number) => {
        setSelectedGroupIndex(index)
        setSelectedNetworkIndex(0)
        const group = addressGroups[index]
        const firstNetwork = group?.networks[0]
        if (firstNetwork) {
            recreateSwap(firstNetwork)
        }
    }, [addressGroups, recreateSwap])

    const handleNetworkChange = useCallback((index: number) => {
        setSelectedNetworkIndex(index)
        const network = selectedGroup?.networks[index]
        if (network) {
            recreateSwap(network)
        }
    }, [selectedGroup, recreateSwap])

    // Fetch quote ONLY for the selected network
    const { detailedQuotes, isLoading: isQuoteLoading } = useDetailedQuote({
        sourceNetwork: selectedNetwork?.network.name,
        sourceToken: selectedNetwork?.token.symbol,
        destinationNetwork: swapBasicData?.destination_network?.name,
        destinationToken: swapBasicData?.destination_token?.symbol,
        destinationAddress: swapBasicData?.destination_address,
        refuel: !!refuel,
        useDepositAddress: true,
    })

    const selectedQuoteTiers = useMemo(() => {
        if (!detailedQuotes) return []
        return [...detailedQuotes].sort((a, b) => a.min_amount - b.min_amount)
    }, [detailedQuotes])

    const bestQuote = detailedQuotes?.[0]

    // For single-type fallback, use existing behavior
    const singleTypeAddress = depositActions?.[0]?.to_address
    const currentNetworkLogo = swapBasicData?.source_network?.logo

    const handleCopy = (address?: string) => {
        const addr = address || singleTypeAddress
        if (addr) copy(addr)
    }

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
                    ) : hasMultipleTypes ? (
                        <>
                            {/* Header */}
                            <div className="flex flex-col items-center text-center pt-1 pb-2">
                                <div className="relative mb-2">
                                    <div className="h-8 w-8 rounded-full overflow-hidden">
                                        <ImageWithFallback
                                            src={swapBasicData?.source_token?.logo}
                                            alt={currentTokenSymbol || ''}
                                            height="32"
                                            width="32"
                                            loading="eager"
                                            className="object-contain"
                                        />
                                    </div>
                                </div>
                                <h2 className="text-base font-semibold text-primary-text">
                                    Send {currentTokenSymbol}
                                </h2>
                            </div>

                            <DropdownLayout
                                groups={addressGroups}
                                selectedGroupIndex={selectedGroupIndex}
                                onGroupChange={handleGroupChange}
                                selectedNetworkIndex={selectedNetworkIndex}
                                onNetworkChange={handleNetworkChange}
                                isCreatingSwap={isCreatingSwap}
                                destinationTokenSymbol={swapBasicData?.destination_token?.symbol || ''}
                                quoteTiers={selectedQuoteTiers}
                                bestQuote={bestQuote}
                                isQuoteLoading={isQuoteLoading}
                            />
                        </>
                    ) : (
                        <>
                            {/* Single type: original layout */}
                            <div className="flex flex-col items-center text-center pt-1 pb-4">
                                <div className="relative mb-3">
                                    <div className="h-10 w-10 rounded-full overflow-hidden">
                                        <ImageWithFallback
                                            src={swapBasicData?.source_token?.logo}
                                            alt={currentTokenSymbol || ''}
                                            height="40"
                                            width="40"
                                            loading="eager"
                                            className="object-contain"
                                        />
                                    </div>
                                </div>
                                <h2 className="text-lg font-semibold text-primary-text">
                                    Send {currentTokenSymbol}
                                </h2>
                                <p className="text-xs text-secondary-text mt-1">
                                    From any supported network to this address
                                </p>
                            </div>

                            <div className="flex justify-center pb-4">
                                <div className="bg-white p-3 rounded-2xl">
                                    {isCreatingSwap || !singleTypeAddress ? (
                                        <div className="h-[160px] w-[160px] bg-secondary-100 rounded-lg animate-pulse" />
                                    ) : (
                                        <QRCodeSVG
                                            className="rounded-lg"
                                            value={singleTypeAddress}
                                            includeMargin={false}
                                            size={160}
                                            level="H"
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2 pb-3">
                                <span className="text-xs text-secondary-text uppercase tracking-wide px-1">
                                    Deposit Address
                                </span>
                                <div className="bg-secondary-500 rounded-xl px-3.5 py-3 flex items-center justify-between gap-2">
                                    {isCreatingSwap || !singleTypeAddress ? (
                                        <span className="inline-block w-full bg-secondary-400 h-5 rounded animate-pulse" />
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2 min-w-0">
                                                <ImageWithFallback
                                                    src={currentNetworkLogo}
                                                    alt="Network"
                                                    height="16"
                                                    width="16"
                                                    loading="eager"
                                                    className="rounded-sm object-contain shrink-0"
                                                />
                                                <span className="text-sm font-mono text-primary-text truncate">
                                                    {new Address(singleTypeAddress, swapBasicData?.source_network).toShortString()}
                                                </span>
                                            </div>
                                            <CopyButton toCopy={singleTypeAddress} className='flex shrink-0' />
                                        </>
                                    )}
                                </div>
                            </div>

                            <NetworkFeeList
                                networks={selectedGroup?.networks ?? []}
                                selectedIndex={selectedNetworkIndex}
                                onNetworkChange={handleNetworkChange}
                                destinationTokenSymbol={swapBasicData?.destination_token?.symbol || ''}
                                quoteTiers={selectedQuoteTiers}
                                bestQuote={bestQuote}
                                isQuoteLoading={isQuoteLoading}
                            />
                        </>
                    )}
                </div>
            </Widget.Content>
            <Widget.Footer sticky={type == 'widget'}>
                <SubmitButton onClick={() => handleCopy()}>
                    {copied ? 'Copied!' : 'Copy deposit address'}
                </SubmitButton>
            </Widget.Footer>
        </>
    )
}

// ─── Dropdown Layout ─────────────────────────────────────────────────────────

const DropdownLayout: FC<{
    groups: AddressGroup[]
    selectedGroupIndex: number
    onGroupChange: (index: number) => void
    selectedNetworkIndex: number
    onNetworkChange: (index: number) => void
    isCreatingSwap: boolean
    destinationTokenSymbol: string
    quoteTiers: DetailedQuoteModel[]
    bestQuote: DetailedQuoteModel | undefined
    isQuoteLoading: boolean
}> = ({ groups, selectedGroupIndex, onGroupChange, selectedNetworkIndex, onNetworkChange, isCreatingSwap, destinationTokenSymbol, quoteTiers, bestQuote, isQuoteLoading }) => {
    const [pickerOpen, setPickerOpen] = useState(false)
    const selected = groups[selectedGroupIndex]

    if (!selected) return null

    const firstNetwork = selected.networks[0]?.network
    const previewNetworks = selected.networks.slice(0, 3)

    return (
        <>
            {/* Grouped: network picker + QR + address */}
            <div className="bg-secondary-500 rounded-xl overflow-hidden mb-3">
                {/* Network type selector */}
                <button
                    onClick={() => setPickerOpen(true)}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-secondary-400/30 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        {selected.networks.length > 1 ? (
                            <div className="flex items-center -space-x-1.5 shrink-0">
                                {previewNetworks.map((item) => (
                                    <div
                                        key={item.network.name}
                                        className="h-5 w-5 rounded-full ring-2 ring-secondary-500 overflow-hidden bg-secondary-400 shrink-0"
                                    >
                                        {item.network.logo && (
                                            <ImageWithFallback
                                                src={item.network.logo}
                                                alt={item.network.display_name}
                                                height="20"
                                                width="20"
                                                loading="eager"
                                                className="object-contain"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : firstNetwork?.logo ? (
                            <div className="h-5 w-5 shrink-0 rounded-md overflow-hidden">
                                <ImageWithFallback
                                    src={firstNetwork.logo}
                                    alt={selected.label}
                                    height="20"
                                    width="20"
                                    loading="eager"
                                    className="object-contain"
                                />
                            </div>
                        ) : null}
                        <span className="text-sm font-medium text-primary-text">
                            {selected.label}
                        </span>
                        {selected.networks.length > 1 && (
                            <span className="text-[10px] text-secondary-text bg-secondary-400 px-1.5 py-0.5 rounded-full">
                                {selected.networks.length}
                            </span>
                        )}
                    </div>
                    <ChevronDown className="h-4 w-4 text-secondary-text" />
                </button>

                {/* Divider */}
                <div className="mx-3.5 border-t border-secondary-400/50" />

                {/* QR Code */}
                <div className="flex justify-center py-2.5">
                    <div className="bg-white p-2 rounded-xl">
                        {isCreatingSwap || !selected.depositAddress ? (
                            <div className="h-[110px] w-[110px] bg-secondary-100 rounded-lg animate-pulse" />
                        ) : (
                            <QRCodeSVG
                                className="rounded-lg"
                                value={selected.depositAddress}
                                includeMargin={false}
                                size={110}
                                level="H"
                            />
                        )}
                    </div>
                </div>

                {/* Divider */}
                <div className="mx-3.5 border-t border-secondary-400/50" />

                {/* Address */}
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                    {isCreatingSwap || !selected.depositAddress ? (
                        <span className="inline-block w-full bg-secondary-400 h-5 rounded animate-pulse" />
                    ) : (
                        <>
                            <span className="text-sm font-mono text-primary-text truncate">
                                {new Address(selected.depositAddress, firstNetwork).toShortString()}
                            </span>
                            <CopyButton toCopy={selected.depositAddress} className='flex shrink-0' />
                        </>
                    )}
                </div>
            </div>

            {/* Fee list for selected type */}
            <NetworkFeeList
                networks={selected.networks}
                selectedIndex={selectedNetworkIndex}
                onNetworkChange={onNetworkChange}
                destinationTokenSymbol={destinationTokenSymbol}
                quoteTiers={quoteTiers}
                bestQuote={bestQuote}
                isQuoteLoading={isQuoteLoading}
            />

            {/* Network type picker modal */}
            <VaulDrawer
                show={pickerOpen}
                setShow={setPickerOpen}
                header="Select network type"
                modalId="network-type-select"
                mode="fitHeight"
            >
                <div className="space-y-1">
                    {groups.map((group, i) => {
                        const isSelected = i === selectedGroupIndex
                        const groupPreview = group.networks.slice(0, 3)
                        const singleNetwork = group.networks[0]?.network
                        return (
                            <button
                                key={group.type}
                                onClick={() => {
                                    onGroupChange(i)
                                    setPickerOpen(false)
                                }}
                                className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-colors ${
                                    isSelected
                                        ? 'bg-secondary-500 ring-1 ring-secondary-200'
                                        : 'hover:bg-secondary-500/50'
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    {group.networks.length > 1 ? (
                                        <div className="flex items-center -space-x-2 shrink-0">
                                            {groupPreview.map((item) => (
                                                <div
                                                    key={item.network.name}
                                                    className="h-7 w-7 rounded-full ring-2 ring-secondary-500 overflow-hidden bg-secondary-400 shrink-0"
                                                >
                                                    {item.network.logo && (
                                                        <ImageWithFallback
                                                            src={item.network.logo}
                                                            alt={item.network.display_name}
                                                            height="28"
                                                            width="28"
                                                            loading="eager"
                                                            className="object-contain"
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-8 w-8 shrink-0 rounded-lg overflow-hidden bg-secondary-400">
                                            {singleNetwork?.logo && (
                                                <ImageWithFallback
                                                    src={singleNetwork.logo}
                                                    alt={group.label}
                                                    height="32"
                                                    width="32"
                                                    loading="eager"
                                                    className="object-contain"
                                                />
                                            )}
                                        </div>
                                    )}
                                    <div className="text-left">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-medium text-primary-text">
                                                {group.label}
                                            </span>
                                            {group.networks.length > 1 && (
                                                <span className="text-[10px] text-secondary-text">
                                                    {group.networks.length} networks
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {isSelected && (
                                    <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                )}
                            </button>
                        )
                    })}
                </div>
            </VaulDrawer>
        </>
    )
}

// ─── Shared: NetworkFeeList + AmountSlider (unchanged) ───────────────────────

const MAX_VISIBLE_ICONS = 4

/** Find which tier a given amount falls into */
function findTierForAmount(tiers: DetailedQuoteModel[], amount: number): DetailedQuoteModel {
    for (const tier of tiers) {
        if (amount >= tier.min_amount && amount <= tier.max_amount) return tier
    }
    return tiers[tiers.length - 1]
}

/** Calculate fee in source token for a given amount in a tier */
function calculateFee(tier: DetailedQuoteModel, amount: number): number {
    return amount * (tier.total_percentage_fee / 100) + tier.total_fixed_fee_in_source
}

/** Full precision amount with locale grouping (e.g. 1,823,456.78) */
function formatAmount(value: number, decimals: number = 2): string {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value)
}

/** Compact amount for range labels (e.g. 44.1K, 3.0M) */
function formatCompactAmount(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
    if (value >= 10_000) return `${(value / 1_000).toFixed(0)}K`
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
    if (value >= 1) return value.toFixed(2)
    return value.toPrecision(3)
}

const AmountSlider: FC<{
    tiers: DetailedQuoteModel[]
    tokenSymbol: string
    destinationTokenSymbol: string
    onTierChange?: (tier: DetailedQuoteModel) => void
}> = ({ tiers, tokenSymbol, destinationTokenSymbol, onTierChange }) => {
    const trackRef = useRef<HTMLDivElement>(null)

    const globalMin = tiers[0].min_amount
    const globalMax = tiers[tiers.length - 1].max_amount

    const [amount, setAmount] = useState(() => {
        // Start at 25% of the range for a reasonable default
        return globalMin + (globalMax - globalMin) * 0.25
    })

    // Build segment edges: [globalMin, bp1, bp2, ..., globalMax]
    // Each segment gets equal visual space on the track (piecewise-linear)
    const edges = useMemo(() => {
        const e = [globalMin]
        for (let i = 1; i < tiers.length; i++) {
            e.push(tiers[i].min_amount)
        }
        e.push(globalMax)
        return e
    }, [tiers, globalMin, globalMax])

    // Breakpoints: inner edges only (for markers)
    const breakpoints = useMemo(() => edges.slice(1, -1), [edges])

    const segmentCount = edges.length - 1

    const activeTier = useMemo(() => findTierForAmount(tiers, amount), [tiers, amount])
    const fee = useMemo(() => calculateFee(activeTier, amount), [activeTier, amount])
    const receiveAmount = useMemo(() => Math.max(0, amount - fee), [amount, fee])
    const decimals = useMemo(() => {
        const smaller = Math.min(amount, receiveAmount)
        if (smaller >= 1000) return 2
        if (smaller >= 1) return 4
        return 6
    }, [amount, receiveAmount])

    useEffect(() => {
        onTierChange?.(activeTier)
    }, [activeTier])

    // Each segment gets a guaranteed minimum visual share (20%) so that
    // breakpoints near the min aren't invisible. The rest is proportional.
    const segWidths = useMemo(() => {
        const MIN_SHARE = 0.20
        const totalRange = globalMax - globalMin
        const reserved = MIN_SHARE * segmentCount
        const remaining = Math.max(0, 1 - reserved)

        return Array.from({ length: segmentCount }, (_, i) => {
            const segRange = edges[i + 1] - edges[i]
            const proportional = totalRange > 0 ? (segRange / totalRange) * remaining : 0
            return MIN_SHARE + proportional
        })
    }, [edges, segmentCount, globalMin, globalMax])

    // Cumulative starts for each segment
    const segStarts = useMemo(() => {
        const starts = [0]
        for (let i = 0; i < segWidths.length; i++) {
            starts.push(starts[i] + segWidths[i])
        }
        return starts
    }, [segWidths])

    const toPosition = useCallback((val: number) => {
        for (let i = 0; i < segmentCount; i++) {
            const lo = edges[i], hi = edges[i + 1]
            if (val <= hi) {
                const t = hi === lo ? 0 : (val - lo) / (hi - lo)
                return segStarts[i] + t * segWidths[i]
            }
        }
        return 1
    }, [edges, segmentCount, segStarts, segWidths])

    const fromPosition = useCallback((pos: number) => {
        const clamped = Math.max(0, Math.min(1, pos))
        let segIndex = 0
        for (let i = 0; i < segmentCount; i++) {
            if (clamped <= segStarts[i + 1]) { segIndex = i; break }
            segIndex = i
        }
        const t = segWidths[segIndex] === 0 ? 0 : (clamped - segStarts[segIndex]) / segWidths[segIndex]
        const lo = edges[segIndex], hi = edges[segIndex + 1]
        return lo + t * (hi - lo)
    }, [edges, segmentCount, segStarts, segWidths])

    const sliderPosition = toPosition(amount)

    const handlePointerEvent = useCallback((clientX: number) => {
        const track = trackRef.current
        if (!track) return
        const rect = track.getBoundingClientRect()
        const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
        setAmount(fromPosition(pos))
    }, [fromPosition])

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        e.preventDefault()
        const el = e.currentTarget as HTMLElement
        el.setPointerCapture(e.pointerId)
        handlePointerEvent(e.clientX)
    }, [handlePointerEvent])

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (e.buttons === 0) return
        handlePointerEvent(e.clientX)
    }, [handlePointerEvent])

    if (tiers.length <= 1 && globalMin === globalMax) return null

    return (
        <div className="space-y-3 pt-1">
            {/* Amount & receive display */}
            <div className="flex items-baseline justify-between px-0.5">
                <div>
                    <span className="text-xs text-secondary-text">Send </span>
                    <span className="text-sm font-medium text-primary-text">
                        {formatAmount(amount, decimals)} {tokenSymbol}
                    </span>
                </div>
                <div>
                    <span className="text-xs text-secondary-text">Receive </span>
                    <span className="text-sm font-medium text-primary-text">
                        ~{formatAmount(receiveAmount, decimals)} {destinationTokenSymbol}
                    </span>
                </div>
            </div>

            {/* Custom slider track */}
            <div
                ref={trackRef}
                className="relative h-8 flex items-center cursor-pointer touch-none select-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
            >
                {/* Track background */}
                <div className="absolute inset-x-0 h-1 rounded-full bg-secondary-400" />


                {/* Breakpoint markers */}
                {breakpoints.map((bp, i) => {
                    const pos = toPosition(bp)
                    return (
                        <div
                            key={i}
                            className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center"
                            style={{ left: `${pos * 100}%` }}
                        >
                            <div className="h-2.5 w-0.5 rounded-full bg-secondary-300" />
                        </div>
                    )
                })}

                {/* Thumb */}
                <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-primary shadow-sm shadow-primary/25 transition-shadow hover:shadow-md hover:shadow-primary/30"
                    style={{ left: `${sliderPosition * 100}%` }}
                />
            </div>

            {/* Range labels with breakpoint amounts */}
            <div className="relative h-4 text-[10px] text-secondary-text">
                <span className="absolute left-0">{formatCompactAmount(globalMin)}</span>
                {breakpoints.map((bp, i) => (
                    <span
                        key={i}
                        className="absolute -translate-x-1/2"
                        style={{ left: `${toPosition(bp) * 100}%` }}
                    >
                        {formatCompactAmount(bp)}
                    </span>
                ))}
                <span className="absolute right-0">{formatCompactAmount(globalMax)}</span>
            </div>
        </div>
    )
}

const NetworkFeeList: FC<{
    networks: NetworkOption[]
    selectedIndex: number
    onNetworkChange: (index: number) => void
    destinationTokenSymbol: string
    quoteTiers: DetailedQuoteModel[]
    bestQuote: DetailedQuoteModel | undefined
    isQuoteLoading: boolean
}> = ({ networks, selectedIndex, onNetworkChange, destinationTokenSymbol, quoteTiers, bestQuote, isQuoteLoading }) => {
    const [modalOpen, setModalOpen] = useState(false)
    const [activeTier, setActiveTier] = useState<DetailedQuoteModel | null>(null)
    const selected = networks[selectedIndex]

    // Reset active tier when network changes
    useEffect(() => {
        setActiveTier(null)
    }, [selectedIndex])

    if (!selected) return null

    const others = networks.filter((_, i) => i !== selectedIndex)
    const visibleOthers = others.slice(0, MAX_VISIBLE_ICONS)
    const extraCount = others.length - visibleOthers.length

    const hasTiers = quoteTiers.length > 0
    const displayTier = activeTier ?? bestQuote

    return (
        <>
            <div className="bg-secondary-500 rounded-xl px-3.5 py-3 space-y-2.5">
                {/* Selected network + avatar stack trigger */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="h-5 w-5 shrink-0">
                            {selected.network.logo && (
                                <ImageWithFallback
                                    src={selected.network.logo}
                                    alt={selected.network.display_name}
                                    height="20"
                                    width="20"
                                    loading="eager"
                                    className="rounded-md object-contain"
                                />
                            )}
                        </div>
                        <span className="text-sm font-medium text-primary-text truncate">
                            via {selected.network.display_name}
                        </span>
                    </div>

                    {others.length > 0 && (
                        <button
                            onClick={() => setModalOpen(true)}
                            className="flex items-center -space-x-1.5 hover:opacity-80 transition-opacity"
                        >
                            {visibleOthers.map((item) => (
                                <div
                                    key={`${item.network.name}-${item.token.symbol}`}
                                    className="h-5 w-5 rounded-full ring-2 ring-secondary-500 overflow-hidden bg-secondary-400 shrink-0"
                                >
                                    {item.network.logo && (
                                        <ImageWithFallback
                                            src={item.network.logo}
                                            alt={item.network.display_name}
                                            height="20"
                                            width="20"
                                            loading="eager"
                                            className="object-contain"
                                        />
                                    )}
                                </div>
                            ))}
                            <div className="h-5 w-5 rounded-full ring-2 ring-secondary-500 bg-secondary-300 flex items-center justify-center shrink-0">
                                <span className="text-[9px] font-semibold text-secondary-text">
                                    {extraCount > 0 ? `+${extraCount + 1}` : '+'}
                                </span>
                            </div>
                        </button>
                    )}
                </div>

                {/* Fee summary row */}
                {isQuoteLoading && !displayTier ? (
                    <div className="flex items-center gap-3 animate-pulse">
                        <div className="h-4 bg-secondary-400 rounded w-20" />
                        <div className="h-4 bg-secondary-400 rounded w-16" />
                    </div>
                ) : displayTier ? (
                    <div className="flex items-center gap-3 text-xs text-secondary-text">
                        <span className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            {formatFee(displayTier.total_percentage_fee, displayTier.total_fixed_fee_in_usd)}
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatCompletionTime(displayTier.avg_completion_milliseconds)}
                        </span>
                    </div>
                ) : null}

                {/* Amount slider for fee tiers */}
                {hasTiers && (
                    <AmountSlider
                        tiers={quoteTiers}
                        tokenSymbol={selected.token.symbol}
                        destinationTokenSymbol={destinationTokenSymbol}
                        onTierChange={setActiveTier}
                    />
                )}

                {/* Slider skeleton while loading */}
                {isQuoteLoading && !hasTiers && (
                    <div className="space-y-2 animate-pulse">
                        <div className="flex justify-between">
                            <div className="h-4 bg-secondary-400 rounded w-24" />
                            <div className="h-4 bg-secondary-400 rounded w-24" />
                        </div>
                        <div className="h-1 bg-secondary-400 rounded-full" />
                    </div>
                )}
            </div>

            {/* Network selection modal */}
            <VaulDrawer
                show={modalOpen}
                setShow={setModalOpen}
                header="Select network"
                modalId="network-fee-select"
                mode="fitHeight"
            >
                <div className="space-y-1">
                    {networks.map((item, i) => {
                        const isSelected = i === selectedIndex
                        return (
                            <button
                                key={`${item.network.name}-${item.token.symbol}`}
                                onClick={() => {
                                    onNetworkChange(i)
                                    setModalOpen(false)
                                }}
                                className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-colors ${
                                    isSelected
                                        ? 'bg-secondary-500 ring-1 ring-secondary-200'
                                        : 'hover:bg-secondary-500/50'
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="h-8 w-8 shrink-0 rounded-lg overflow-hidden bg-secondary-400">
                                        {item.network.logo && (
                                            <ImageWithFallback
                                                src={item.network.logo}
                                                alt={item.network.display_name}
                                                height="32"
                                                width="32"
                                                loading="eager"
                                                className="object-contain"
                                            />
                                        )}
                                    </div>
                                    <span className="text-sm font-medium text-primary-text">
                                        {item.network.display_name}
                                    </span>
                                </div>
                                {isSelected && (
                                    <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                )}
                            </button>
                        )
                    })}
                </div>
            </VaulDrawer>
        </>
    )
}

export default ManualWithdraw
