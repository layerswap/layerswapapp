import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useConfig } from "wagmi";
import { getWalletClient } from "@wagmi/core";
import { createPublicClient, decodeAbiParameters, type Hex, type PublicClient, type WalletClient } from "viem";
import { WithdrawPageProps } from "../../Common/sharedTypes";
import { createWithdrawalErrorLogger } from "../../Common/logWithdrawalError";
import resolveError from "../EVMWalletWithdraw/resolveError";
import { resolvePolymarketError, StepError } from "./resolveError";
import { useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import { useWalletWithdrawalState } from "@/context/withdrawalContext";
import { useSelectedAccount } from "@/context/swapAccounts";
import { useQueryState } from "@/context/query";
import useWallet from "@/hooks/useWallet";
import resolveChain from "@/lib/resolveChain";
import { resolveFallbackTransport } from "@/lib/resolveTransports";
import sleep from "@/lib/wallets/utils/sleep";
import { NetworkRoute } from "@/Models/Network";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { truncateToDecimals } from "@/components/utils/RoundDecimals";
import { BackendTransactionStatus, DepositAction } from "@/lib/apiClients/layerSwapApiClient";
import {
    POLYMARKET_BATCH_DEADLINE_SECONDS,
    POLYMARKET_CHAIN_ID,
    POLYMARKET_DEPLOY_POLL_INTERVAL_MS,
    POLYMARKET_DEPLOY_POLL_TIMEOUT_MS,
    POLYMARKET_USDC_E_ADDRESS,
    resolvePolymarketConfig,
} from "@/lib/wallets/polymarket/constants";
import { resolvePolymarketHolding } from "@/lib/wallets/polymarket/funder";
import { buildDepositWalletBatchRequest, buildDepositWalletDeployRequest, buildPolymarketDepositCalls } from "@/lib/wallets/polymarket/depositWithdraw";
import { getRelayerNonce, submitRelayerTransaction, type RelayerSubmittable } from "@/lib/wallets/polymarket/relayerClient";
import { useSwapTransactionStore } from "@/stores/swapTransactionStore";

const PM_EXCEPTION_TYPE = 'Polymarket Withdrawal Error'
const logWithdrawalError = createWithdrawalErrorLogger(PM_EXCEPTION_TYPE)

type DepositoryAction = {
    depository: `0x${string}`
    depositCallData: Hex
    tokenContract: string
    amountBaseUnits: bigint
}

// depositERC20(bytes32 id, address token, address receiver, uint256 amount) — all static.
const DEPOSIT_ERC20_PARAMS = [{ type: 'bytes32' }, { type: 'address' }, { type: 'address' }, { type: 'uint256' }] as const

const DEPOSIT_ACTION_TYPES = ['transfer', 'manual_transfer']
const getDepositAction = (actions: DepositAction[] | undefined): DepositoryAction | undefined => {
    const action = actions?.find(a => DEPOSIT_ACTION_TYPES.includes(a.type))
    if (!action?.to_address || !action.call_data) return undefined
    const depositCallData = action.call_data as Hex
    // `amount_in_base_units` is msg.value (0 for ERC20); the real token amount + token are
    // encoded in the depositERC20 calldata, so decode them — the approve/unwrap legs must
    // pull exactly what the deposit pulls.
    let token: string
    let amountBaseUnits: bigint
    try {
        const [, decodedToken, , amount] = decodeAbiParameters(DEPOSIT_ERC20_PARAMS, `0x${depositCallData.slice(10)}` as Hex)
        token = decodedToken as string
        amountBaseUnits = amount as bigint
    } catch {
        return undefined
    }
    if (amountBaseUnits <= 0n) return undefined
    return { depository: action.to_address, depositCallData, tokenContract: token, amountBaseUnits }
}

const isUserRejection = (err: unknown): boolean => {
    if (resolveError(err as any) === 'transaction_rejected') return true
    if (err instanceof Error && /user rejected|user denied|rejected the request/i.test(err.message)) return true
    const code = (err as any)?.code ?? (err as any)?.cause?.code
    return code === 4001
}

export type PolymarketStage = 'preparing' | 'deploying' | 'awaiting_signature' | 'submitting' | undefined

/**
 * Owns the Polymarket withdrawal flow (Flow 2 — permissionless, on-chain).
 *
 * Polymarket holds collateral as pUSD in a funder wallet derived from the connected
 * EOA. We resolve which funder holds the funds (`resolvePolymarketHolding`) and, for
 * the modern ERC-1967 **deposit wallet**, sign ONE gasless `Batch` that:
 *   1. approve pUSD → CollateralOfframp, 2. unwrap pUSD → USDC.e (1:1) into the funder,
 *   3. approve USDC.e → Layerswap Depository, 4. depositERC20 (backend-encoded calldata).
 * A funder already holding USDC.e skips 1–2. The Polymarket relayer broadcasts and pays
 * gas; the backend detects the depository `Deposited` event and bridges to destination.
 *
 * The backend swap is created with `use_depository: true` so its deposit action carries
 * the Depository address + `depositERC20` calldata. Legacy Safe / proxy funders are not
 * supported in this flow yet.
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
        const ifMounted = (fn: () => void) => { if (mountedRef.current) fn() }
        setError(undefined)
        setRejected(false)
        setLoading(true)
        ifMounted(() => setStage('preparing'))

        // Step 1 — ensure the backend swap (Polygon/USDC.e via Depository) exists and
        // read its deposit action: the Depository address + encoded depositERC20 calldata.
        const resolveSwapAndDepositAction = async (amount: string): Promise<{ action: DepositoryAction; activeSwapId: string }> => {
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
            const action = getDepositAction(depositActions)
            if (!action) throw new Error('No depository deposit action')
            return { action, activeSwapId }
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

            const { action, activeSwapId } = await resolveSwapAndDepositAction(amount)

            // The depository deposit is denominated in USDC.e — the token the funder
            // ends up holding after unwrap. Bail if the backend returned anything else.
            if (action.tokenContract.toLowerCase() !== POLYMARKET_USDC_E_ADDRESS.toLowerCase()) {
                throw new Error('Unexpected depository token (expected USDC.e)')
            }

            // Step 2 — resolve which derived funder holds the collateral, and in which token.
            const chain = resolveChain(source_network)
            if (!chain) {
                ifMounted(() => setError({ header: 'Network unavailable', details: 'Could not connect to Polygon for this withdrawal. Please try again.' }))
                return
            }
            const publicClient = createPublicClient({
                chain,
                transport: resolveFallbackTransport(source_network.nodes),
            }) as PublicClient

            const holding = await resolvePolymarketHolding(sourceAddress, publicClient)
            const funder = holding.primary
            if (!funder || holding.total <= 0) {
                ifMounted(() => setError(resolvePolymarketError('no polymarket account')))
                return
            }
            if (funder.type !== 'deposit') {
                ifMounted(() => setError({ header: 'Unsupported account', details: 'This Polymarket account type isn’t supported for direct withdrawal yet. Withdraw via Polymarket, or use an account backed by a deposit wallet.' }))
                return
            }

            // The depository calldata already encodes this exact amount; reuse it across
            // the approve/unwrap legs so all calls agree to the wei (pUSD↔USDC.e is 1:1).
            const amountBaseUnits = action.amountBaseUnits
            if (funder.raw < amountBaseUnits) {
                ifMounted(() => setError({ header: 'Insufficient balance', details: `Your available Polymarket balance (${funder.amount} ${source_token.symbol}) is below ${amount} ${source_token.symbol}.` }))
                return
            }

            // Step 3 — assemble the batch (unwrap if holding pUSD, then approve + deposit).
            const calls = buildPolymarketDepositCalls({
                funderTokenAddress: funder.tokenAddress,
                funderAddress: funder.address,
                amountBaseUnits,
                depository: action.depository,
                depositCallData: action.depositCallData,
            })

            // Step 4 — deploy the funder if needed, then sign + submit the gasless batch.
            const walletClient = await getWalletClient(config, { chainId: POLYMARKET_CHAIN_ID }) as WalletClient | null
            if (!walletClient) throw new Error('Wallet client unavailable')

            const code = await publicClient.getCode({ address: funder.address })
            if (!code || code === '0x') {
                ifMounted(() => setStage('deploying'))
                await submitRelayerTransaction(buildDepositWalletDeployRequest(sourceAddress as `0x${string}`))
                const deployed = await pollDeployed(publicClient, funder.address)
                if (!deployed) {
                    ifMounted(() => setError({ header: 'Setting up your account', details: 'Your Polymarket wallet is being set up. Please try again in a moment.' }))
                    return
                }
            }

            const nonce = await getRelayerNonce(sourceAddress, 'WALLET')
            const deadline = String(Math.floor(Date.now() / 1000) + POLYMARKET_BATCH_DEADLINE_SECONDS)
            ifMounted(() => setStage('awaiting_signature'))

            let request: RelayerSubmittable
            try {
                request = await buildDepositWalletBatchRequest({
                    walletClient,
                    fromEoa: sourceAddress as `0x${string}`,
                    depositWallet: funder.address,
                    calls,
                    nonce,
                    deadline,
                })
            } catch (signErr) {
                if (isUserRejection(signErr)) { ifMounted(() => setRejected(true)); return }
                throw signErr
            }

            ifMounted(() => setStage('submitting'))
            const submitResponse = await submitRelayerTransaction(request)
            if (!submitResponse?.transactionID) {
                ifMounted(() => setError(resolvePolymarketError('Polymarket rejected the withdrawal')))
                logWithdrawalError(new Error('Relayer returned no transactionID'), { swapId: activeSwapId, fromAddress: sourceAddress, toAddress: action.depository })
                return
            }

            useSwapTransactionStore.getState().setSwapTransaction(activeSwapId, BackendTransactionStatus.Pending, '')
            onWalletWithdrawalSuccess?.()
        } catch (e) {
            logWithdrawalError(e, { swapId, fromAddress: sourceAddress })
            ifMounted(() => setError({ header: 'Withdrawal failed', details: (e as Error)?.message || 'Unexpected error occurred.' }))
        } finally {
            ifMounted(() => { setLoading(false); setStage(undefined) })
            submittingRef.current = false
        }
    }, [pmConfig, sourceAddress, source_network, source_token, destination_network, destination_token, destination_address, depositActionsResponse, swapId, swapDetails, refuel, query, config, createSwap, setSwapId, onWalletWithdrawalSuccess, swapBasicData.requested_amount])

    // Poll the chain until the just-deployed funder contract has code.
    async function pollDeployed(publicClient: PublicClient, address: `0x${string}`): Promise<boolean> {
        const deadline = Date.now() + POLYMARKET_DEPLOY_POLL_TIMEOUT_MS
        while (Date.now() < deadline) {
            if (!mountedRef.current) return false
            await sleep(POLYMARKET_DEPLOY_POLL_INTERVAL_MS)
            if (!mountedRef.current) return false
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
