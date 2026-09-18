import type { GaslessStandard } from '@layerswap/widget-types'
import type { DepositAction } from '@/lib/apiClients/layerSwapApiClient'

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

// A gasless deposit ends with authorization. Self-paid workflows also require
// the user to publish a transaction. Missing actions leave the mode unknown.
export function isGaslessDepositWorkflow(actions: DepositAction[] | undefined): boolean | undefined {
    if (!actions?.length) return undefined

    return actions.some(action => action.type === 'sign' || action.step === 'sign')
        && !actions.some(action => action.step === 'publish')
}
