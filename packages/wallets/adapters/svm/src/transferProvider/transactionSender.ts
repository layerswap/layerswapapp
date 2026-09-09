import type { Transaction } from '@solana/kit'
import type { Connection } from '@solana/web3.js'
import { transactionSenderAndConfirmationWaiter, type SvmTransactionLifetime } from './transactionBuilder'
import { getSvmTransactionFee, serializeSvmTransaction, validateSignedSvmTransaction } from './svmTransaction'
import { haveSameSvmMessageBytes } from './validateSvmTransactionMessage'

export const configureAndSendCurrentTransaction = async (
    transaction: Transaction,
    connection: Connection,
    signTransaction: (transaction: Transaction) => Promise<Uint8Array>,
    lifetime: SvmTransactionLifetime,
    validateFee: (feeInLamports: bigint) => void,
) => {
    const signed = await validateSignedSvmTransaction(transaction, await signTransaction(transaction))
    if (!haveSameSvmMessageBytes(transaction, signed)) {
        validateFee(await getSvmTransactionFee(signed, connection.rpcEndpoint))
    }
    const response = await transactionSenderAndConfirmationWaiter({
        connection,
        serializedTransaction: serializeSvmTransaction(signed),
        blockhashWithExpiryBlockHeight: lifetime,
    })

    if (!response) throw new Error('Solana transaction expired before confirmation')
    if (response.meta?.err) throw new Error(JSON.stringify(response.meta.err))
    return response.transaction.signatures[0]
}
