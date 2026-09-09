import type { Connection, VersionedTransactionResponse } from '@solana/web3.js'
import { sleep, retry } from '@layerswap/utils'

export type SvmTransactionLifetime = {
    blockhash: string
    lastValidBlockHeight?: number
}

type TransactionSenderAndConfirmationWaiterArgs = {
    connection: Connection
    serializedTransaction: Uint8Array
    blockhashWithExpiryBlockHeight: SvmTransactionLifetime
    /** RPC retry cadence, independent of the network's slot duration. */
    pollIntervalMs?: number
}

export async function transactionSenderAndConfirmationWaiter({
    connection,
    serializedTransaction,
    blockhashWithExpiryBlockHeight: lifetime,
    pollIntervalMs = 2000,
}: TransactionSenderAndConfirmationWaiterArgs): Promise<VersionedTransactionResponse | null> {
    const txid = await connection.sendRawTransaction(serializedTransaction, {
        preflightCommitment: 'confirmed',
    })

    while (true) {
        const { value: status } = await connection.getSignatureStatus(txid, { searchTransactionHistory: false })
        if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') break

        const expired = lifetime.lastValidBlockHeight === undefined
            ? !(await connection.isBlockhashValid(lifetime.blockhash, { commitment: 'finalized' })).value
            : await connection.getBlockHeight('finalized') > lifetime.lastValidBlockHeight
        if (expired) {
            // Check history once more in case the transaction landed before expiry.
            const { value } = await connection.getSignatureStatus(txid, { searchTransactionHistory: true })
            if (value?.confirmationStatus === 'confirmed' || value?.confirmationStatus === 'finalized') break
            return null
        }

        await sleep(pollIntervalMs)
        try {
            await connection.sendRawTransaction(serializedTransaction, { skipPreflight: true })
        } catch (error) {
            console.warn('Failed to resend Solana transaction', error)
        }
    }

    return retry(async () => {
        const response = await connection.getTransaction(txid, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 1,
        })
        if (!response) throw new Error('Transaction not found')
        return response
    })
}
