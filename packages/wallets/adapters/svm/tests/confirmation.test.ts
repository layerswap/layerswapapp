import assert from 'node:assert/strict'
import test from 'node:test'
import type { Connection, SignatureStatus } from '@solana/web3.js'
import { transactionSenderAndConfirmationWaiter, type SvmTransactionLifetime } from '../src/transferProvider/transactionBuilder'

const signature = 'submitted-transaction'
const blockhash = '11111111111111111111111111111111'
const confirmed: SignatureStatus = { slot: 100, confirmations: 1, err: null, confirmationStatus: 'confirmed' }
const response = { transaction: { signatures: [signature] }, meta: { err: null } }
const bytes = new Uint8Array([1, 2, 3])

function rpcFixture(overrides: Partial<Connection> = {}): Connection {
    return {
        sendRawTransaction: async () => signature,
        getSignatureStatus: async () => ({ context: { slot: 100 }, value: confirmed }),
        getBlockHeight: async () => 100,
        isBlockhashValid: async () => ({ context: { slot: 100 }, value: true }),
        getTransaction: async () => response,
        ...overrides,
    } as Connection
}

function send(connection: Connection, lifetime: SvmTransactionLifetime = { blockhash, lastValidBlockHeight: 200 }) {
    return transactionSenderAndConfirmationWaiter({
        connection,
        serializedTransaction: bytes,
        blockhashWithExpiryBlockHeight: lifetime,
        pollIntervalMs: 1,
    })
}

test('a preserved confirmed blockhash stays valid before finalization', async () => {
    let reads = 0
    const commitments: string[] = []
    const rpc = rpcFixture({
        getSignatureStatus: async () => ({ context: { slot: 100 }, value: ++reads >= 3 ? confirmed : null }),
        isBlockhashValid: async (_hash, config) => {
            commitments.push(config?.commitment ?? '')
            return { context: { slot: 100 }, value: config?.commitment === 'confirmed' }
        },
    })

    assert.equal(await send(rpc, { blockhash }), response)
    assert.deepEqual(commitments, ['confirmed', 'confirmed'])
})

for (const failedRead of ['status', 'block height', 'blockhash validity', 'expiry history'] as const) {
    test(`continues tracking the submitted signature after a temporary ${failedRead} failure`, async t => {
        t.mock.method(console, 'warn', () => {})
        let failed = false
        let sends = 0
        const failOnce = () => {
            failed = true
            throw new Error('503 Service Unavailable')
        }
        const rpc = rpcFixture({
            sendRawTransaction: async submittedBytes => {
                assert.deepEqual(submittedBytes, bytes)
                sends++
                return signature
            },
            getSignatureStatus: async (txid, config) => {
                assert.equal(txid, signature)
                if (!failed && (failedRead === 'status' || (failedRead === 'expiry history' && config?.searchTransactionHistory))) {
                    failOnce()
                }
                return { context: { slot: 100 }, value: failed ? confirmed : null }
            },
            getBlockHeight: async () => {
                if (failedRead === 'block height' && !failed) failOnce()
                return failedRead === 'expiry history' ? 201 : 100
            },
            isBlockhashValid: async () => {
                if (failedRead === 'blockhash validity' && !failed) failOnce()
                return { context: { slot: 100 }, value: true }
            },
        })

        const lifetime = failedRead === 'blockhash validity' ? { blockhash } : { blockhash, lastValidBlockHeight: 200 }
        assert.equal(await send(rpc, lifetime), response)
        assert.equal(failed, true)
        assert.equal(sends, 2)
    })
}

test('a transient read failure still allows actual expiry to end tracking', async t => {
    t.mock.method(console, 'warn', () => {})
    let reads = 0
    const rpc = rpcFixture({
        getSignatureStatus: async () => {
            if (++reads === 1) throw new Error('Failed to fetch')
            return { context: { slot: 100 }, value: null }
        },
        getBlockHeight: async () => 201,
    })

    assert.equal(await send(rpc), null)
    assert.equal(reads, 3)
})

test('a confirmed history result is returned when the blockhash expires', async () => {
    const rpc = rpcFixture({
        getSignatureStatus: async (_txid, config) => ({ context: { slot: 100 }, value: config?.searchTransactionHistory ? confirmed : null }),
        getBlockHeight: async () => 201,
    })

    assert.equal(await send(rpc), response)
})

test('slow resends do not block confirmation or overlap', { timeout: 2000 }, async () => {
    const resend = Promise.withResolvers<string>()
    let sends = 0
    let reads = 0
    const rpc = rpcFixture({
        sendRawTransaction: async () => ++sends === 1 ? signature : resend.promise,
        getSignatureStatus: async () => ({ context: { slot: 100 }, value: ++reads >= 4 ? confirmed : null }),
    })

    try {
        // The redundant resend remains unresolved for the entire confirmation loop.
        assert.equal(await send(rpc), response)
        assert.equal(reads, 4)
        assert.equal(sends, 2)
    } finally {
        resend.resolve(signature)
    }
})

test('a failed resend releases its slot while confirmation polling continues', async t => {
    t.mock.method(console, 'warn', () => {})
    let sends = 0
    const rpc = rpcFixture({
        sendRawTransaction: async () => {
            if (++sends === 2) throw new Error('503 Service Unavailable')
            return signature
        },
        getSignatureStatus: async () => ({ context: { slot: 100 }, value: sends >= 3 ? confirmed : null }),
    })

    assert.equal(await send(rpc), response)
    assert.equal(sends, 3)
})

test('an initial submission failure is propagated without starting polling', async () => {
    let reads = 0
    const rpc = rpcFixture({
        sendRawTransaction: async () => { throw new Error('Transaction simulation failed') },
        getSignatureStatus: async () => { reads++; return { context: { slot: 100 }, value: confirmed } },
    })

    await assert.rejects(send(rpc), /Transaction simulation failed/)
    assert.equal(reads, 0)
})
