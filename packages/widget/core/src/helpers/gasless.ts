export type GaslessCapabilityInput = {
    depositMethod: string | undefined
    supportsGaslessDeposit: boolean | undefined
    gaslessStandard: string | null | undefined
    sourceIsSupported: boolean | undefined
    sourceAddress: string | undefined
}

// Route can use the gasless (sign-to-deposit) flow. Excludes the user's gasless toggle.
export function isGaslessCapableRoute(input: GaslessCapabilityInput): boolean {
    return input.depositMethod === 'wallet'
        && !!input.supportsGaslessDeposit
        && input.gaslessStandard !== 'erc2612'
        && !!input.sourceIsSupported
        && !!input.sourceAddress
}
