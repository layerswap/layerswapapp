import type { SwapLifecycleEvent, WidgetOperationOutcome, WidgetTelemetryAttributes } from '@layerswap/widget-types'
import { lifecycleErrorDetails, type SwapLifecycleContext } from '@/lib/swapLifecycle'
import { isUserRejection } from './isUserRejection'

type WalletOperationOptions = {
    context: SwapLifecycleContext & Pick<SwapLifecycleEvent, 'path' | 'action' | 'provider'>
    onLifecycle: (event: SwapLifecycleEvent) => void
    /** Receives the request's terminal outcome with its telemetry attributes (e.g. a `widgetTelemetry` operation finisher). */
    onSettled?: (outcome: WidgetOperationOutcome, attributes?: WidgetTelemetryAttributes) => void
    /** Relayed withdrawals can succeed without a source-chain transaction hash. */
    allowEmptyHash?: boolean
    /** A recoverable error (such as the first expired Stellar transaction) has no terminal event. */
    shouldReportError?: (error: unknown) => boolean
    /** Preserve flows that stop reporting outcomes after their UI unmounts. */
    isActive?: () => boolean
}

/** Reports only the wallet request; preparation and success hand-off belong to the caller. */
export async function executeWalletOperation(
    { context, onLifecycle, onSettled, allowEmptyHash = false, shouldReportError, isActive }: WalletOperationOptions,
    execute: () => Promise<string | undefined>,
): Promise<string> {
    const active = () => isActive?.() ?? true

    onLifecycle({
        ...context,
        step: 'wallet_prompt_opened',
        stage: 'wallet_action',
        outcome: 'pending',
    })

    const reportFailure = (error: unknown, reasonCode?: SwapLifecycleEvent['reasonCode']) => {
        const rejected = !reasonCode && isUserRejection(error)
        const details = lifecycleErrorDetails(error)
        const outcome = rejected ? 'rejected' : 'failed'
        onSettled?.(outcome, reasonCode ? { reason_code: reasonCode } : { occurrence_id: details.occurrenceId })
        onLifecycle({
            ...context,
            ...details,
            step: rejected ? 'wallet_action_rejected' : 'wallet_action_failed',
            stage: 'wallet_action',
            outcome,
            reasonCode: reasonCode ?? (rejected ? 'user_rejected' : details.reasonCode),
        })
    }

    let hash: string | undefined
    try {
        hash = await execute()
    } catch (error) {
        if (active() && shouldReportError?.(error) !== false) reportFailure(error)
        throw error
    }

    if (!allowEmptyHash && !hash) {
        const error = new Error('Wallet returned no transaction hash')
        if (active()) reportFailure(error, 'missing_transaction_hash')
        throw error
    }

    if (active()) {
        onSettled?.('succeeded')
        onLifecycle({
            ...context,
            step: 'transaction_submitted',
            stage: 'input_transfer',
            outcome: 'succeeded',
            transactionHash: hash || undefined,
        })
    }
    return hash || ''
}
