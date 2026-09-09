import assert from 'node:assert/strict'
import test from 'node:test'
import {
    AddressLookupTableAccount, ComputeBudgetProgram, Connection, Keypair,
    SystemProgram, Transaction, TransactionMessage, VersionedTransaction,
} from '@solana/web3.js'
import type { SignerWalletAdapter } from '@solana/wallet-adapter-base'
import { getBase64Decoder, getSignatureFromTransaction, type Transaction as KitTransaction } from '@solana/kit'
import { getSvmTransactionSigner } from '../src/transferProvider/signSvmTransaction'
import { deserializeSvmTransaction, serializeSvmTransaction, validateSignedSvmTransaction } from '../src/transferProvider/svmTransaction'
import { configureAndSendCurrentTransaction } from '../src/transferProvider/transactionSender'

const payer = Keypair.generate()
const recipient = Keypair.generate().publicKey
const otherRecipient = Keypair.generate().publicKey
const blockhash = '11111111111111111111111111111111'
const lookupTable = new AddressLookupTableAccount({
    key: Keypair.generate().publicKey,
    state: { deactivationSlot: 0xffffffffffffffffn, lastExtendedSlot: 0, lastExtendedSlotStartIndex: 0, addresses: [recipient] },
})
const fees = () => [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 250000 }),
]
function fixture(version: 'legacy' | 0) {
    const message = new TransactionMessage({
        payerKey: payer.publicKey, recentBlockhash: blockhash,
        instructions: [SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: recipient, lamports: 1000 })],
    })
    const bytes = version === 'legacy'
        ? new Transaction({ feePayer: payer.publicKey, recentBlockhash: blockhash }).add(...message.instructions).serialize({ requireAllSignatures: false })
        : new VersionedTransaction(message.compileToV0Message([lookupTable])).serialize()
    return deserializeSvmTransaction(Buffer.from(bytes).toString('base64'))
}
function signedWithFees(transaction: KitTransaction, change?: (message: TransactionMessage) => void) {
    const wire = VersionedTransaction.deserialize(serializeSvmTransaction(transaction))
    const message = TransactionMessage.decompile(wire.message, { addressLookupTableAccounts: [lookupTable] })
    message.instructions.unshift(...fees())
    change?.(message)
    const signed = new VersionedTransaction(wire.version === 'legacy' ? message.compileToLegacyMessage() : message.compileToV0Message([lookupTable]))
    signed.sign([payer])
    return signed.serialize()
}

