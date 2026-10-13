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
    const expiry = action.expires_at === undefined ? undefined : Date.parse(action.expires_at) / 1000
    if (expiry !== undefined && !Number.isSafeInteger(expiry)) throw new Error('Invalid atomic batch expiry')
    const validBefore = action.valid_before ?? expiry
    if (!Number.isSafeInteger(validBefore) || (expiry !== undefined && expiry !== validBefore)) throw new Error('Invalid atomic batch expiry')
    return validBefore as number
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

export type BatchOutcome = { state: 'pending' | 'uncertain' | 'failed' | 'not_submitted' } | { state: 'confirmed'; hash: string }

/** Consume viem's formatted result, keeping malformed and partial outcomes locked. */
export function resolveAtomicBatchOutcome(result: unknown, chainId: number, id: string): BatchOutcome {
    if (!result || typeof result !== 'object') return { state: 'uncertain' }
    const status = result as { id?: unknown; chainId?: unknown; atomic?: unknown; statusCode?: unknown; receipts?: unknown }
    if (status.chainId !== chainId || status.atomic !== true || (status.id !== undefined && status.id !== id)
        || !Number.isInteger(status.statusCode)) return { state: 'uncertain' }
    const receipts = status.receipts
    if (!Array.isArray(receipts)) return { state: 'uncertain' }
    const valid = receipts.every(receipt => receipt && isTransactionHash(receipt.transactionHash)
        && (receipt.status === 'success' || receipt.status === 'reverted'))
    if (!valid) return { state: 'uncertain' }
    if (status.statusCode === 200 && receipts.length && receipts.every(r => r.status === 'success')) {
        return { state: 'confirmed', hash: receipts[receipts.length - 1].transactionHash }
    }
    if (status.statusCode === 400 && receipts.length === 0) return { state: 'not_submitted' }
    if (status.statusCode === 500 && receipts.length && receipts.every(r => r.status === 'reverted')) return { state: 'failed' }
    if (status.statusCode === 100 && receipts.length === 0) return { state: 'pending' }
    return { state: 'uncertain' }
}
