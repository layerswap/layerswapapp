import type { GaslessStandard } from '@layerswap/widget-types'

export type GaslessCapabilityInput = {
    depositMethod: string | undefined
    supportsGaslessDeposit: boolean | undefined
    sourceTokenContract: string | null | undefined
    gaslessStandard: GaslessStandard | undefined
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
        && !!input.sourceIsSupported
        && !!input.sourceAddress
}
