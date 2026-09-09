import { ed25519 } from '@noble/curves/ed25519'
import {
    address,
    assertIsFullySignedTransaction,
    assertIsTransactionWithinSizeLimit,
    blockhash,
    createSolanaRpc,
    getAddressEncoder,
    getBase64Decoder,
    getBase64Encoder,
    getCompiledTransactionMessageDecoder,
    getCompiledTransactionMessageEncoder,
    getTransactionDecoder,
    getTransactionEncoder,
    getTransactionLifetimeConstraintFromCompiledTransactionMessage,
    type Transaction,
    type TransactionMessageBytes,
    type TransactionMessageBytesBase64,
} from '@solana/kit'
import type { Connection } from '@solana/web3.js'
import { assertSvmTransactionMessageAllowed } from './validateSvmTransactionMessage'

export function deserializeSvmTransaction(callData: string): Transaction {
    const bytes = getBase64Encoder().encode(callData)
    let transaction: Transaction
    if (bytes[0] === 0) {
        // The backend can omit all signature entries from unsigned legacy/v0 payloads.
        // Kit needs a null entry for every signer before the wallet signs them.
        const messageBytes = bytes.subarray(1)
        const [message, offset] = getCompiledTransactionMessageDecoder().read(messageBytes, 0)
        const signerCount = message.header.numSignerAccounts
        if (
            message.version === 1
            || offset !== messageBytes.length
            || signerCount === 0
            || signerCount > message.staticAccounts.length
        ) {
            throw new Error('Invalid unsigned Solana transaction')
        }
        const signers = message.staticAccounts.slice(0, signerCount)
        transaction = {
            messageBytes: messageBytes as unknown as TransactionMessageBytes,
            signatures: Object.freeze(Object.fromEntries(signers.map(signer => [signer, null]))),
        }
    } else {
        transaction = getTransactionDecoder().decode(bytes)
    }
    assertIsTransactionWithinSizeLimit(transaction)
    return transaction
}

export function getSvmTransactionVersion(transaction: Transaction) {
    return getCompiledTransactionMessageDecoder().decode(transaction.messageBytes).version
}

export function serializeSvmTransaction(transaction: Transaction): Uint8Array {
    assertIsTransactionWithinSizeLimit(transaction)
    return new Uint8Array(getTransactionEncoder().encode(transaction))
}

export async function prepareSvmTransaction(transaction: Transaction, connection: Connection) {
    const message = getCompiledTransactionMessageDecoder().decode(transaction.messageBytes)
    const lifetime = await getTransactionLifetimeConstraintFromCompiledTransactionMessage(message)
    if ('nonce' in lifetime) {
        throw new Error('Durable nonce transactions are not supported for Solana transfers')
    }

    // A new blockhash would invalidate any signatures supplied by the backend.
    if (Object.values(transaction.signatures).some(signature => signature !== null)) {
        const originalBlockhash = message.lifetimeToken
        const validity = await connection.isBlockhashValid(originalBlockhash, { commitment: 'confirmed' })
        if (!validity.value) throw new Error('Solana transaction has expired. Please request a new transfer.')
        return { transaction, lifetime: { blockhash: originalBlockhash } }
    }

    const latestBlockhash = await connection.getLatestBlockhash('confirmed')
    const messageBytes = getCompiledTransactionMessageEncoder().encode({
        ...message,
        lifetimeToken: blockhash(latestBlockhash.blockhash),
    }) as TransactionMessageBytes

    return {
        transaction: { ...transaction, messageBytes },
        lifetime: latestBlockhash,
    }
}

export async function getSvmTransactionFee(transaction: Transaction, endpoint: string): Promise<bigint> {
    const rpc = createSolanaRpc(endpoint)
    const message = getBase64Decoder().decode(transaction.messageBytes) as TransactionMessageBytesBase64
    const { value } = await rpc.getFeeForMessage(message, { commitment: 'confirmed' }).send()
    if (value === null) throw new Error('Unable to estimate the Solana transaction fee. Please try again.')
    // The RPC includes v1's total priority fee in lamports; no compute-unit multiplication is needed.
    return value
}

export async function validateSignedSvmTransaction(original: Transaction, signedBytes: Uint8Array): Promise<Transaction> {
    const signed = getTransactionDecoder().decode(signedBytes)
    assertSvmTransactionMessageAllowed(original, signed)
    assertIsTransactionWithinSizeLimit(signed)
    assertIsFullySignedTransaction(signed)
    // JavaScript verification also works in wallets' older embedded browsers.
    for (const [signer, signature] of Object.entries(signed.signatures)) {
        const publicKey = getAddressEncoder().encode(address(signer))
        if (!signature || !ed25519.verify(
            new Uint8Array(signature),
            new Uint8Array(signed.messageBytes),
            new Uint8Array(publicKey),
            // Preserve strict RFC 8032 signature validation.
            { zip215: false },
        )) {
            throw new Error(`Invalid Solana transaction signature for ${signer}`)
        }
    }
    return signed
}
