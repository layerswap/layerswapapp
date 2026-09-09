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

    let resendInFlight = false
    while (true) {
        try {
            const { value: status } = await connection.getSignatureStatus(txid, { searchTransactionHistory: false })
            if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') break

            // Preserved hashes were validated at confirmed; finalized may not know them yet.
            const expired = lifetime.lastValidBlockHeight === undefined
                ? !(await connection.isBlockhashValid(lifetime.blockhash, { commitment: 'confirmed' })).value
                : await connection.getBlockHeight('finalized') > lifetime.lastValidBlockHeight
            if (expired) {
                // Check history once more in case the transaction landed before expiry.
                const { value } = await connection.getSignatureStatus(txid, { searchTransactionHistory: true })
                if (value?.confirmationStatus === 'confirmed' || value?.confirmationStatus === 'finalized') break
                return null
            }
        } catch (error) {
            // A failed read does not establish whether the submitted transaction landed.
            console.warn('Failed to check Solana transaction confirmation; retrying', error)
        }

        await sleep(pollIntervalMs)
        if (!resendInFlight) {
            // Keep polling during slow resends, with at most one resend in flight.
            resendInFlight = true
            void connection.sendRawTransaction(serializedTransaction, {
                skipPreflight: true,
                preflightCommitment: 'confirmed',
            })
                .catch(error => console.warn('Failed to resend Solana transaction', error))
                .finally(() => { resendInFlight = false })
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
