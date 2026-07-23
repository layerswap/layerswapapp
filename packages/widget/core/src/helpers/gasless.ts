export type GaslessCapabilityInput = {
    depositMethod: string | undefined
    supportsGaslessDeposit: boolean | undefined
    sourceIsSupported: boolean | undefined
    sourceAddress: string | undefined
}

// Route can use the gasless (sign-to-deposit) flow. Excludes the user's gasless toggle.
export function isGaslessCapableRoute(input: GaslessCapabilityInput): boolean {
    return input.depositMethod === 'wallet'
        && !!input.supportsGaslessDeposit
        && !!input.sourceIsSupported
        && !!input.sourceAddress
}
