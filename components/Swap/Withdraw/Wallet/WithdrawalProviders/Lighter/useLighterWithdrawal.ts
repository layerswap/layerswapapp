import { createElement, useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useAccount, useConfig } from "wagmi";
import { signMessage } from "@wagmi/core";
import { WithdrawPageProps } from "../../Common/sharedTypes";
import { createWithdrawalErrorLogger } from "../../Common/logWithdrawalError";
import { isUserRejection } from "../../Common/isUserRejection";
import { resolveLighterError, StepError } from "./resolveError";
import { useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import { useWalletWithdrawalState } from "@/context/withdrawalContext";
import { useSelectedAccount } from "@/context/swapAccounts";
import { useQueryState } from "@/context/query";
import { useSettingsState } from "@/context/settings";
import useWallet from "@/hooks/useWallet";
import { NetworkRoute } from "@/Models/Network";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { BackendTransactionStatus, DepositAction } from "@/lib/apiClients/layerSwapApiClient";
import { resolveLighterConfig } from "@/lib/wallets/lighter/constants";
import { checkLighterWithdrawal, getLighterRegistration, prepareLighterWithdrawal, registerLighterKey, submitLighterWithdrawal } from "@/lib/wallets/lighter/relayClient";
import { useSwapTransactionStore } from "@/stores/swapTransactionStore";
import { useAsyncModal } from "@/context/asyncModal";
import { LighterFeeUpdate } from "./FeeUpdate";
import { useExtendedRoutesStore } from "@/stores/extendedRoutesStore";
import { subtractDecimal } from "@/lib/extendedRoutes/amounts";

const LIGHTER_EXCEPTION_TYPE = 'Lighter Withdrawal Error'
const logWithdrawalError = createWithdrawalErrorLogger(LIGHTER_EXCEPTION_TYPE)
const DEPOSIT_ACTION_TYPES = ['transfer', 'manual_transfer']
const getDepositAddress = (actions: DepositAction[] | undefined): string | undefined =>
    actions?.find(a => DEPOSIT_ACTION_TYPES.includes(a.type))?.to_address

export function useLighterWithdrawal({ swapBasicData, refuel, swapId }: WithdrawPageProps) {
    const { source_network, source_token, destination_network, destination_token, destination_address } = swapBasicData

    const router = useRouter()
    const config = useConfig()
    const { address: activeAddress, isConnected } = useAccount()
    const { networks, sourceRoutes } = useSettingsState()
    const query = useQueryState()
    const { onWalletWithdrawalSuccess } = useWalletWithdrawalState()
    const { getConfirmation } = useAsyncModal()
    const { swapDetails, depositActionsResponse } = useSwapDataState()
    const { createSwap, setSwapId } = useSwapDataUpdate()
    const extendedRouteRecord = useExtendedRoutesStore(state => swapId ? state.records[swapId] : undefined)

    const selectedSourceAccount = useSelectedAccount("from", source_network?.name)
    const { wallets } = useWallet(source_network, "withdrawal")
    const wallet = wallets.find(w => w.id === selectedSourceAccount?.id)
    const sourceAddress = selectedSourceAccount?.address

    const lighterConfig = useMemo(() => resolveLighterConfig(source_network?.name, networks, destination_network?.name, destination_token?.symbol, sourceRoutes), [source_network?.name, networks, destination_network?.name, destination_token?.symbol, sourceRoutes])

    const [loading, setLoading] = useState(false)
    const [registering, setRegistering] = useState(false)
    const [signingWithdrawal, setSigningWithdrawal] = useState(false)
    const [error, setError] = useState<StepError | undefined>()
    const [rejected, setRejected] = useState(false)
    const submittingRef = useRef(false)

    const handleWithdraw = useCallback(async () => {
        if (submittingRef.current) return
        submittingRef.current = true
        setError(undefined)
        setRejected(false)
        setLoading(true)

        const resolveSwapAndDepositAddress = async (
            amount: string,
            realAmount: string,
            exactFee: string,
        ): Promise<{ destination: string; activeSwapId: string }> => {
            let depositActions = depositActionsResponse
            let activeSwapId = swapId
            if (!swapId || !swapDetails) {
                setSwapId(undefined)
                const swapValues: SwapFormValues = {
                    amount,
                    extendedRouteOverride: {
                        realAmount,
                        flatFee: Number(exactFee),
                    },
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
            if (!lighterConfig) throw new Error('Unsupported Lighter network')
            if (!sourceAddress || !source_network?.name) throw new Error('No connected Lighter account')

            const network = source_network.name
            const basePath = router.basePath

            const amount = swapBasicData.requested_amount.toString().trim()
            const decimals = source_token.decimals ?? 6
            const amountPattern = decimals > 0 ? new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`) : /^\d+$/
            if (!amountPattern.test(amount)) throw new Error(`Invalid amount — at most ${decimals} decimal places for ${source_token.symbol}`)
            const A = Number(amount)
            if (!Number.isFinite(A) || A <= 0) throw new Error('Invalid amount')

            const registration = await getLighterRegistration(network, sourceAddress, basePath)
            if (!registration.registered) {
                if (!registration.signPayload || !registration.registrationToken) throw new Error('Lighter registration payload missing')
                setRegistering(true)
                let l1Signature: string
                try {
                    l1Signature = await signMessage(config, { account: sourceAddress as `0x${string}`, message: registration.signPayload.message })
                } catch (signErr) {
                    if (isUserRejection(signErr)) { setRejected(true); return }
                    throw signErr
                } finally {
                    setRegistering(false)
                }
                const registered = await registerLighterKey(registration.registrationToken, l1Signature, basePath)
                if (!registered.ok) {
                    setError(resolveLighterError(registered.error || 'Could not register your Lighter signing key.'))
                    return
                }
            }

            // Check Lighter's Arbitrum bridge LP before creating a Layerswap swap.
            // This avoids leaving an unfunded swap behind when fast withdrawals
            // are temporarily unavailable upstream.
            const hasExistingSwap = !!swapId && !!swapDetails
            const preflightAmount = hasExistingSwap
                ? subtractDecimal(amount, extendedRouteRecord?.flatFee ?? lighterConfig.quotedFastWithdrawalFee, decimals)
                : amount
            const availability = await checkLighterWithdrawal({
                network,
                l1Address: sourceAddress,
                amount: preflightAmount,
                amountType: hasExistingSwap ? 'net' : 'gross',
            }, basePath)

            const previousFee = extendedRouteRecord?.flatFee ?? lighterConfig.quotedFastWithdrawalFee
            const feeChanged = Number(availability.fee) !== previousFee
                || (hasExistingSwap && Number(availability.debitAmount) !== Number(amount))
            if (feeChanged) {
                const confirmed = await getConfirmation({
                    content: createElement(LighterFeeUpdate, {
                        previousFee,
                        fee: availability.fee,
                        netAmount: availability.netAmount,
                        debitAmount: availability.debitAmount,
                        hasExistingSwap,
                    }),
                    submitText: `Continue with ${availability.fee} USDC fee`,
                    dismissText: 'Cancel',
                })
                if (!confirmed) return
            }

            const { destination, activeSwapId } = await resolveSwapAndDepositAddress(
                amount,
                availability.netAmount,
                availability.fee,
            )
            const prepared = await prepareLighterWithdrawal({
                withdrawalQuoteToken: availability.withdrawalQuoteToken,
                destinationRecipient: destination,
            }, basePath)

            let withdrawalSignature: string
            setSigningWithdrawal(true)
            try {
                withdrawalSignature = await signMessage(config, { account: sourceAddress as `0x${string}`, message: prepared.signPayload.message })
            } catch (signErr) {
                if (isUserRejection(signErr)) { setRejected(true); return }
                throw signErr
            } finally {
                setSigningWithdrawal(false)
            }

            const result = await submitLighterWithdrawal(prepared.withdrawalToken, withdrawalSignature, basePath)

            if (!result.ok) {
                setError(resolveLighterError(result.error || 'Lighter rejected the withdrawal.'))
                logWithdrawalError(new Error(result.error || 'withdraw error'), { swapId: activeSwapId, fromAddress: sourceAddress, toAddress: destination })
                return
            }

            useSwapTransactionStore.getState().setSwapTransaction(activeSwapId, BackendTransactionStatus.Pending, '')
            onWalletWithdrawalSuccess?.()
        } catch (e) {
            logWithdrawalError(e, { swapId, fromAddress: sourceAddress })
            setError({ header: 'Withdrawal failed', details: (e as Error)?.message || 'Unexpected error occurred.' })
        } finally {
            setLoading(false)
            setRegistering(false)
            setSigningWithdrawal(false)
            submittingRef.current = false
        }
    }, [lighterConfig, sourceAddress, source_network, source_token, destination_network, destination_token, destination_address, depositActionsResponse, swapId, swapDetails, refuel, query, config, router.basePath, createSwap, setSwapId, onWalletWithdrawalSuccess, swapBasicData.requested_amount, getConfirmation, extendedRouteRecord?.flatFee])

    return {
        handleWithdraw,
        loading,
        registering,
        signingWithdrawal,
        error,
        rejected,
        lighterConfig,
        isConnected,
        wallet,
        activeAddress,
        sourceAddress,
    }
}
