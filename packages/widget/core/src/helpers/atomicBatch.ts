import type { AtomicBatchCall, Network, Token } from '@layerswap/widget-types'
import type { BatchTransferDepositAction, SwapBasicData } from '@/lib/apiClients/layerSwapApiClient'

const ADDRESS = /^0x[0-9a-fA-F]{40}$/
const BYTES = /^0x(?:[0-9a-fA-F]{2})*$/
export const isTransactionHash = (value: unknown): value is string =>
    typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value) && !/^0x0{64}$/.test(value)

export function isAtomicBatchEligible(input: {
    network: Network; token: Token; depositMethod: string | undefined; useGasless: boolean;
    sourceIsSupported: boolean; sourceAddress?: string; sourceExchange?: unknown; extended?: boolean;
}): boolean {
    return input.network.type === 'evm' && input.depositMethod === 'wallet'
        && !input.useGasless && input.sourceIsSupported && !input.sourceExchange && !input.extended
        && !!input.token.contract && ADDRESS.test(input.token.contract)
        && !!input.sourceAddress && ADDRESS.test(input.sourceAddress)
}

export function getAtomicBatchExpiry(action: Pick<BatchTransferDepositAction, 'valid_before' | 'expires_at'>): number {
    const expiryMilliseconds = action.expires_at === undefined ? undefined : Date.parse(action.expires_at)
    if (expiryMilliseconds !== undefined && !Number.isSafeInteger(expiryMilliseconds)) {
        throw new Error('Invalid atomic batch expiry')
    }
    const expiry = expiryMilliseconds === undefined ? undefined : Math.floor(expiryMilliseconds / 1000)
    const validBefore = action.valid_before
    if (validBefore !== undefined && !Number.isSafeInteger(validBefore)) throw new Error('Invalid atomic batch expiry')
    if (validBefore === undefined && expiry === undefined) throw new Error('Invalid atomic batch expiry')
    // The API can expire an action before its calldata's transaction deadline.
    // Stop submission at either deadline without changing the backend's calls.
    return Math.min(validBefore ?? Infinity, expiry ?? Infinity)
}

export function validateAtomicBatch(action: BatchTransferDepositAction, swap: SwapBasicData, account: string, backendAccount?: string, now = Date.now()): AtomicBatchCall[] {
    if (swap.use_deposit_address || swap.source_network.type !== 'evm' || !swap.source_token.contract) throw new Error('This route cannot use an atomic token swap')
    if (action.type !== 'send_calls' || action.step !== 'publish' || action.status !== 'action_required') throw new Error('Invalid atomic workflow')
    if (!ADDRESS.test(account) || !backendAccount || !ADDRESS.test(backendAccount) || backendAccount.toLowerCase() !== account.toLowerCase()
        || (action.from_address !== undefined && (!ADDRESS.test(action.from_address) || action.from_address.toLowerCase() !== account.toLowerCase()))) throw new Error('Batch sender does not match the swap account')
    const chain = Number(swap.source_network.chain_id)
    const network = action.network ?? swap.source_network
    if (!Number.isSafeInteger(chain) || chain <= 0 || network.type !== 'evm'
        || network.name !== swap.source_network.name || Number(network.chain_id) !== chain) throw new Error('Batch source chain does not match the swap')
    if (getAtomicBatchExpiry(action) <= Math.floor(now / 1000)) throw new Error('Batch expired. Refresh the quote before retrying.')
    if (!Array.isArray(action.calls) || action.calls.length === 0) throw new Error('Batch contains no calls')
    // The backend owns allowance/zero-first decisions and ordering. Never rebuild these calls.
    return action.calls.map(call => {
        if (!call || typeof call.to !== 'string' || !ADDRESS.test(call.to) || /^0x0{40}$/i.test(call.to)) throw new Error('Invalid batch target')
        if (typeof call.data !== 'string' || !BYTES.test(call.data)) throw new Error('Invalid batch calldata')
        if (typeof call.value !== 'string' || !/^0x[0-9a-fA-F]+$/.test(call.value)) throw new Error('Invalid batch value')
        const value = BigInt(call.value)
        if (value >= 2n ** 256n) throw new Error('Batch value exceeds uint256')
        return { to: call.to as `0x${string}`, data: call.data as `0x${string}`, value }
    })
}
