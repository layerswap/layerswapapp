import type { GaslessStandard } from '@layerswap/widget-types'
import type { DepositAction, GaslessAuthorizationResult } from '@/lib/apiClients/layerSwapApiClient'
import type { GaslessAuthorization } from '@/stores/swapTransactionStore'

export type GaslessCapabilityInput = {
    depositMethod: string | undefined
    supportsGaslessDeposit: boolean | undefined
    sourceTokenContract: string | null | undefined
    gaslessStandard: GaslessStandard | null | undefined
    sourceIsSupported: boolean | undefined
    sourceAddress: string | undefined
}

export const gaslessAuthorizationKey = (swapId: string): string => `/swaps/${swapId}/authorize`

// Route can use the gasless (sign-to-deposit) flow. Excludes the user's gasless toggle.
export function isGaslessCapableRoute(input: GaslessCapabilityInput): boolean {
    const sourceTokenIsNative = !input.sourceTokenContract
    const usesPermit2 = input.gaslessStandard?.toLowerCase() === 'permit2'

    return input.depositMethod === 'wallet'
        && !!input.supportsGaslessDeposit
        && !sourceTokenIsNative
        && !usesPermit2
        && input.gaslessStandard !== 'erc2612'
        && !!input.sourceIsSupported
        && !!input.sourceAddress
}

// EIP-3009 supports both execution modes. A sign-only snapshot may precede
// publication, so only explicit steps/standards identify the lane.
export function isGaslessDepositWorkflow(actions: DepositAction[] | undefined): boolean | undefined {
    if (!actions?.length) return undefined
    if (actions.some(action => action.step === 'publish' || action.step === 'deposit'
        || action.signing_standard === 'permit2_witness' || action.signing_standard === 'eip2612')) return false
    if (actions.some(action => action.signing_standard === 'permit2')) return true
    if (actions.some(action => action.type === 'sign' || action.step === 'sign'
        || action.step === 'approve_permit2')) return undefined
    return false
}

export function isGaslessAuthorizationSubmitted(authorization: GaslessAuthorizationResult | undefined): boolean {
    if (!authorization) return false
    if (authorization.transaction?.status === 'failed') return false
    return !!authorization.transaction?.transaction_hash
        || authorization.status === 'published' || authorization.status === 'completed'
}

// A fetched accepted sign action can probe the authorization endpoint to resolve
// an ambiguous gasless lane on a browser with no local action receipt.
// Explicit self-paid actions override every saved signature receipt.
export function isGaslessAuthorizationForWorkflow(authorization: GaslessAuthorization | undefined, actions: DepositAction[] | undefined): boolean {
    const gasless = isGaslessDepositWorkflow(actions)
    if (gasless === false) return false
    const acceptedSignAction = actions?.some(action => (action.step === 'sign' || action.type === 'sign')
        && (action.status === 'pending' || action.status === 'completed')) ?? false
    return authorization?.kind === 'gasless' || gasless === true || acceptedSignAction
}
