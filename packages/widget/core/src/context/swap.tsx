import { SwapStatus, type Refuel, type Wallet } from '@layerswap/widget-types';
import { Context, useCallback, useEffect, useState, createContext, useContext, useMemo, useRef } from 'react'
import LayerSwapApiClient, { BackendTransactionStatus, CreateSwapParams, TransactionStatus, WithdrawType, GaslessAuthorizationResult, SwapResponse, DepositAction, SwapBasicData, SwapQuote, SwapDetails, TransactionType } from '@/lib/apiClients/layerSwapApiClient';
import { InitialSettings } from '@/Models/InitialSettings';
import useSWR, { KeyedMutator } from 'swr';
import type { ApiResponse } from '@layerswap/widget-types';
import { Partner } from '@/Models/Partner';
import type { ApiError } from '@layerswap/widget-types';
import useWallet from '@/hooks/useWallet';
import { Network } from '@layerswap/widget-types';
import { useSettingsState } from './settings';
import { QuoteError, transformSwapDataToQuoteArgs, useQuoteData } from '@/hooks/useFee';
import { useRecentNetworksStore } from '@/stores/recentRoutesStore';
import { useSelectedAccount } from './swapAccounts';
import { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues';
import { useInitialSettings } from './settings';
import { useSlippageStore } from '@/stores/slippageStore';
import { useCallbacks } from './callbackProvider';
import { Address } from '@/lib/address/Address';
import { useDepositSignatureStore, useSwapTransactionStore } from '@/stores/swapTransactionStore';
import { isDepositWorkflowComplete } from '@/helpers/depositActions';
import { ResolvedSwapStatus, resolveSwapPhase } from '@/components/utils/resolveSwapPhase';
import { useDepositSettings } from './depositSettings';
import { useGaslessAuthorization } from '@/hooks/useGaslessAuthorization';
import { useGaslessAuthorizationStatus } from '@/hooks/useGaslessAuthorizationStatus';
import { useContractAddressStore } from '@/stores/contractAddressStore';
import { useExtendedSwapData } from '@/hooks/useExtendedSwapDisplay';
import { useGaslessPreferenceStore } from '@/stores/gaslessPreferenceStore';
import { isGaslessCapableRoute } from '@/helpers/gasless';
import { shouldUseDepository } from '@/helpers/depository';
import { resolveExtendedRoutePlan } from '@/lib/extendedRoutes/registry';
import { buildCreateSwapParamsForExtendedRoute } from '@/lib/extendedRoutes/transforms';
import { useExtendedRoutesStore } from '@/stores/extendedRoutesStore';
import { isDepositAddressFlow, isDepositAddressSwap, wantsFrontendSwap } from '@/helpers/swapFlow';
import { useSwapPolling } from '@/hooks/useSwapPolling';
import { useSwapStatusNotification } from '@/hooks/useSwapStatusNotification';
import { lifecycleContextFromForm } from '@/lib/swapLifecycle';
import { createSwapAttempt } from '@/lib/swapCreation';
import { useAtomicBatchTracking } from '@/hooks/useAtomicBatchTracking';
import { useAtomicBatchStore, getAtomicBatch, supportsWebLocks, type AtomicBatchRecord } from '@/stores/atomicBatchStore';
import { isAtomicBatchEligible } from '@/helpers/atomicBatch';
import { resolverService } from '@/lib/resolvers/resolverService';
import { useClientLayoutEffect } from '@/hooks/useClientLayoutEffect';
import { useAtomicBatchCapability } from '@/hooks/useAtomicBatchCapability';

export const SwapDataStateContext = createContext<SwapContextData | null>(null);

export const SwapDataUpdateContext = createContext<UpdateSwapInterface | null>(null);

export type ApprovalTransaction = {
    swapId: string
    sourceAddress: string
    network: string
    hash: string
}

export type UpdateSwapInterface = {
    createSwap: (values: SwapFormValues, query: InitialSettings, partner?: Partner) => Promise<SwapResponse>,
    setQuoteLoading: (value: boolean) => void;
    mutateSwap: KeyedMutator<ApiResponse<SwapResponse>>
    mutateDepositActions: KeyedMutator<ApiResponse<DepositAction[]>>
    setWalletActionExecuting: (value: boolean) => void
    setSwapViewMounted: (value: boolean) => void
    setDepositAddressIsFromAccount: (value: boolean) => void,
    setWithdrawType: (value: WithdrawType) => void
    setSwapId: (value: string | undefined) => void
    markWalletExecutionStarted: (swapId: string) => void
    startFreshSwapAttempt: () => void
    watchApprovalTransaction: (transaction: ApprovalTransaction) => () => void
    setSwapDataFromQuery?: (swapData: SwapResponse | undefined) => void,
    setSubmitedFormValues: (values: NonNullable<SwapFormValues>) => void,
    setSwapModalOpen: (value: boolean) => void
}

export type SwapContextData = {
    atomicBatch?: AtomicBatchRecord,
    gaslessAuthorization?: GaslessAuthorizationResult,
    inputTransactionStatus?: { hash: string; status: TransactionStatus },
    atomicBatchSupported?: boolean,
    swapApiError?: ApiError,
    swapDetailsError?: string,
    depositAddressIsFromAccount?: boolean,
    depositActionsResponse?: DepositAction[],
    depositActionsError?: string,
    approvalTransaction?: ApprovalTransaction & { status?: string },
    withdrawType: WithdrawType | undefined,
    swapBasicData: SwapBasicData & { refuel: boolean } | undefined,
    quote: SwapQuote | undefined,
    quoteIsLoading: boolean,
    quoteError: QuoteError | undefined,
    refuel: Refuel | undefined,
    swapDetails: SwapDetails | undefined,
    swapId: string | undefined,
    walletExecutionStarted: boolean,
    swapModalOpen: boolean,
    // The single resolved swap status every reader renders and reports from (phase,
    // step statuses, client-detected input failures). Computed once here so no reader can
    // diverge by feeding the resolver private inputs.
    resolved: ResolvedSwapStatus,
    swapError?: string | null | undefined,
    setSwapError?: (value: string | null) => void
}

export function SwapDataProvider({ children, initialSwapData }: { children: React.ReactNode, initialSwapData?: SwapResponse | null }) {
    const initialSettings = useInitialSettings()
    const { onSwapCreate, onSwapLifecycle } = useCallbacks()
    const [swapBasicFormData, setSwapBasicFormData] = useState<SwapBasicData & { refuel: boolean }>()

    const [quoteIsLoading, setQuoteLoading] = useState<boolean>(false)
    const [withdrawType, setWithdrawType] = useState<WithdrawType>()
    const [depositAddressIsFromAccount, setDepositAddressIsFromAccount] = useState<boolean>()
    // A pre-created swap (e.g. the deposit widget's prefetcher) seeds both the
    // id and, via SWR fallbackData below, the swap details — so consumers render
    // with data on first paint instead of a loading state.
    const [swapId, setSwapId] = useState<string | undefined>(initialSettings.swapId?.toString() ?? initialSwapData?.swap.id)
    // A rejected attempt must not compact the quote after the user changes modes.
    const gaslessEnabled = useGaslessPreferenceStore(state => state.gaslessEnabled)
    const [walletExecution, setWalletExecution] = useState<{ swapId: string, gaslessEnabled: boolean }>()
    const walletExecutionStarted = !!swapId && walletExecution?.swapId === swapId
        && walletExecution.gaslessEnabled === gaslessEnabled
    const markWalletExecutionStarted = useCallback((swapId: string) => {
        setWalletExecution({ swapId, gaslessEnabled: useGaslessPreferenceStore.getState().gaslessEnabled })
    }, [])
    const { sourceRoutes, destinationRoutes, networks } = useSettingsState()
    const updateRecentTokens = useRecentNetworksStore(state => state.updateRecentNetworks)
    const [swapModalOpen, setSwapModalOpen] = useState(false)
    const [swapError, setSwapError] = useState<string | null>(null)
    const [approvalWait, setApprovalWait] = useState<ApprovalTransaction>()
    const [walletActionExecuting, setWalletActionExecuting] = useState(false)
    const [swapViewMounted, setSwapViewMounted] = useState(false)
    const watchApprovalTransaction = useCallback((transaction: ApprovalTransaction) => {
        setApprovalWait(transaction)
        // Releasing an older wait must not stop a newer approval's receipt poll.
        return () => setApprovalWait(current => current === transaction ? undefined : current)
    }, [])

    const quoteArgs = useMemo(() => transformSwapDataToQuoteArgs(swapBasicFormData, !!swapBasicFormData?.refuel), [swapBasicFormData]);

    // Deposit address flow doesn't use limits — min/max come from the detailed quote there
    const { quote: formDataQuote, quoteError: formDataQuoteError } = useQuoteData(quoteArgs, { refreshInterval: swapId ? 0 : undefined, skipLimits: isDepositAddressSwap(swapBasicFormData) });

    const handleUpdateSwapid = (value: string | undefined) => {
        setSwapId(value)
    }

    const setSubmitedFormValues = useCallback((values: NonNullable<SwapFormValues>) => {
        if (!values.from || !values.to || !values.fromAsset || !values.toAsset || !values.destination_address)
            throw new Error("Form data is missing")

        if (!isDepositAddressFlow(values.depositMethod, values.fromExchange) && !values.amount)
            throw new Error("Form data is missing")

        setSwapBasicFormData({
            source_network: values.from,
            destination_network: values.to,
            source_token: values.fromAsset,
            destination_token: values.toAsset,
            requested_amount: values.amount || '',
            destination_address: values.destination_address,
            use_deposit_address: values.depositMethod === 'deposit_address',
            refuel: !!values.refuel,
            source_exchange: values.fromExchange,
        })
    }, [sourceRoutes, destinationRoutes])

    const layerswapApiClient = new LayerSwapApiClient()
    const storedWalletTransaction = useSwapTransactionStore(
        state => swapId ? state.swapTransactions[swapId] : undefined,
    )
    const { data, mutate, error } = useSwapPolling(swapId, initialSwapData, storedWalletTransaction?.timestamp)
    const atomicBatch = useAtomicBatchStore(state => swapId ? state.batches[swapId] : undefined)
    // A failed background refresh must not hide usable data for the active swap.
    const swapDetailsError = swapId && data?.data?.swap?.id !== swapId && (error || data)
        ? (error?.response?.data?.error?.message || error?.message || data?.error?.message || 'Could not load swap details.')
        : undefined

    const baseSwapData = useMemo<(SwapBasicData & { refuel: boolean }) | undefined>(() => {
        if (!(swapId && data?.data?.swap)) return undefined
        const swap = data.data.swap
        // Swap responses can omit gasless token metadata; restore it from the route definition.
        const routeToken = sourceRoutes
            ?.find(r => r.name === swap.source_network?.name)
            ?.tokens?.find(t => t.symbol === swap.source_token?.symbol)
        const source_token = routeToken
            ? {
                ...swap.source_token,
                ...(routeToken.supports_gasless_deposit != null
                    ? { supports_gasless_deposit: routeToken.supports_gasless_deposit }
                    : {}),
                ...(routeToken.gasless_standard != null
                    ? { gasless_standard: routeToken.gasless_standard }
                    : {}),
            }
            : swap.source_token
        return {
            ...swap,
            source_token,
            requested_amount: swap.requested_amount.toString(),
            refuel: !!data.data.refuel,
        }
    }, [data, swapId, sourceRoutes])

    const extendedSwapData = useExtendedSwapData(swapId, baseSwapData, data?.data?.quote)

    const swapBasicData = useMemo(() => {
        if (swapId && data?.data) {
            if (!data.data.swap) return undefined
            return extendedSwapData?.swapBasicData ?? baseSwapData
        }
        return swapBasicFormData
    }, [data, swapBasicFormData, swapId, baseSwapData, extendedSwapData])

    const startFreshSwapAttempt = useCallback(() => {
        if (getAtomicBatch(swapId)) return
        // Preserve the displayed inputs before detaching the stale attempt. This also makes
        // retry-after-reload safe when swapBasicFormData was never populated locally.
        if (swapBasicData) setSwapBasicFormData(swapBasicData)
        setSwapError(null)
        setWalletExecution(undefined)
        setSwapId(undefined)
    }, [swapBasicData, swapId])

    const swapDetails = useMemo(() => {
        if (swapId)
            return data?.data?.swap
    }, [data, swapId])

    const quote = useMemo(() => {
        if (swapId && data?.data) {
            return extendedSwapData ? extendedSwapData.quote : data.data.quote
        }
        return formDataQuote?.quote
    }, [formDataQuote, data, swapId, extendedSwapData]);

    const quoteError = useMemo(() => {
        if (swapId && data?.data) {
            return undefined
        }
        return formDataQuoteError
    }, [formDataQuoteError, data, swapId]);

    const refuel = useMemo(() => {
        if (swapId && data?.data) {
            return data?.data?.refuel
        }
        return formDataQuote?.refuel
    }, [formDataQuote, data, swapId]);

    // Restored swaps must resolve their account before a fresh retry populates form state.
    const sourceNetwork = swapBasicData?.source_network
    const selectedSourceAccount = useSelectedAccount("from", sourceNetwork?.name);
    const { wallets } = useWallet(sourceNetwork, 'asSource')
    const selectedWallet = selectedSourceAccount?.address && sourceNetwork
        ? (selectedSourceAccount.provider?.connectedWallets ?? wallets).find(wallet => wallet.id === selectedSourceAccount.id
            && (wallet.addresses?.some(address => Address.equals(address, selectedSourceAccount.address, sourceNetwork))
                || Address.equals(wallet.address, selectedSourceAccount.address, sourceNetwork)))
        : undefined
    const selectionKey = [selectedSourceAccount?.id, selectedSourceAccount?.providerName, selectedSourceAccount?.address,
        sourceNetwork?.name, sourceNetwork?.chain_id, selectedWallet?.internalId, selectedWallet?.metadata?.connectorId,
        selectedWallet?.metadata?.connectorUid, selectedWallet?.chainId].join(':')
    const currentSelection = useRef({ key: selectionKey, revision: 0 })
    useClientLayoutEffect(() => {
        if (currentSelection.current.key !== selectionKey) currentSelection.current = { key: selectionKey, revision: currentSelection.current.revision + 1 }
    }, [selectionKey])
    const atomicBatchSupported = useAtomicBatchCapability(sourceNetwork, swapBasicData?.source_token, selectedWallet, selectedSourceAccount?.address)
    const { checkContractStatus } = useContractAddressStore();

    const sourceIsSupported = (swapBasicData && selectedWallet) && WalletIsSupportedForSource({
        sourceNetwork: swapBasicData.source_network,
        sourceWallet: selectedWallet
    })

    const use_deposit_address = swapBasicData?.use_deposit_address
    const depositActionsSourceAddress = use_deposit_address || !selectedSourceAccount || !sourceIsSupported
        ? undefined : selectedSourceAccount.address
    const deposit_actions_endpoint = swapId ? `/swaps/${swapId}/deposit_actions${depositActionsSourceAddress ? `?source_address=${depositActionsSourceAddress}` : ""}` : null
    const inputTransfer = swapDetails?.transactions.find(t => t.type === TransactionType.Input);
    // Deposit actions decide what a wallet swap shows until its input is listed or this
    // client has broadcast it. Every refresh in that window is scheduled here, whichever
    // screen of the swap view is showing; other readers of this key only subscribe.
    const swapStatus = swapDetails?.status
    const awaitsWalletDeposit = swapViewMounted && use_deposit_address === false
        && !inputTransfer
        && (!swapStatus || swapStatus === SwapStatus.Created || swapStatus === SwapStatus.UserTransferPending)
    // Load missing history even when reopening a swap that already has an input
    // transaction. Once cached, retain it without automatic refreshes after broadcast.
    const { data: depositActions, error: depositActionsSwrError, mutate: mutateDepositActions } = useSWR<ApiResponse<DepositAction[]>>(deposit_actions_endpoint, () => layerswapApiClient.GetDepositActionsAsync(swapId!, depositActionsSourceAddress), {
        keepPreviousData: false,
        revalidateIfStale: !inputTransfer,
        revalidateOnFocus: !inputTransfer,
        revalidateOnReconnect: !inputTransfer,
        refreshInterval: awaitsWalletDeposit ? (walletActionExecuting ? 2000 : 5000) : 0,
        refreshWhenHidden: walletActionExecuting,
        dedupingInterval: 1000,
    })

    // The create-swap response may already carry deposit actions — use them as
    // a fallback (only while the seeded swap is still the active one) so the
    // deposit address renders without waiting for the separate fetch.
    const depositActionsResponse = depositActions?.data
        ?? (swapId && swapId === initialSwapData?.swap.id && initialSwapData?.deposit_actions?.length ? initialSwapData.deposit_actions : undefined)
    // Cached or swap-scoped prefetched actions remain usable after a failed refresh.
    const depositActionsError = !depositActionsResponse && (depositActionsSwrError || depositActions)
        ? (depositActionsSwrError?.response?.data?.error?.message || depositActionsSwrError?.message || depositActions?.error?.message || 'Could not generate deposit address.')
        : undefined

    // Server-reported completion is read from the latest response on every render. The
    // transaction store only records what this client broadcast itself.
    const depositCompleted = use_deposit_address === false && isDepositWorkflowComplete(depositActionsResponse ?? [])
    useEffect(() => {
        if (!swapId) return
        if (depositCompleted || inputTransfer || storedWalletTransaction) {
            useDepositSignatureStore.getState().removeDepositSignature(swapId)
        }
    }, [swapId, depositCompleted, inputTransfer, storedWalletTransaction])

    // Inputs to the resolved status that only the client observes: the gasless authorization
    // outcome and source-chain status of an input transaction the swap has not listed yet.
    // Shared SWR responses supply these facts; user receipts supply only lookup identifiers.
    const { isDepositFlow } = useDepositSettings()
    const gaslessAuthorization = useGaslessAuthorizationStatus(swapId, depositActionsResponse)
    const { failureStatus: gaslessFailureStatus } = useGaslessAuthorization(swapDetails, depositActionsResponse, gaslessAuthorization)
    const gaslessAuthTx = gaslessAuthorization?.transaction
    const inputTx = swapDetails?.transactions?.find(t => t.type === TransactionType.Input)
    const inputTransactionHash = inputTx?.transaction_hash || gaslessAuthTx?.transaction_hash || storedWalletTransaction?.hash
    const { data: inputTxStatusData } = useSWR<ApiResponse<{ status: TransactionStatus }>>(
        (inputTransactionHash && inputTx?.status !== BackendTransactionStatus.Completed) ? [swapBasicData?.source_network?.name, inputTransactionHash] : null,
        ([network, tx_id]: [string, string]) => layerswapApiClient.GetTransactionStatus(network, tx_id),
        { dedupingInterval: 2000, refreshInterval: inputTx ? 0 : 3000, keepPreviousData: false },
    )
    const inputTxStatusFromApi = inputTxStatusData?.data?.status?.toLowerCase() as TransactionStatus | undefined

    const inputTransactionStatus = useMemo(() => inputTransactionHash && inputTxStatusFromApi
        ? { hash: inputTransactionHash, status: inputTxStatusFromApi } : undefined, [inputTransactionHash, inputTxStatusFromApi])

    // Approval receipts are prerequisites, separate from the input transaction
    // that determines the resolved swap status. Execution owns the wait lifetime.
    const activeApproval = approvalWait?.swapId === swapId
        && approvalWait?.sourceAddress === selectedSourceAccount?.address ? approvalWait : undefined
    const { data: approvalReceipt } = useSWR<ApiResponse<{ status: string }>>(
        activeApproval ? [activeApproval.network, activeApproval.hash] : null,
        ([network, hash]: [string, string]) => layerswapApiClient.GetTransactionStatus(network, hash),
        {
            refreshInterval: 2000, dedupingInterval: 1000, refreshWhenHidden: true, keepPreviousData: false,
            // A submitted transaction can return 404 until the node observes it.
            shouldRetryOnError: true, errorRetryInterval: 2000,
        },
    )
    const approvalStatus = approvalReceipt?.data?.status?.toLowerCase()
    const approvalTransaction = useMemo(() => activeApproval
        ? { ...activeApproval, status: approvalStatus } : undefined, [activeApproval, approvalStatus])

    useAtomicBatchTracking(swapDetails, onSwapLifecycle)
    const resolved = useMemo(
        () => resolveSwapPhase({ swapDetails, refuel, inputTxStatusFromApi,
            depositCompleted: depositCompleted || gaslessAuthorization?.status === 'initiated'
                || gaslessAuthorization?.status === 'published' || gaslessAuthorization?.status === 'completed',
            isDepositFlow, gaslessFailureStatus }),
        [swapDetails, refuel, inputTxStatusFromApi, depositCompleted, isDepositFlow, gaslessFailureStatus, gaslessAuthorization?.status],
    )

    // Observe every API status here, regardless of which screen is mounted.
    useSwapStatusNotification(swapDetails?.id, swapDetails?.status, {
        path: 'SwapDataProvider',
        fromAddress: swapDetails?.source_address ?? inputTx?.from,
        toAddress: swapBasicData?.destination_address,
        sourceNetwork: swapBasicData?.source_network.name,
        destinationNetwork: swapBasicData?.destination_network.name,
        sourceToken: swapBasicData?.source_token.symbol,
        destinationToken: swapBasicData?.destination_token.symbol,
    })

    const createSwap = useCallback(async (values: SwapFormValues, query: InitialSettings, partner: Partner) => {
        if (!values)
            throw new Error("No swap data")

        const { to, fromAsset: fromCurrency, toAsset: toCurrency, from, refuel, fromExchange, depositMethod, amount, destination_address } = values
        const depositAddressFlow = isDepositAddressFlow(depositMethod, fromExchange)
        if (!to || !fromCurrency || !toCurrency || !from || !destination_address || !depositMethod)
            throw new Error("Form data is missing")
        if (!depositAddressFlow && !amount)
            throw new Error("Form data is missing")

        return createSwapAttempt(async () => {
            const sourceWalletIsSupported = selectedWallet && WalletIsSupportedForSource({
                sourceNetwork: from,
                sourceWallet: selectedWallet
            })
            const contractCheckResult = (depositAddressFlow && selectedWallet) ? await checkContractStatus(selectedWallet.address, from, to) : null
            const isContract = contractCheckResult?.sourceIsContract ?? false
            const sourceIsSupported = sourceWalletIsSupported && !isContract

            const slippage = useSlippageStore.getState().slippage
            const gaslessEnabled = useGaslessPreferenceStore.getState().gaslessEnabled

            const useDepository = shouldUseDepository(values, !!sourceIsSupported, selectedSourceAccount?.address)
            const useGasless = isGaslessCapableRoute({
                depositMethod,
                supportsGaslessDeposit: fromCurrency.supports_gasless_deposit,
                sourceTokenContract: fromCurrency.contract,
                gaslessStandard: fromCurrency.gasless_standard,
                sourceIsSupported: !!sourceIsSupported,
                sourceAddress: selectedSourceAccount?.address,
            }) && gaslessEnabled

            const extendedPlan = resolveExtendedRoutePlan({
                sourceNetworkName: from.name,
                sourceTokenSymbol: fromCurrency.symbol,
                destinationNetworkName: to.name,
                destinationTokenSymbol: toCurrency.symbol,
                sourceAmount: amount,
                availableRoutes: sourceRoutes,
            })
            const isExtendedBridge = !!extendedPlan
            const useFrontendSwap = wantsFrontendSwap({
                depositMethod,
                sourceNetwork: from.name,
                destinationNetwork: to.name,
            })

            let useAtomicBatch = false
            if (supportsWebLocks() && selectedWallet && selectedSourceAccount && isAtomicBatchEligible({
                network: from, token: fromCurrency, depositMethod, useGasless, sourceIsSupported: !!sourceIsSupported,
                sourceAddress: selectedSourceAccount.address, sourceExchange: fromExchange, extended: isExtendedBridge,
            })) {
                if (selectionKey !== currentSelection.current.key) throw new Error('Selected wallet changed before preparing the swap')
                const selection = currentSelection.current.revision
                const network = { ...from, token: fromCurrency }
                const atomic = resolverService.getTransferResolver().getAtomicBatchProvider(network)
                useAtomicBatch = await atomic?.getCapabilities({ network, wallet: selectedWallet, account: selectedSourceAccount.address }) === 'supported'
                if (selection !== currentSelection.current.revision || gaslessEnabled !== useGaslessPreferenceStore.getState().gaslessEnabled) throw new Error('Wallet or execution mode changed while preparing the swap')
            }

            const data: CreateSwapParams = extendedPlan ? buildCreateSwapParamsForExtendedRoute({
                plan: extendedPlan,
                destinationNetworkName: to.name,
                destinationTokenSymbol: toCurrency.symbol,
                destinationAddress: destination_address,
                referenceId: query.externalId,
                refuel,
                sourceAddress: selectedSourceAccount?.address,
                useFrontendSwap,
            }) : {
                amount: amount || undefined,
                source_network: from.name,
                destination_network: to.name,
                source_token: fromCurrency.symbol,
                destination_token: toCurrency.symbol,
                source_exchange: fromExchange?.name,
                destination_address: destination_address,
                reference_id: query.externalId,
                refuel: !!refuel,
                use_deposit_address: depositMethod === 'wallet' ? false : true,
                source_address: sourceIsSupported ? selectedSourceAccount?.address : undefined,
                refund_address: sourceIsSupported ? selectedSourceAccount?.address : undefined,
                use_frontend_swap: useFrontendSwap,
                use_gasless: useGasless,
                ...(useAtomicBatch ? { use_atomic_batch: true } : {}),
                ...(useDepository && { use_depository: true }),
            }

            if (!isExtendedBridge && depositMethod === 'wallet' && slippage && slippage > 0 && slippage < 0.8) {
                data.slippage = slippage.toString()
            }

            return {
                request: () => layerswapApiClient.CreateSwapAsync(data),
                useGasless,
                onCreated: [
                    { name: 'onSwapCreate', run: onSwapCreate },
                    // Persist the extended identity so the post-create UI and the withdraw step
                    // can keep showing the extended source and resume after a reload.
                    ...(extendedPlan ? [{
                        name: 'extendedRoutes.setRecord',
                        run: (swap: SwapResponse) => useExtendedRoutesStore.getState().setRecord(swap.swap.id, {
                            providerId: extendedPlan.mapping.provider.id,
                            extendedNetwork: from.name,
                            extendedToken: fromCurrency.symbol,
                            realNetwork: extendedPlan.mapping.real.networkName,
                            realToken: extendedPlan.mapping.real.tokenSymbol,
                            sourceAddress: selectedSourceAccount?.address || '',
                            sourceAmount: (amount || '').toString(),
                            createdAt: Date.now(),
                        }),
                    }] : []),
                    {
                        name: 'recentRoutes.updateRecentNetworks',
                        run: () => updateRecentTokens({
                            from: !fromExchange ? { network: from.name, token: fromCurrency.symbol } : undefined,
                            to: { network: to.name, token: toCurrency.symbol }
                        }),
                    },
                ],
            }
        }, {
            path: 'SwapDataProvider.createSwap',
            lifecycleContext: lifecycleContextFromForm(values),
            onLifecycle: onSwapLifecycle,
            onGaslessUnavailable: () => useGaslessPreferenceStore.getState().reportGaslessUnavailable('create'),
        })
    }, [selectedSourceAccount, selectedWallet, selectionKey, onSwapCreate, onSwapLifecycle, updateRecentTokens, swapDetails?.id, networks, sourceRoutes])

    const updateFns = useMemo<UpdateSwapInterface>(() => ({
        createSwap,
        mutateSwap: mutate,
        mutateDepositActions,
        setWalletActionExecuting,
        setSwapViewMounted,
        setDepositAddressIsFromAccount,
        setWithdrawType,
        setSwapId: handleUpdateSwapid,
        markWalletExecutionStarted,
        startFreshSwapAttempt,
        watchApprovalTransaction,
        setSubmitedFormValues,
        setQuoteLoading,
        setSwapModalOpen
    }), [createSwap, mutate, mutateDepositActions, handleUpdateSwapid, markWalletExecutionStarted, startFreshSwapAttempt, watchApprovalTransaction, setSubmitedFormValues]);

    const stateValue = useMemo(() => ({
        atomicBatch,
        gaslessAuthorization,
        inputTransactionStatus,
        atomicBatchSupported,
        withdrawType,
        depositAddressIsFromAccount: !!depositAddressIsFromAccount,
        swapApiError: error,
        swapDetailsError,
        depositActionsResponse,
        depositActionsError,
        approvalTransaction,
        quote,
        quoteIsLoading,
        quoteError,
        refuel,
        swapBasicData,
        swapDetails,
        swapId,
        walletExecutionStarted,
        swapModalOpen,
        resolved,
        swapError,
        setSwapError
    }), [atomicBatch, gaslessAuthorization, inputTransactionStatus, atomicBatchSupported, withdrawType, depositAddressIsFromAccount, error, swapDetailsError, depositActionsResponse, depositActionsError, approvalTransaction, quote, quoteIsLoading, quoteError, refuel, swapBasicData, swapDetails, swapId, walletExecutionStarted, swapModalOpen, resolved, swapError]);

    return (
        <SwapDataStateContext.Provider value={stateValue}>
            <SwapDataUpdateContext.Provider value={updateFns}>
                {children}
            </SwapDataUpdateContext.Provider>
        </SwapDataStateContext.Provider>
    );
}

export function useSwapDataState() {
    const data = useContext(SwapDataStateContext);

    if (data === undefined || data === null) {
        throw new Error('swapData must be used within a SwapDataProvider');
    }
    return data;
}

export function useSwapDataUpdate() {
    const updateFns = useContext<UpdateSwapInterface>(SwapDataUpdateContext as Context<UpdateSwapInterface>);
    if (updateFns === undefined) {
        throw new Error('useSwapDataUpdate must be used within a SwapDataProvider');
    }

    return updateFns;
}

export const WalletIsSupportedForSource = ({ sourceNetwork, sourceWallet }: { sourceWallet: Wallet | undefined, sourceNetwork: Network | undefined }) => {
    const isSupported = (sourceWallet && sourceWallet?.asSourceSupportedNetworks?.some(n => n === sourceNetwork?.name)) || false
    return isSupported
}
