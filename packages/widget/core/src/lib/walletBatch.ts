import type { AtomicBatchStatus } from '@layerswap/widget-types'

export type BatchResolution = { state: 'pending' | 'unknown' | 'failed' } | { state: 'confirmed'; hash: string }

export function resolveBatchStatus(status: AtomicBatchStatus, chainId: number): BatchResolution {
    if (status.chainId !== chainId) return { state: 'unknown' }
    if (status.statusCode >= 100 && status.statusCode < 200) return { state: 'pending' }
    if (status.statusCode >= 200 && status.statusCode < 300) {
        if (!status.atomic || !status.receipts.length || status.receipts.some(receipt =>
            receipt.status !== 'success' || !/^0x[\da-f]{64}$/i.test(receipt.transactionHash)))
            return { state: 'unknown' }
        return { state: 'confirmed', hash: status.receipts[status.receipts.length - 1].transactionHash }
    }
    if (status.statusCode >= 400 && status.statusCode < 500 && status.receipts.length === 0)
        return { state: 'failed' }
    if (status.statusCode >= 500 && status.statusCode < 600 && status.atomic
        && status.receipts.length > 0 && status.receipts.every(receipt => receipt.status === 'reverted'))
        return { state: 'failed' }
    return { state: 'unknown' }
}
