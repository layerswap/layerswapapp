import type { SwapLifecycleEvent } from '@layerswap/widget-types'
import { getErrorOccurrenceId } from '@layerswap/widget-types'
import { normalizeWalletErrorCode, walletErrorCode } from '@layerswap/wallet-core/errors'
import type { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues'
import type { SwapBasicData, SwapDetails } from '@/lib/apiClients/layerSwapApiClient'
import { SwapPhase, TERMINAL_PHASES } from '@/components/utils/swapPhase'
import type { ResolvedSwapStatus } from '@/components/utils/resolveSwapPhase'

export type PhaseLifecycleEvent = Pick<SwapLifecycleEvent, 'step' | 'stage' | 'outcome'>

export const PHASE_LIFECYCLE_EVENTS: Record<SwapPhase, PhaseLifecycleEvent> = {
    [SwapPhase.AwaitingUserDeposit]: {
        step: 'awaiting_user_deposit',
        stage: 'input_transfer',
        outcome: 'pending',
    },
    [SwapPhase.InputPending]: {
        step: 'input_transfer_pending',
        stage: 'input_transfer',
        outcome: 'pending',
    },
    [SwapPhase.OutputPending]: {
        step: 'output_transfer_pending',
        stage: 'output_transfer',
        outcome: 'pending',
    },
    [SwapPhase.SettlingOutput]: {
        step: 'output_settling',
        stage: 'output_transfer',
        outcome: 'pending',
    },
    [SwapPhase.Completed]: {
        step: 'swap_completed',
        stage: 'swap',
        outcome: 'succeeded',
    },
    [SwapPhase.Failed]: {
        step: 'swap_failed',
        stage: 'swap',
        outcome: 'failed',
    },
    [SwapPhase.Expired]: {
        step: 'swap_expired',
        stage: 'swap',
        outcome: 'expired',
    },
    [SwapPhase.PendingRefund]: {
        step: 'refund_pending',
        stage: 'refund',
        outcome: 'pending',
    },
    [SwapPhase.Refunded]: {
        step: 'refund_completed',
        stage: 'refund',
        outcome: 'succeeded',
    },
}

// The flow_closed row is derived from the same resolved status the Processing panel renders
// (and reported as its phase row), so closing after "Transfer failed" reports the failure
// with the reason code of the preceding swap_failed row, never abandonment.
export function resolveFlowClosedEvent(
    resolved: Pick<ResolvedSwapStatus, 'phase' | 'failureReason'>,
    swapDetails?: Pick<SwapDetails, 'fail_reason'>,
): Pick<SwapLifecycleEvent, 'step' | 'stage' | 'outcome' | 'reasonCode' | 'phase'> {
    const { phase } = resolved
    const terminal = TERMINAL_PHASES.has(phase)
    const phaseOutcome = PHASE_LIFECYCLE_EVENTS[phase].outcome
    const outcome = !terminal ? 'abandoned' : phaseOutcome === 'succeeded' ? 'succeeded' : 'failed'
    const reasonCode = outcome === 'succeeded'
        ? 'completed_flow_closed'
        : outcome === 'failed'
            ? (swapDetails?.fail_reason || resolved.failureReason || phase)
            : 'user_closed_non_terminal_flow'
    return { step: 'flow_closed', stage: 'flow', outcome, reasonCode, phase }
}

export type SwapLifecycleContext = Partial<Pick<
    SwapLifecycleEvent,
    | 'swapId'
    | 'depositMethod'
    | 'requestedAmount'
    | 'fromAddress'
    | 'toAddress'
    | 'sourceNetwork'
    | 'destinationNetwork'
    | 'sourceToken'
    | 'destinationToken'
>>

export function lifecycleContextFromForm(values: SwapFormValues): SwapLifecycleContext {
    return {
        depositMethod: values.depositMethod,
        requestedAmount: values.amount,
        toAddress: values.destination_address,
        sourceNetwork: values.from?.name,
        destinationNetwork: values.to?.name,
        sourceToken: values.fromAsset?.symbol,
        destinationToken: values.toAsset?.symbol,
    }
}

export function lifecycleContextFromSwap(
    swap: SwapBasicData,
    details?: SwapDetails,
): SwapLifecycleContext {
    return {
        swapId: details?.id,
        depositMethod: swap.use_deposit_address ? 'deposit_address' : 'wallet',
        requestedAmount: swap.requested_amount?.toString(),
        fromAddress: details?.source_address,
        toAddress: swap.destination_address,
        sourceNetwork: swap.source_network?.name,
        destinationNetwork: swap.destination_network?.name,
        sourceToken: swap.source_token?.symbol,
        destinationToken: swap.destination_token?.symbol,
    }
}

export function lifecycleErrorDetails(error: unknown): Pick<SwapLifecycleEvent, 'reasonCode' | 'reason' | 'errorCode' | 'occurrenceId'> {
    const candidate = error as { message?: string; shortMessage?: string; response?: { data?: { error?: { code?: string; message?: string } } } }
    const apiError = candidate?.response?.data?.error
    const errorCode = apiError?.code || walletErrorCode(error)
    const details: Pick<SwapLifecycleEvent, 'reasonCode' | 'reason' | 'errorCode' | 'occurrenceId'> = {
        occurrenceId: getErrorOccurrenceId(error),
        // API codes are already bounded server-side; wallet/provider codes are normalized.
        reasonCode: apiError?.code || normalizeWalletErrorCode(error),
        reason: apiError?.message || candidate?.shortMessage || candidate?.message || String(error),
    }
    if (errorCode) details.errorCode = errorCode
    return details
}
