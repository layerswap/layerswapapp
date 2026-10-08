import LayerSwapApiClient, { type GaslessAuthorizationResult, type SwapResponse, TransactionStatus } from './apiClients/layerSwapApiClient'
import type { ApiResponse } from '@layerswap/widget-types'
import type { DepositSignature, GaslessAuthorization, SwapTransaction } from '../stores/swapTransactionStore'
import { isGaslessDepositWorkflow } from '../helpers/gasless'
import { hasSwapExecutionProgress } from '../helpers/swapProgress'

export type SwapRecoveryEvidence = {
    transaction?: SwapTransaction
    authorization?: GaslessAuthorization
    signature?: DepositSignature
    submissionPending?: boolean
}

export type SwapReconciliation = {
    response: ApiResponse<SwapResponse>
    authorization?: GaslessAuthorizationResult
    transactionStatus?: TransactionStatus
    canRestart: boolean
}

const api = new LayerSwapApiClient()
const activeChecks = new Set<string>()

// Share the check and mutation lifetime across retry buttons and provider flows.
export async function withSwapReconciliation<T>(swapId: string, run: () => Promise<T>): Promise<T> {
    if (activeChecks.has(swapId)) throw new Error('The transfer status is already being checked.')
    activeChecks.add(swapId)
    try { return await run() } finally { activeChecks.delete(swapId) }
}

// A replacement attempt requires fresh backend facts, never a cached local status
// or a browser deadline. Missing transaction/authorization data is not failure.
export async function reconcileSwap(
    swapId: string,
    sourceAddress: string | undefined,
    evidence: SwapRecoveryEvidence,
    client: LayerSwapApiClient = api,
): Promise<SwapReconciliation> {
    const response = await client.GetSwapAsync(swapId, sourceAddress)
    if (response.error) throw response.error
    const current = response.data
    if (current?.swap?.id !== swapId) {
        throw new Error('Could not check the transfer status. Please try again.')
    }
    if (hasSwapExecutionProgress({
        swapDetails: current.swap, depositActions: undefined,
    })) return { response, canRestart: false }

    if (!Array.isArray(current.deposit_actions)) {
        throw new Error('Could not check the transfer status. Please try again.')
    }
    const actions = current.deposit_actions
    const selfPaid = isGaslessDepositWorkflow(actions) === false
    let authorization: GaslessAuthorizationResult | undefined
    const signActions = actions.filter(action => action.step === 'sign' || action.type === 'sign')
    const signingWorkflow = signActions.length > 0
    if (signingWorkflow && !selfPaid) {
        try {
            const result = await client.GetGaslessAuthorizationAsync(swapId)
            if (result.error) throw result.error
            if (!result.data?.status || !['initiated', 'published', 'completed', 'expired', 'insufficient', 'rejected'].includes(result.data.status)) {
                throw new Error('Could not check the authorization status.')
            }
            authorization = result.data
        } catch (error) {
            // A not-yet-issued authorization is harmless only before any signature
            // or uncertain submission, and while the backend still asks for signing.
            const notIssued = (error as { response?: { status?: number } })?.response?.status === 404
            const signaturePossible = evidence.signature || evidence.authorization || evidence.submissionPending
                || signActions.some(action => action.status !== 'action_required')
            if (!notIssued || signaturePossible) throw error
        }
    }

    // Backend progress alone prevents replacement. Do not let an unavailable
    // auxiliary receipt hide an already accepted or completed backend transfer.
    if (hasSwapExecutionProgress({
        swapDetails: current.swap, depositActions: actions, authorization,
    })) return { response, authorization, canRestart: false }

    const hashes = [...new Set([evidence.transaction?.hash, evidence.authorization?.transaction?.transaction_hash,
        authorization?.transaction?.transaction_hash]
        .filter((hash): hash is string => !!hash))]
    const receipts = await Promise.all(hashes.map(async hash => {
        const result = await client.GetTransactionStatus(current.swap.source_network.name, hash)
        if (result.error) throw result.error
        const status = result.data?.status?.toLowerCase() as TransactionStatus | undefined
        if (!status || !Object.values(TransactionStatus).includes(status)) {
            throw new Error('Could not establish the transaction outcome. Please try again.')
        }
        return status
    }))
    const transactionStatus = receipts.includes(TransactionStatus.Pending) ? TransactionStatus.Pending
        : receipts.includes(TransactionStatus.Completed) ? TransactionStatus.Completed : receipts[0]
    const authorizationFailed = !!authorization && ['expired', 'insufficient', 'rejected'].includes(authorization.status)
    const hasProgress = hasSwapExecutionProgress({
        swapDetails: current.swap,
        depositActions: actions,
        authorization,
        inputTransactionStatus: transactionStatus,
    })
    // A request with no receipt remains unresolved until its backend workflow
    // declares failure. Absence of a listed input cannot authorize another send.
    const unresolvedSubmission = !authorizationFailed && receipts.length === 0
        && (evidence.submissionPending || (!selfPaid && (evidence.signature || evidence.authorization)))
    return { response, authorization, transactionStatus,
        canRestart: !hasProgress && !unresolvedSubmission && receipts.every(status => status === TransactionStatus.Failed) }
}
