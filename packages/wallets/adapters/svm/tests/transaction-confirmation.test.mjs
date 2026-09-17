import assert from 'node:assert/strict'
import test, { mock } from 'node:test'
import { Connection, PublicKey } from '@solana/web3.js'
import sleep from '../../../../utils/src/sleep.ts'
import { retry } from '../../../../utils/src/retry.ts'

// Use the real timing helpers without loading unrelated chain utilities from
// the package barrel (some require a bundler for CommonJS interoperability).
mock.module('@layerswap/utils', { namedExports: { sleep, retry } })
const { transactionSenderAndConfirmationWaiter } = await import('../src/transferProvider/transactionBuilder.ts')

const signature = '1'.repeat(64)
const blockhashWithExpiryBlockHeight = {
    blockhash: PublicKey.default.toBase58(),
    lastValidBlockHeight: 100,
}
const transactionConfig = {
    computeUnitLimit: 200_000,
    heapSize: null,
    loadedAccountsDataSizeLimit: 200_000,
    priorityFee: 50_000,
}

function transactionResponse(version, err = null) {
    return {
        slot: 42,
        version,
        meta: {
            err,
            fee: 55_000,
            preBalances: [1_000_000],
            postBalances: [945_000],
        },
        transaction: {
            signatures: [signature],
            message: {
                header: {
                    numRequiredSignatures: 1,
                    numReadonlySignedAccounts: 0,
                    numReadonlyUnsignedAccounts: 0,
                },
                accountKeys: [new PublicKey(new Uint8Array(32).fill(1)).toBase58()],
                recentBlockhash: blockhashWithExpiryBlockHeight.blockhash,
                instructions: [],
                ...(version === 0 ? { addressTableLookups: [] } : {}),
                ...(version === 1 ? { transactionConfig } : {}),
            },
        },
    }
}

function createConnection(responses) {
    const requests = []
    const connection = new Connection('https://solana.invalid', {
        commitment: 'confirmed',
        // Exercise the installed SDK's response decoder without network access.
        fetch: async (_url, options) => {
            const request = JSON.parse(options.body)
            requests.push(request)
            assert.equal(request.method, 'getTransaction')
            assert.deepEqual(request.params, [signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 1,
            }])
            assert.ok(responses.length > 0, 'Unexpected extra RPC request')
            return new Response(JSON.stringify({
                jsonrpc: '2.0',
                id: request.id,
                result: responses.shift(),
            }))
        },
    })
    connection.sendRawTransaction = async () => signature
    connection.confirmTransaction = async () => ({ context: { slot: 42 }, value: { err: null } })
    connection.getSignatureStatus = async () => ({
        context: { slot: 42 },
        value: { slot: 42, confirmations: 1, err: null, confirmationStatus: 'confirmed' },
    })
    return { connection, requests }
}

function confirm(connection) {
    return transactionSenderAndConfirmationWaiter({
        connection,
        serializedTransaction: Buffer.alloc(0),
        blockhashWithExpiryBlockHeight,
    })
}

for (const version of ['legacy', 0, 1]) {
    test(`confirmation reads a ${version} transaction`, async () => {
        const { connection, requests } = createConnection([transactionResponse(version)])
        const result = await confirm(connection)

        assert.equal(result.version, version)
        assert.equal(result.transaction.message.version, version)
        assert.equal(result.transaction.signatures[0], signature)
        assert.equal(result.meta.err, null)
        assert.equal(requests.length, 1)
        if (version === 1) {
            // v1 carries the total priority fee in lamports in its config.
            assert.deepEqual(result.transaction.message.transactionConfig, transactionConfig)
        }
    })
}

test('confirmation preserves a v1 transaction failure for the sender', async () => {
    const err = { InstructionError: [0, { Custom: 1 }] }
    const { connection } = createConnection([transactionResponse(1, err)])

    assert.deepEqual((await confirm(connection)).meta.err, err)
})

test('confirmation retries a lookup while the RPC catches up', async () => {
    const { connection, requests } = createConnection([null, transactionResponse(1)])

    assert.equal((await confirm(connection)).version, 1)
    assert.equal(requests.length, 2)
})
