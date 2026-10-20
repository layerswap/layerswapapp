import { Address } from '@layerswap/utils'

/** Authorization failures have a specific recovery path, distinct from wallet declines. */
export class StarknetAccountError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'StarknetAccountError'
    }
}

/** Both connection and execution read the extension's current, silently authorized account. */
export function requireStarknetAccount(accounts: readonly string[] | undefined): string {
    const address = accounts?.[0]
    if (!address) {
        throw new StarknetAccountError('No authorized Starknet account is available. Unlock your wallet and reconnect before sending.')
    }
    if (!/^0x[0-9a-f]+$/i.test(address)) throw new StarknetAccountError('The wallet returned an invalid Starknet account. Reconnect your wallet.')
    return address
}

export function assertStarknetAccount(actual: string, selected: string): void {
    if (!Address.equals(actual, selected, null, 'Starknet')) {
        throw new StarknetAccountError('Starknet account changed. Reconnect your wallet before sending.')
    }
}
