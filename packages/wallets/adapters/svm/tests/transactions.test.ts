import assert from 'node:assert/strict'
import test from 'node:test'
import {
    AccountRole, address, appendTransactionMessageInstruction, blockhash, compileTransaction,
    createTransactionMessage, generateKeyPairSigner, getBase64Decoder, getCompiledTransactionMessageDecoder,
    getSignatureFromTransaction, getTransactionDecoder, partiallySignTransaction, setTransactionMessageComputeUnitLimit,
    setTransactionMessageFeePayer, setTransactionMessageLifetimeUsingBlockhash, setTransactionMessagePriorityFeeLamports,
    type Transaction as KitTransaction,
} from '@solana/kit'
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'
import { WalletAdapterNetwork, type SignerWalletAdapter } from '@solana/wallet-adapter-base'
import { StandardWalletAdapter } from '@solana/wallet-standard-wallet-adapter-base'
import { deserializeSvmTransaction, getSvmTransactionFee, getSvmTransactionVersion, prepareSvmTransaction, serializeSvmTransaction, validateSignedSvmTransaction } from '../src/transferProvider/svmTransaction'
import { getSvmTransactionSigner } from '../src/transferProvider/signSvmTransaction'
import { configureAndSendCurrentTransaction } from '../src/transferProvider/transactionSender'
import { transactionSenderAndConfirmationWaiter } from '../src/transferProvider/transactionBuilder'
import { SolanaWalletConnectAdapter } from '../src/connectors/SolanaWalletConnectAdapter'

