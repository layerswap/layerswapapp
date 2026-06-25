import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useConfig } from "wagmi";
import { getWalletClient } from "@wagmi/core";
import { createPublicClient, formatUnits, parseUnits, type PublicClient, type WalletClient } from "viem";
import posthog from "posthog-js";
import { WithdrawPageProps } from "../../Common/sharedTypes";
import resolveError from "../EVMWalletWithdraw/resolveError";
import { resolvePolymarketError, StepError } from "./resolveError";
import { useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import { useWalletWithdrawalState } from "@/context/withdrawalContext";
import { useSelectedAccount } from "@/context/swapAccounts";
import { useQueryState } from "@/context/query";
import { useSettingsState } from "@/context/settings";
import useWallet from "@/hooks/useWallet";
import resolveChain from "@/lib/resolveChain";
import { resolveFallbackTransport } from "@/lib/resolveTransports";
import { NetworkRoute } from "@/Models/Network";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { BackendTransactionStatus, DepositAction } from "@/lib/apiClients/layerSwapApiClient";
import { PolymarketBridgeClient } from "@/lib/apiClients/polymarketBridgeClient";
import {
    POLYMARKET_BATCH_DEADLINE_SECONDS,
    POLYMARKET_CHAIN_ID,
    POLYMARKET_DEPLOY_POLL_INTERVAL_MS,
    POLYMARKET_DEPLOY_POLL_TIMEOUT_MS,
    resolvePolymarketConfig,
} from "@/lib/wallets/polymarket/constants";
import { resolvePolymarketHolding } from "@/lib/wallets/polymarket/funder";
import { buildPusdTransferRequest } from "@/lib/wallets/polymarket/withdraw";
import { buildDepositWalletDeployRequest, buildDepositWalletTransferRequest } from "@/lib/wallets/polymarket/depositWithdraw";
import { getRelayerNonce, isPolymarketDeployed, submitRelayerTransaction, type RelayerSubmittable } from "@/lib/wallets/polymarket/relayerClient";
import { useExtendedRoutesStore } from "@/stores/extendedRoutesStore";
import { useSwapTransactionStore } from "@/stores/swapTransactionStore";

const PM_EXCEPTION_TYPE = 'Polymarket Withdrawal Error'
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

/**
 * Truncate (floor) a decimal amount string to the token's precision. The displayed
 * source amount can carry sub-precision digits (float artifacts from MAX math or
 * USD-mode conversion); we floor to the token's decimals so the transferred value is
 * exact and never exceeds the user's balance. String-based for the common case to
 * avoid float precision loss, with a numeric fallback for scientific notation.
 */
function truncateToDecimals(value: string, decimals: number): string {
    const v = value.trim()
    if (/^\d+(\.\d+)?$/.test(v)) {
        const [int, frac = ''] = v.split('.')
        if (frac.length <= decimals) return v
        const truncated = frac.slice(0, decimals)
        return truncated.length ? `${int}.${truncated}` : int
    }
    const n = Number(v)
    if (!Number.isFinite(n)) return v
    const factor = 10 ** decimals
    return (Math.floor(n * factor) / factor).toString()
}

const DEPOSIT_ACTION_TYPES = ['transfer', 'manual_transfer']
const getDepositAddress = (actions: DepositAction[] | undefined): string | undefined =>
    actions?.find(a => DEPOSIT_ACTION_TYPES.includes(a.type))?.to_address

const logWithdrawalError = (error: unknown, ctx: { swapId?: string; fromAddress?: string; toAddress?: string }) => {
    posthog.captureException(error, {
        $layerswap_exception_type: PM_EXCEPTION_TYPE,
        swapId: ctx.swapId,
        $fromAddress: ctx.fromAddress,
        $toAddress: ctx.toAddress,
    })
}

const isUserRejection = (err: unknown): boolean => {
    if (resolveError(err as any) === 'transaction_rejected') return true
    if (err instanceof Error && /user rejected|user denied|rejected the request/i.test(err.message)) return true
    const code = (err as any)?.code ?? (err as any)?.cause?.code
    return code === 4001
}

export type PolymarketStage = 'preparing' | 'deploying' | 'awaiting_signature' | 'submitting' | undefined

/**
 * Owns the Polymarket withdrawal flow. Polymarket holds collateral in a funder wallet
 * derived from the connected EOA, whose TYPE varies by account — the modern ERC-1967
 * **deposit wallet** (default), a legacy Gnosis **Safe**, or an email/Magic **proxy**.
 * We resolve which funder actually holds the funds (`resolvePolymarketHolding`) and
 * branch the signing accordingly. All paths are gasless: the user off-chain-signs;
 * the Polymarket relayer broadcasts and pays gas.
 *
 * Steps: (1) ensure the backend Polygon/USDC swap exists + read its deposit address;
 * (2) resolve the funder + collateral token; (3) quote + create (or reuse) a bridge
 * address paying USDC out to the deposit address; (4) deploy the funder if needed,
 * then sign the gasless transfer and submit via the relayer proxy. On success it
 * records a pending input so the Processing screen takes over (the backend detects the
 * bridge's USDC payout at the deposit address).
 */
export function usePolymarketWithdrawal({ swapBasicData, refuel, swapId }: WithdrawPageProps) {
    const { source_network, source_token, destination_network, destination_token, destination_address } = swapBasicData

    const config = useConfig()
    const { address: activeAddress, chain: activeChain, isConnected } = useAccount()
    const query = useQueryState()
    const { onWalletWithdrawalSuccess } = useWalletWithdrawalState()
    const { swapDetails, depositActionsResponse } = useSwapDataState()
    const { createSwap, setSwapId } = useSwapDataUpdate()

    const selectedSourceAccount = useSelectedAccount("from", source_network?.name)
    const { wallets } = useWallet(source_network, "withdrawal")
    const wallet = wallets.find(w => w.id === selectedSourceAccount?.id)
    const sourceAddress = selectedSourceAccount?.address

    const pmConfig = useMemo(() => resolvePolymarketConfig(source_network?.name), [source_network?.name])

    const [loading, setLoading] = useState(false)
    const [stage, setStage] = useState<PolymarketStage>(undefined)
    const [error, setError] = useState<StepError | undefined>()
    const [rejected, setRejected] = useState(false)

    const submittingRef = useRef(false)
    const mountedRef = useRef(true)
    useEffect(() => {
        mountedRef.current = true
        return () => { mountedRef.current = false }
    }, [])

    const handleWithdraw = useCallback(async () => {
        if (submittingRef.current) return
        submittingRef.current = true
        setError(undefined)
        setRejected(false)
        setLoading(true)
        if (mountedRef.current) setStage('preparing')

        // Step 1 — ensure the backend swap (Polygon/USDC) exists and resolve its deposit
        // address, which the bridge pays USDC out to.
        const resolveSwapAndDepositAddress = async (amount: string): Promise<{ destination: string; activeSwapId: string }> => {
            let depositActions = depositActionsResponse
            let activeSwapId = swapId
            if (!swapId || !swapDetails) {
                setSwapId(undefined)
                const swapValues: SwapFormValues = {
                    amount,
                    from: source_network as NetworkRoute,
                    to: destination_network as NetworkRoute,
                    fromAsset: source_token,
                    toAsset: destination_token,
                    refuel,
                    destination_address,
                    depositMethod: 'wallet',
                }
                const newSwap = await createSwap(swapValues, query)
                activeSwapId = newSwap?.swap?.id
                if (!activeSwapId) throw new Error('Swap ID is undefined')
                setSwapId(activeSwapId)
                depositActions = newSwap.deposit_actions
            }
            if (!activeSwapId) throw new Error('Swap ID is undefined')
            const destination = getDepositAddress(depositActions)
            if (!destination) throw new Error('No deposit address')
            return { destination, activeSwapId }
        }

        try {
            if (!pmConfig) throw new Error('Unsupported Polymarket network')
            if (!sourceAddress) throw new Error('No connected Polymarket account')

            const decimals = source_token.decimals ?? 6
            // Normalize to the token's precision (the displayed amount can carry
            // sub-precision float artifacts) rather than rejecting it.
            const amount = truncateToDecimals(swapBasicData.requested_amount.toString().trim(), decimals)
            const A = Number(amount)
            if (!Number.isFinite(A) || A <= 0) throw new Error('Invalid amount')

            const bridge = new PolymarketBridgeClient(pmConfig.bridgeBaseUrl)
            const { destination, activeSwapId } = await resolveSwapAndDepositAddress(amount)

            // Step 2 — resolve which derived funder holds the collateral, and in which token.
            const chain = resolveChain(source_network)
            if (!chain) throw new Error('Could not resolve chain')
            const publicClient = createPublicClient({
                chain,
                transport: resolveFallbackTransport(source_network.nodes),
            }) as PublicClient

            const holding = await resolvePolymarketHolding(sourceAddress, publicClient)
            const funder = holding.primary
            if (!funder || holding.total <= 0) {
                setError(resolvePolymarketError('no polymarket account'))
                return
            }
            if (funder.type === 'proxy') {
                setError({ header: 'Unsupported account', details: 'This Polymarket account (email/Magic proxy) isn’t supported yet. Use an account created with a browser wallet.' })
                return
            }

            const amountBaseUnits = parseUnits(amount, funder.decimals)
            if (funder.raw < amountBaseUnits) {
                setError({ header: 'Insufficient balance', details: `Your available Polymarket balance (${funder.amount} ${source_token.symbol}) is below ${amount} ${source_token.symbol}.` })
                return
            }

            // Step 3 — quote the conversion and create (or reuse) the bridge address.
            const toChainId = String(pmConfig.bridgeToChainId)

            // The bridge silently ignores deposits below its minimum, stranding the
            // funds at the bridge address — block below-min before moving anything.
            const minUsd = await bridge.getMinCheckoutUsd(toChainId, pmConfig.bridgeToTokenAddress).catch(() => undefined)
            if (minUsd !== undefined && A < minUsd) {
                setError({ header: 'Amount too low', details: `Polymarket withdrawals must be at least ${minUsd} ${source_token.symbol}. You entered ${amount}.` })
                return
            }

            const quote = await bridge.getQuote({
                fromAmountBaseUnit: amountBaseUnits.toString(),
                fromChainId: String(POLYMARKET_CHAIN_ID),
                toChainId,
                fromTokenAddress: funder.tokenAddress,
                toTokenAddress: pmConfig.bridgeToTokenAddress,
                recipientAddress: destination,
            })
            const estimatedOut = Number(formatUnits(BigInt(quote.estToTokenBaseUnit), pmConfig.realDecimals))
            const requiredOut = A - pmConfig.flatFee
            if (estimatedOut < requiredOut) {
                setError(resolvePolymarketError('quote slippage exceeds the expected range'))
                return
            }

            const existingRecord = useExtendedRoutesStore.getState().records[activeSwapId]
            let bridgeAddress = existingRecord?.bridgeAddress
            if (!bridgeAddress) {
                const addresses = await bridge.createWithdrawalAddresses({
                    address: funder.address,
                    toChainId,
                    toTokenAddress: pmConfig.bridgeToTokenAddress,
                    recipientAddr: destination,
                })
                bridgeAddress = addresses.address?.evm
                if (!bridgeAddress) throw new Error('Bridge did not return an EVM withdrawal address')
            }
            if (existingRecord) {
                useExtendedRoutesStore.getState().setRecord(activeSwapId, { ...existingRecord, proxyWallet: funder.address, bridgeAddress })
            }

            // Step 4 — deploy the funder if needed, then sign + submit the gasless transfer.
            const walletClient = await getWalletClient(config, { chainId: POLYMARKET_CHAIN_ID }) as WalletClient | null
            if (!walletClient) throw new Error('Wallet client unavailable')

            let request: RelayerSubmittable
            if (funder.type === 'deposit') {
                const code = await publicClient.getCode({ address: funder.address })
                if (!code || code === '0x') {
                    if (mountedRef.current) setStage('deploying')
                    await submitRelayerTransaction(buildDepositWalletDeployRequest(sourceAddress as `0x${string}`))
                    const deployed = await pollDeployed(publicClient, funder.address)
                    if (!deployed) {
                        setError({ header: 'Setting up your account', details: 'Your Polymarket wallet is being set up. Please try again in a moment.' })
                        return
                    }
                }
                const nonce = await getRelayerNonce(sourceAddress, 'WALLET')
                const deadline = String(Math.floor(Date.now() / 1000) + POLYMARKET_BATCH_DEADLINE_SECONDS)
                if (mountedRef.current) setStage('awaiting_signature')
                try {
                    request = await buildDepositWalletTransferRequest({
                        walletClient,
                        fromEoa: sourceAddress as `0x${string}`,
                        depositWallet: funder.address,
                        tokenAddress: funder.tokenAddress,
                        bridgeAddress: bridgeAddress as `0x${string}`,
                        amountBaseUnits,
                        nonce,
                        deadline,
                    })
                } catch (signErr) {
                    if (isUserRejection(signErr)) { setRejected(true); return }
                    throw signErr
                }
            } else {
                // Legacy Safe funder.
                const deployed = await isPolymarketDeployed(funder.address, 'SAFE')
                if (!deployed) {
                    setError(resolvePolymarketError('no polymarket account'))
                    return
                }
                const nonce = await getRelayerNonce(sourceAddress, 'SAFE')
                if (mountedRef.current) setStage('awaiting_signature')
                try {
                    request = await buildPusdTransferRequest({
                        walletClient,
                        fromEoa: sourceAddress as `0x${string}`,
                        bridgeAddress: bridgeAddress as `0x${string}`,
                        amountBaseUnits,
                        tokenAddress: funder.tokenAddress,
                        nonce,
                        metadata: `Layerswap withdrawal ${activeSwapId}`,
                    })
                } catch (signErr) {
                    if (isUserRejection(signErr)) { setRejected(true); return }
                    throw signErr
                }
            }

            if (mountedRef.current) setStage('submitting')
            const submitResponse = await submitRelayerTransaction(request)
            if (!submitResponse?.transactionID) {
                setError(resolvePolymarketError('Polymarket rejected the withdrawal'))
                logWithdrawalError(new Error('Relayer returned no transactionID'), { swapId: activeSwapId, fromAddress: sourceAddress, toAddress: destination })
                return
            }

            useSwapTransactionStore.getState().setSwapTransaction(activeSwapId, BackendTransactionStatus.Pending, '')
            onWalletWithdrawalSuccess?.()
        } catch (e) {
            logWithdrawalError(e, { swapId, fromAddress: sourceAddress })
            setError({ header: 'Withdrawal failed', details: (e as Error)?.message || 'Unexpected error occurred.' })
        } finally {
            setLoading(false)
            setStage(undefined)
            submittingRef.current = false
        }
    }, [pmConfig, sourceAddress, source_network, source_token, destination_network, destination_token, destination_address, depositActionsResponse, swapId, swapDetails, refuel, query, config, createSwap, setSwapId, onWalletWithdrawalSuccess, swapBasicData.requested_amount])

    // Poll the chain until the just-deployed funder contract has code.
    async function pollDeployed(publicClient: PublicClient, address: `0x${string}`): Promise<boolean> {
        const deadline = Date.now() + POLYMARKET_DEPLOY_POLL_TIMEOUT_MS
        while (Date.now() < deadline) {
            if (!mountedRef.current) return false
            await sleep(POLYMARKET_DEPLOY_POLL_INTERVAL_MS)
            const code = await publicClient.getCode({ address }).catch(() => undefined)
            if (code && code !== '0x') return true
        }
        return false
    }

    return {
        handleWithdraw,
        loading,
        stage,
        error,
        rejected,
        pmConfig,
        isConnected,
        wallet,
        activeAddress,
        activeChain,
        sourceAddress,
    }
}
