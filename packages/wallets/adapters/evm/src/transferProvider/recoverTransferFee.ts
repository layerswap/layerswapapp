import type { TransferProps } from '@layerswap/widget-types'
import { createPublicClient, formatUnits } from 'viem'
import resolveChain from '../evmUtils/resolveChain'
import { resolveFallbackTransport } from '../evmUtils/resolveTransports'
import { estimateTransferFee } from '../gasProviders/estimateTransferFee'
import { transactionBuilder } from './transactionBuilder'

/** Best-effort recovery after the wallet refuses an unaffordable native send.
 * Never delays/replaces the wallet error, prompts, or resubmits a transaction. */
export async function recoverTransferFee(params: TransferProps, isCurrent: () => boolean): Promise<void> {
    let active = true
    const timer = setTimeout(() => { active = false }, 5_000)
    try {
        const tx = await transactionBuilder(params)
        const client = createPublicClient({
            chain: resolveChain(params.network),
            transport: resolveFallbackTransport(params.network.nodes, { retryCount: 0, timeoutMs: 1_500 }),
        })
        const estimate = await estimateTransferFee(params.network, tx, client)
        if (active && isCurrent() && params.network.token) {
            params.onFeeEstimate?.({
                gas: Number(formatUnits(estimate.fee, params.network.token.decimals)),
                token: params.network.token,
            })
        }
    } catch {
        // The original wallet error and ordinary gas warning remain available.
    } finally {
        active = false
        clearTimeout(timer)
    }
}