const originalHash = blockhash('11111111111111111111111111111111')
const freshHash = blockhash('SysvarRecentB1ockHashes11111111111111111111')
const payer = await generateKeyPairSigner()
const coSigner = await generateKeyPairSigner()
const program = address('11111111111111111111111111111111')
function fixture(version: 'legacy' | 0 | 1, { cosign = false, dataSize = 8 } = {}) {
    let message = setTransactionMessageLifetimeUsingBlockhash({ blockhash: originalHash, lastValidBlockHeight: 100n },
        setTransactionMessageFeePayer(payer.address, createTransactionMessage({ version })))
    message = appendTransactionMessageInstruction({
        programAddress: program,
        accounts: cosign ? [{ address: coSigner.address, role: AccountRole.READONLY_SIGNER }] : [],
        data: new Uint8Array(dataSize).fill(7),
    }, message)
    if (version === 1) {
        message = setTransactionMessageComputeUnitLimit(200000, message)
        message = setTransactionMessagePriorityFeeLamports(50000n, message)
    }
    return compileTransaction(message)
}
const encode = (transaction: KitTransaction) => getBase64Decoder().decode(serializeSvmTransaction(transaction))
function connection(overrides: Partial<Connection> = {}): Connection {
    return Object.assign(new Connection('https://solana.test', 'confirmed'), {
        getLatestBlockhash: async () => ({ blockhash: freshHash, lastValidBlockHeight: 200 }),
        isBlockhashValid: async () => ({ context: { slot: 100 }, value: true }),
    }, overrides)
}
for (const version of ['legacy', 0, 1] as const) {
    test(`${version}: decode, refresh, sign and serialize the exact transfer message`, async () => {
        const decoded = deserializeSvmTransaction(encode(fixture(version)))
        assert.equal(getSvmTransactionVersion(decoded), version)
        const prepared = await prepareSvmTransaction(decoded, connection())
        assert.equal(getCompiledTransactionMessageDecoder().decode(prepared.transaction.messageBytes).lifetimeToken, freshHash)
        const signed = await partiallySignTransaction([payer.keyPair], prepared.transaction)
        assert.deepEqual(await validateSignedSvmTransaction(prepared.transaction, serializeSvmTransaction(signed)), signed)
        if (version === 1) {
            const before = getCompiledTransactionMessageDecoder().decode(decoded.messageBytes)
            const after = getCompiledTransactionMessageDecoder().decode(prepared.transaction.messageBytes)
            assert.deepEqual({ ...before, lifetimeToken: freshHash }, after)
            assert.equal(serializeSvmTransaction(signed)[0], 0x81)
            assert.deepEqual(serializeSvmTransaction(signed).slice(-64), new Uint8Array(signed.signatures[payer.address]!))
        }
    })
}
for (const version of ['legacy', 0] as const) {
    for (const cosign of [false, true]) {
        test(`${version}: unsigned payload with no signature entries supports ${cosign ? 2 : 1} signers`, async () => {
            const original = fixture(version, { cosign })
            const payload = Uint8Array.from([0, ...original.messageBytes])
            if (version === 'legacy') assert.equal(Transaction.from(payload).signatures.length, 0)
            const decoded = deserializeSvmTransaction(Buffer.from(payload).toString('base64'))
            assert.deepEqual(decoded.messageBytes, original.messageBytes)
            assert.deepEqual(decoded.signatures, original.signatures)
            const prepared = await prepareSvmTransaction(decoded, connection())
            const signed = await partiallySignTransaction(cosign ? [payer.keyPair, coSigner.keyPair] : [payer.keyPair], prepared.transaction)
            const signature = getSignatureFromTransaction(signed)
            const { rpc } = rpcFixture(signature)
            assert.equal(await configureAndSendCurrentTransaction(prepared.transaction, rpc, async () => serializeSvmTransaction(signed), prepared.lifetime, () => assert.fail('Unchanged message does not need another fee check')), signature)
            await assert.rejects(validateSignedSvmTransaction(decoded, payload))
        })
    }
}
test('v1 accepts wire transactions larger than the legacy packet limit', async () => {
    const transaction = fixture(1, { dataSize: 2000 })
    assert.ok(serializeSvmTransaction(transaction).length > 1232)
    assert.equal(getSvmTransactionVersion(deserializeSvmTransaction(encode(transaction))), 1)
    const signed = await partiallySignTransaction([payer.keyPair], transaction)
    await validateSignedSvmTransaction(transaction, serializeSvmTransaction(signed))
})
test('rejects oversized transactions and unknown transaction formats', () => {
    assert.throws(() => serializeSvmTransaction(fixture(1, { dataSize: 5000 })))
    assert.throws(() => deserializeSvmTransaction(Buffer.from([0x82, 0, 0, 0]).toString('base64')))
})
test('unsigned compatibility rejects malformed payloads and enforces size including signature placeholders', () => {
    const payload = Uint8Array.from([0, ...fixture('legacy').messageBytes])
    assert.throws(() => deserializeSvmTransaction(Buffer.from(payload.subarray(0, -1)).toString('base64')))
    assert.throws(() => deserializeSvmTransaction(Buffer.from([...payload, 0]).toString('base64')))
    assert.throws(() => deserializeSvmTransaction(Buffer.from([0, ...fixture(1).messageBytes]).toString('base64')))
    const oversized = Uint8Array.from([0, ...fixture('legacy', { dataSize: 1100 }).messageBytes])
    assert.ok(oversized.length <= 1232)
    assert.throws(() => deserializeSvmTransaction(Buffer.from(oversized).toString('base64')))
    const incomplete = Uint8Array.from([1, ...new Uint8Array(64), ...fixture('legacy', { cosign: true }).messageBytes])
    assert.throws(() => deserializeSvmTransaction(Buffer.from(incomplete).toString('base64')), /expected.*2 signatures, got 1/)
})
for (const version of ['legacy', 0, 1] as const) {
    test(`${version}: preserves the original blockhash and co-signature on a partially signed transfer`, async () => {
        const transaction = deserializeSvmTransaction(encode(await partiallySignTransaction([coSigner.keyPair], fixture(version, { cosign: true }))))
        const prepared = await prepareSvmTransaction(transaction, connection({
            getLatestBlockhash: async () => { throw new Error('must not refresh a signed message') },
        }))
        assert.equal(prepared.transaction, transaction)
        assert.deepEqual(prepared.lifetime, { blockhash: originalHash })
        const signed = await partiallySignTransaction([payer.keyPair], prepared.transaction)
        assert.deepEqual(signed.signatures[coSigner.address], transaction.signatures[coSigner.address])
        await validateSignedSvmTransaction(transaction, serializeSvmTransaction(signed))
    })
}
test('rejects expired pre-signed transfers before asking a wallet to sign', async () => {
    const transaction = await partiallySignTransaction([coSigner.keyPair], fixture(1, { cosign: true }))
    await assert.rejects(prepareSvmTransaction(transaction, connection({
        isBlockhashValid: async () => ({ context: { slot: 100 }, value: false }),
    })), /expired/)
})
test('rejects message changes, missing co-signatures, and invalid signatures', async () => {
    const transaction = fixture(1, { cosign: true })
    const partial = await partiallySignTransaction([payer.keyPair], transaction)
    await assert.rejects(validateSignedSvmTransaction(transaction, serializeSvmTransaction(partial)))
    const changed = await prepareSvmTransaction(fixture(1), connection())
    const signedChanged = await partiallySignTransaction([payer.keyPair], changed.transaction)
    await assert.rejects(validateSignedSvmTransaction(fixture(1), serializeSvmTransaction(signedChanged)), /wallet changed/)
    const signed = await partiallySignTransaction([payer.keyPair, coSigner.keyPair], transaction)
    const corrupt = serializeSvmTransaction(signed)
    corrupt[corrupt.length - 1] ^= 1
    await assert.rejects(validateSignedSvmTransaction(transaction, corrupt), /Invalid Solana transaction signature/)
})
test('fee estimation sends the prepared v1 message and returns total lamports', async t => {
    const prepared = await prepareSvmTransaction(fixture(1), connection())
    let fee: number | null = 55000
    t.mock.method(globalThis, 'fetch', async (_url, init) => {
        const request = JSON.parse(init.body)
        assert.equal(request.method, 'getFeeForMessage')
        assert.equal(request.params[0], getBase64Decoder().decode(prepared.transaction.messageBytes))
        return new Response(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: { context: { slot: 100 }, value: fee } }))
    })
    assert.equal(await getSvmTransactionFee(prepared.transaction, 'https://solana.test'), 55000n)
    fee = null
    await assert.rejects(getSvmTransactionFee(prepared.transaction, 'https://solana.test'), /Unable to estimate/)
})
for (const version of ['legacy', 0] as const) {
    test(`${version}: existing wallet adapters retain their transaction types`, async () => {
        const adapter = {
            name: 'Fixture wallet', supportedTransactionVersions: new Set(['legacy', 0]),
            async signTransaction(transaction: Transaction | VersionedTransaction) {
                assert.ok(version === 'legacy' ? transaction instanceof Transaction : transaction instanceof VersionedTransaction)
                const bytes = version === 'legacy'
                    ? (transaction as Transaction).serialize({ requireAllSignatures: false, verifySignatures: false })
                    : transaction.serialize()
                const signed = await partiallySignTransaction([payer.keyPair], getTransactionDecoder().decode(bytes))
                return version === 'legacy' ? Transaction.from(serializeSvmTransaction(signed)) : VersionedTransaction.deserialize(serializeSvmTransaction(signed))
            },
        } as SignerWalletAdapter
        const decoded = deserializeSvmTransaction(Buffer.from([0, ...fixture(version).messageBytes]).toString('base64'))
        const { transaction } = await prepareSvmTransaction(decoded, connection())
        await validateSignedSvmTransaction(transaction, await getSvmTransactionSigner(adapter, transaction)(transaction))
    })
}
function standardAdapter(versions: readonly (string | number)[]) {
    const wallet = {
        version: '1.0.0', name: 'Standard fixture', icon: 'data:image/svg+xml;base64,', chains: ['solana:mainnet'],
        accounts: [{ address: payer.address, publicKey: new PublicKey(payer.address).toBytes(), chains: ['solana:mainnet'], features: ['solana:signTransaction'] }],
        features: {
            'standard:events': { version: '1.0.0', on: () => () => {} },
            'standard:connect': { version: '1.0.0', connect: async () => ({ accounts: wallet.accounts }) },
            'solana:signTransaction': {
                version: '1.0.0', supportedTransactionVersions: versions,
                signTransaction: async ({ transaction }: { transaction: Uint8Array }) => [{
                    signedTransaction: serializeSvmTransaction(await partiallySignTransaction([payer.keyPair], getTransactionDecoder().decode(transaction))),
                }],
            },
        },
    }
    const adapter = new StandardWalletAdapter({ wallet: wallet as unknown as ConstructorParameters<typeof StandardWalletAdapter>[0]['wallet'] })
    Object.defineProperty(adapter, 'publicKey', { value: new PublicKey(payer.address) })
    return adapter as SignerWalletAdapter
}
test('Wallet Standard signs v1 only when the feature advertises version 1', async () => {
    const transaction = fixture(1)
    assert.throws(() => getSvmTransactionSigner(standardAdapter(['legacy', 0]), transaction), /does not support Solana v1/)
    const sign = getSvmTransactionSigner(standardAdapter(['legacy', 0, 1]), transaction)
    await validateSignedSvmTransaction(transaction, await sign(transaction))
})
test('unsupported manual wallets fail before a signing prompt', () => {
    assert.throws(() => getSvmTransactionSigner({ name: 'Legacy wallet', supportedTransactionVersions: null } as SignerWalletAdapter, fixture(1)), /does not support/)
})
function walletConnect(request: (payload: any) => Promise<unknown>) {
    const adapter = new SolanaWalletConnectAdapter({ network: WalletAdapterNetwork.Mainnet, options: { projectId: 'test' } })
    Object.assign(adapter, {
        _publicKey: new PublicKey(payer.address),
        _provider: { client: { request } },
        _session: { topic: 'fixture', namespaces: { solana: { methods: ['solana_signTransaction'] } } },
    })
    adapter.on('error', () => {})
    return adapter
}
test('WalletConnect transports full v1 bytes and preserves signatures', async () => {
    const transaction = fixture(1, { dataSize: 2000 })
    const adapter = walletConnect(async request => {
        assert.equal(request.request.method, 'solana_signTransaction')
        assert.equal(request.chainId, 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp')
        const decoded = deserializeSvmTransaction(request.request.params.transaction)
        return { transaction: encode(await partiallySignTransaction([payer.keyPair], decoded)) }
    })
    await validateSignedSvmTransaction(transaction, await getSvmTransactionSigner(adapter, transaction)(transaction))
})
test('WalletConnect rejects signature-only responses and propagates user rejection without retrying', async () => {
    const transaction = fixture(1)
    const incomplete = walletConnect(async () => ({ signature: 'signature-only' }))
    await assert.rejects(getSvmTransactionSigner(incomplete, transaction)(transaction), /full signed/)
    let calls = 0
    const rejected = walletConnect(async () => { calls++; throw new Error('User rejected the request.') })
    await assert.rejects(getSvmTransactionSigner(rejected, transaction)(transaction), /User rejected/)
    assert.equal(calls, 1)
})
function rpcFixture(signature: string, status: string | null = 'confirmed', error: unknown = null) {
    const response = { transaction: { signatures: [signature] }, meta: { err: error } }
    return {
        rpc: connection({
            sendRawTransaction: async () => signature,
            getSignatureStatus: async () => ({ context: { slot: 100 }, value: status ? { slot: 100, confirmations: 1, err: null, confirmationStatus: status } : null }),
            getBlockHeight: async () => 201,
            getTransaction: async (_id, options) => { assert.equal(options?.maxSupportedTransactionVersion, 1); return response },
        } as Partial<Connection>), response,
    }
}
for (const status of ['confirmed', 'finalized']) {
    test(`v1 transfer submits verified bytes and accepts ${status}`, async () => {
        const transaction = fixture(1)
        const signed = await partiallySignTransaction([payer.keyPair], transaction)
        const signature = getSignatureFromTransaction(signed)
        const { rpc } = rpcFixture(signature, status)
        let submissions = 0
        rpc.sendRawTransaction = async bytes => { submissions++; assert.deepEqual(new Uint8Array(bytes), serializeSvmTransaction(signed)); return signature }
        assert.equal(await configureAndSendCurrentTransaction(transaction, rpc, async () => serializeSvmTransaction(signed), { blockhash: originalHash, lastValidBlockHeight: 200 }, () => assert.fail('Unchanged message does not need another fee check')), signature)
        assert.equal(submissions, 1)
    })
}
test('expiry checks history before failing and supports preserved blockhashes', async () => {
    const { rpc } = rpcFixture('fixture', null)
    assert.equal(await transactionSenderAndConfirmationWaiter({ connection: rpc, serializedTransaction: new Uint8Array(), blockhashWithExpiryBlockHeight: { blockhash: originalHash, lastValidBlockHeight: 200 } }), null)
    rpc.isBlockhashValid = async () => ({ context: { slot: 100 }, value: false })
    assert.equal(await transactionSenderAndConfirmationWaiter({ connection: rpc, serializedTransaction: new Uint8Array(), blockhashWithExpiryBlockHeight: { blockhash: originalHash } }), null)
})
test('on-chain failures surface as errors', async () => {
    const transaction = fixture(1)
    const signed = await partiallySignTransaction([payer.keyPair], transaction)
    const { rpc } = rpcFixture(getSignatureFromTransaction(signed), 'confirmed', { InstructionError: [0, 'InsufficientFunds'] })
    await assert.rejects(configureAndSendCurrentTransaction(transaction, rpc, async () => serializeSvmTransaction(signed), { blockhash: originalHash }, () => assert.fail('Unchanged message does not need another fee check')), /InsufficientFunds/)
})
