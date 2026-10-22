import { resolveDepositExecution } from '../components/utils/resolveSwapFlow.js'
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
    const { kind } = resolveDepositExecution(actions)
    return kind === 'unresolved' ? undefined : kind === 'gasless-deposit'
}

export function isGaslessAuthorizationSubmitted(authorization: GaslessAuthorizationResult | undefined): boolean {
    if (!authorization) return false
    if (authorization.transaction?.status === 'failed') return false
    return !!authorization.transaction?.transaction_hash
        || authorization.status === 'published' || authorization.status === 'completed'
}

// Legacy markers need workflow evidence before they can drive failure or expiry.
// Always let explicit self-paid actions override an old marker, including its status.
export function isGaslessAuthorizationForWorkflow(authorization: GaslessAuthorization | undefined, actions: DepositAction[] | undefined): boolean {
    if (!authorization) return false
    const gasless = isGaslessDepositWorkflow(actions)
    if (gasless === false) return false
    return authorization.kind === 'gasless' || gasless === true
        || !!authorization.transaction?.transaction_hash
        || authorization.status === 'published' || authorization.status === 'completed'
}
