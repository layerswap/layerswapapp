import CopyButton from '@/components/buttons/copyButton'
import { ImageWithFallback } from '@/components/Common/ImageWithFallback'
import { Address } from "@/lib/address";
import useCopyClipboard from '@/hooks/useCopyClipboard'
import LayerSwapApiClient, { CreateSwapParams, DepositAction, Refuel, SwapBasicData } from '@/lib/apiClients/layerSwapApiClient'
import { QRCodeSVG } from 'qrcode.react'
import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import useExchangeNetworks from '@/hooks/useExchangeNetworks'
import { Clock, Zap } from 'lucide-react'
import { Network, NetworkRoute, NetworkRouteToken } from '@/Models/Network'
import SubmitButton from '@/components/buttons/submitButton'
import { Widget } from '@/components/Widget/Index'
import { Partner } from '@/Models/Partner'
import { formatUsd } from '@/components/utils/formatUsdAmount'
import useSWR from 'swr'
import { ApiResponse } from '@/Models/ApiResponse'
import { DetailedQuoteModel, useDetailedQuote } from '@/hooks/useDetailedQuote'
import { useSwapDataUpdate } from '@/context/swap'
import { Selector, SelectorContent, SelectorTrigger } from '@/components/Select/Selector/Index'
import { SelectedRouteDisplay } from '@/components/Input/RoutePicker/Routes'
import { Content } from '@/components/Input/RoutePicker/Content'
import { RowElement } from '@/Models/Route'

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
    if (percentageFee > 0) parts.push(`${percentageFee.toFixed(2)}%`);
    if (fixedFeeUsd > 0) parts.push(formatUsd(fixedFeeUsd));
    return parts.join(' + ') || 'Free';
}

function formatFeeRange(tiers: DetailedQuoteModel[]): string {
    if (tiers.length === 0) return ''
    if (tiers.length === 1) return formatFee(tiers[0].total_percentage_fee, tiers[0].total_fixed_fee_in_usd)

    const fees = tiers.map(t => ({
        percentage: t.total_percentage_fee,
        fixed: t.total_fixed_fee_in_usd,
    }))

    const minPercentage = Math.min(...fees.map(f => f.percentage))
    const maxPercentage = Math.max(...fees.map(f => f.percentage))
    const minFixed = Math.min(...fees.map(f => f.fixed))
    const maxFixed = Math.max(...fees.map(f => f.fixed))

    const minFee = formatFee(minPercentage, minFixed)
    const maxFee = formatFee(maxPercentage, maxFixed)

    if (minFee === maxFee) return minFee
    return `${minFee} to ${maxFee}`
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
            include_swaps: 'true',
            include_unavailable: 'false',
        });
        return `/sources?${params.toString()}`;
    }, [isExchange, swapBasicData?.destination_network?.name, swapBasicData?.destination_token?.symbol]);

    const { data: sourceRoutesData, isLoading: sourceRoutesLoading } = useSWR<ApiResponse<NetworkRoute[]>>(
        sourcesUrl,
        apiClient.fetcher,
        { dedupingInterval: 10000, keepPreviousData: true }
    );

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

    const currentTokenSymbol = swapBasicData?.source_token?.symbol;

    // Track selected network + token
    const [selectedRoute, setSelectedRoute] = useState<{ network: NetworkRoute; token: NetworkRouteToken } | null>(null)

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

    // Build RowElements with network groupings for the route picker
    const routeElements: RowElement[] = useMemo(() => {
        return availableRoutes.map((route): RowElement => ({
            type: 'network',
            route,
        }))
    }, [availableRoutes])

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

                            {/* Network picker + QR + address */}
                            <div className="bg-secondary-500 rounded-xl overflow-hidden mb-3">
                                {/* Network & token selector */}
                                <div className="px-3.5 py-2.5">
                                    <Selector>
                                        <SelectorTrigger disabled={!hasMultipleOptions} className="py-1.5 px-2">
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

                                {/* Divider */}
                                <div className="mx-3.5 border-t border-secondary-400/50" />

                                {/* QR Code */}
                                <div className="flex justify-center py-2.5">
                                    <div className="bg-white p-2 rounded-xl">
                                        {isCreatingSwap || !depositAddress ? (
                                            <div className="h-[140px] w-[140px] bg-secondary-100 rounded-lg animate-pulse" />
                                        ) : (
                                            <QRCodeSVG
                                                className="rounded-lg"
                                                value={depositAddress}
                                                includeMargin={false}
                                                size={140}
                                                level="H"
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="mx-3.5 border-t border-secondary-400/50" />

                                {/* Address */}
                                <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                                    {isCreatingSwap || !depositAddress ? (
                                        <span className="inline-block w-full bg-secondary-400 h-5 rounded animate-pulse" />
                                    ) : (
                                        <>
                                            <span className="text-sm font-mono text-primary-text truncate">
                                                {new Address(depositAddress, selectedRoute?.network!).toShortString()}
                                            </span>
                                            <CopyButton toCopy={depositAddress} className='flex shrink-0' />
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Aggregated fee summary */}
                            <div className="bg-secondary-500 rounded-xl px-3.5 py-3">
                                {isQuoteLoading && !bestQuote ? (
                                    <div className="flex items-center gap-3 animate-pulse">
                                        <div className="h-4 bg-secondary-400 rounded w-24" />
                                        <div className="h-4 bg-secondary-400 rounded w-16" />
                                    </div>
                                ) : sortedTiers.length > 0 ? (
                                    <div className="flex items-center gap-3 text-xs text-secondary-text">
                                        <span className="flex items-center gap-1">
                                            <Zap className="h-3 w-3" />
                                            {formatFeeRange(sortedTiers)}
                                        </span>
                                        {bestQuote && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {formatCompletionTime(bestQuote.avg_completion_milliseconds)}
                                            </span>
                                        )}
                                    </div>
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
