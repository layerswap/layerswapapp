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
    /** Approval transactions do not submit the swap input transfer. */
    reportsSubmission?: boolean
    /** A recoverable error (such as the first expired Stellar transaction) has no terminal event. */
    shouldReportError?: (error: unknown) => boolean
    /** Preserve flows that stop reporting outcomes after their UI unmounts. */
    isActive?: () => boolean
    /** When the prompt event is reported: as `execute` starts (default), or when `execute`
     *  signals the wallet request. A request that settles without signalling is reported
     *  just before its terminal event, so the prompt always precedes the outcome. */
    promptOpensOn?: 'start' | 'wallet_request'
}

/** Reports only the wallet request; preparation and success hand-off belong to the caller. */
export async function executeWalletOperation(
    { context, onLifecycle, onSettled, allowEmptyHash = false, reportsSubmission = true, shouldReportError, isActive, promptOpensOn = 'start' }: WalletOperationOptions,
    execute: (onWalletRequest: () => void) => Promise<string | undefined>,
): Promise<string> {
    const active = () => isActive?.() ?? true

    let promptReported = false
    const reportPrompt = () => {
        if (promptReported) return
        promptReported = true
        onLifecycle({
            ...context,
            step: 'wallet_prompt_opened',
            stage: 'wallet_action',
            outcome: 'pending',
        })
    }
    if (promptOpensOn === 'start') reportPrompt()

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
        hash = await execute(reportPrompt)
    } catch (error) {
        reportPrompt()
        if (active() && shouldReportError?.(error) !== false) reportFailure(error)
        throw error
    }
    reportPrompt()

    if (!allowEmptyHash && !hash) {
        const error = new Error('Wallet returned no transaction hash')
        if (active()) reportFailure(error, 'missing_transaction_hash')
        throw error
    }

    if (active()) {
        onSettled?.('succeeded')
        if (reportsSubmission) onLifecycle({
            ...context,
            step: 'transaction_submitted',
            stage: 'input_transfer',
            outcome: 'succeeded',
            transactionHash: hash || undefined,
        })
    }
    return hash || ''
}