for (const version of ['legacy', 0] as const) {
    test(`${version}: accepts Phantom-style priority fees with unchanged transfer details`, async () => {
        const original = fixture(version)
        const bytes = signedWithFees(original)
        const signed = await validateSignedSvmTransaction(original, bytes)
        assert.deepEqual(serializeSvmTransaction(signed), bytes)
    })

    for (const enoughBalance of [true, false]) {
        test(`${version}: checks the wallet's final fee before ${enoughBalance ? 'submitting' : 'rejecting insufficient balance'}`, async t => {
            const original = fixture(version)
            let signedBytes: Uint8Array
            const events: string[] = []
            const adapter = {
                name: 'Phantom fixture', supportedTransactionVersions: new Set(['legacy', 0]),
                async signTransaction(transaction: Transaction | VersionedTransaction) {
                    events.push('sign')
                    const bytes = transaction instanceof Transaction
                        ? transaction.serialize({ requireAllSignatures: false }) : transaction.serialize()
                    signedBytes = signedWithFees(deserializeSvmTransaction(Buffer.from(bytes).toString('base64')))
                    return version === 'legacy' ? Transaction.from(signedBytes) : VersionedTransaction.deserialize(signedBytes)
                },
            } as SignerWalletAdapter
            t.mock.method(globalThis, 'fetch', async (_url, init) => {
                events.push('fee')
                const request = JSON.parse(init.body)
                const signed = deserializeSvmTransaction(Buffer.from(signedBytes).toString('base64'))
                assert.equal(request.method, 'getFeeForMessage')
                assert.equal(request.params[0], getBase64Decoder().decode(signed.messageBytes))
                return new Response(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: { context: { slot: 100 }, value: 55000 } }))
            })
            const connection = Object.assign(new Connection('https://solana.test'), {
                sendRawTransaction: async (bytes: Uint8Array) => {
                    events.push('send')
                    assert.deepEqual(new Uint8Array(bytes), signedBytes)
                    return getSignatureFromTransaction(deserializeSvmTransaction(Buffer.from(bytes).toString('base64')))
                },
                getSignatureStatus: async () => ({ context: { slot: 100 }, value: { confirmationStatus: 'confirmed' } }),
                getTransaction: async (signature: string) => ({ transaction: { signatures: [signature] }, meta: { err: null } }),
            }) as Connection
            const result = configureAndSendCurrentTransaction(original, connection, getSvmTransactionSigner(adapter, original), { blockhash, lastValidBlockHeight: 200 }, fee => {
                events.push('balance')
                assert.equal(fee, 55000n)
                if (!enoughBalance) throw new Error('Insufficient balance')
            })
            if (enoughBalance) {
                assert.equal(await result, getSignatureFromTransaction(deserializeSvmTransaction(Buffer.from(signedBytes!).toString('base64'))))
                assert.deepEqual(events, ['sign', 'fee', 'balance', 'send'])
            } else {
                await assert.rejects(result, /Insufficient balance/)
                assert.deepEqual(events, ['sign', 'fee', 'balance'])
            }
        })
    }

    const changes: [string, (message: TransactionMessage) => void][] = [
        ['amount', message => { message.instructions[2] = SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: recipient, lamports: 2000 }) }],
        ['recipient', message => { message.instructions[2] = SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: otherRecipient, lamports: 1000 }) }],
        ['blockhash', message => { message.recentBlockhash = 'SysvarRecentB1ockHashes11111111111111111111' }],
        ['fee payer', message => { message.payerKey = recipient }],
        ['account permissions', message => { message.instructions[2].keys[1].isWritable = false }],
        ['extra transfer', message => { message.instructions.push(SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: otherRecipient, lamports: 1 })) }],
        ['other compute instruction', message => { message.instructions.push(ComputeBudgetProgram.requestHeapFrame({ bytes: 32768 })) }],
        ['duplicate fee instruction', message => { message.instructions.push(fees()[0]) }],
        ['fee instruction with accounts', message => { message.instructions[0].keys.push({ pubkey: recipient, isSigner: false, isWritable: true }) }],
    ]
    for (const [name, change] of changes) {
        test(`${version}: rejects wallet changes to ${name} alongside priority fees`, async () => {
            const original = fixture(version)
            await assert.rejects(validateSignedSvmTransaction(original, signedWithFees(original, change)), /wallet changed/)
        })
    }
}

test('rejects changes to v0 lookup table contents alongside priority fees', async () => {
    const original = fixture(0)
    const signed = VersionedTransaction.deserialize(signedWithFees(original))
    signed.message.addressTableLookups[0].writableIndexes[0] = 1
    signed.sign([payer])
    await assert.rejects(validateSignedSvmTransaction(original, signed.serialize()), /wallet changed/)
})

test('keeps exact-message validation for transactions with existing signatures', async () => {
    const wire = VersionedTransaction.deserialize(serializeSvmTransaction(fixture('legacy')))
    wire.sign([payer])
    const original = deserializeSvmTransaction(Buffer.from(wire.serialize()).toString('base64'))
    await assert.rejects(validateSignedSvmTransaction(original, signedWithFees(original)), /wallet changed/)
})

test('verifies signatures on wallet-adjusted messages', async () => {
    const original = fixture('legacy')
    const bytes = signedWithFees(original)
    bytes[1] ^= 1
    await assert.rejects(validateSignedSvmTransaction(original, bytes), /Invalid Solana transaction signature/)
})
