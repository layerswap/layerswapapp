import assert from 'node:assert/strict'
import test from 'node:test'
import {
    Account,
    Address,
    Asset,
    Keypair,
    Memo,
    Networks,
    Operation,
    StrKey,
    TransactionBuilder,
    encodeMuxedAccount,
    encodeMuxedAccountToAddress,
    nativeToScVal,
    xdr,
} from '@stellar/stellar-sdk'
import { baseUnitsToNumber } from '@layerswap/utils/common'
import { isValidStellarAddress } from '@layerswap/utils'
import {
    STELLAR_PUBLIC_PASSPHRASE,
    STELLAR_TESTNET_PASSPHRASE,
    resolveStellarAsset,
    resolveStellarNetworkPassphrase,
} from '../dist/esm/stellarNetwork.js'
import { validateStellarXdr } from '../dist/esm/transferProvider/validateStellarXdr.js'
import {
    createUnfundedStellarBalances,
    resolveStellarBalanceAmount,
} from '../dist/esm/stellarBalances.js'
import { toStellarConnector } from '../dist/esm/service/stellarConnector.js'

const sourceKey = Keypair.random()
const receiverKey = Keypair.random()
const issuerKey = Keypair.random()
const sourceSequence = '12345'
const swapSequenceNumber = 42
const amountInBaseUnits = '12500000'
const depositoryContract = Address.contract(new Uint8Array(32).fill(7)).toString()

const nativeToken = {
    symbol: 'XLM',
    decimals: 7,
    contract: null,
}
const issuedToken = {
    symbol: 'USDC',
    decimals: 7,
    contract: issuerKey.publicKey(),
}

function depositIdBytes(sequenceNumber) {
    const hex = BigInt(sequenceNumber).toString(16).padStart(64, '0')
    return Uint8Array.from(hex.match(/.{2}/g), byte => Number.parseInt(byte, 16))
}

function contractInvocation(contract, functionName, args) {
    return xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
        new xdr.InvokeContractArgs({
            contractAddress: new Address(contract).toScAddress(),
            functionName,
            args,
        }),
    )
}

function createAuthorization({ depository, tokenContract, args, extraTransfer = false }) {
    const transfer = new xdr.SorobanAuthorizedInvocation({
        function: contractInvocation(tokenContract, 'transfer', [args[0], args[3], args[4]]),
        subInvocations: [],
    })
    const root = new xdr.SorobanAuthorizedInvocation({
        function: contractInvocation(depository, 'deposit', args),
        subInvocations: extraTransfer ? [transfer, transfer] : [transfer],
    })
    return [new xdr.SorobanAuthorizationEntry({
        credentials: xdr.SorobanCredentials.sorobanCredentialsSourceAccount(),
        rootInvocation: root,
    })]
}

function buildFixture({
    networkPassphrase = Networks.TESTNET,
    token = nativeToken,
    depository = depositoryContract,
    receiver = receiverKey.publicKey(),
    amount = amountInBaseUnits,
    depositId = swapSequenceNumber,
    operationSource,
    secondOperation = false,
    functionName = 'deposit',
    extraAuthorizedTransfer = false,
    validBefore = Math.floor(Date.now() / 1000) + 600,
    memo,
} = {}) {
    const tokenContract = resolveStellarAsset(token).contractId(networkPassphrase)
    const args = [
        new Address(sourceKey.publicKey()).toScVal(),
        nativeToScVal(depositIdBytes(depositId)),
        new Address(tokenContract).toScVal(),
        new Address(receiver).toScVal(),
        nativeToScVal(BigInt(amount), { type: 'i128' }),
    ]
    const auth = createAuthorization({
        depository,
        tokenContract,
        args,
        extraTransfer: extraAuthorizedTransfer,
    })
    const builder = new TransactionBuilder(new Account(sourceKey.publicKey(), sourceSequence), {
        fee: '100',
        networkPassphrase,
    }).addOperation(Operation.invokeContractFunction({
        contract: depository,
        function: functionName,
        args,
        auth,
        ...(operationSource ? { source: operationSource } : {}),
    }))
    if (secondOperation) {
        builder.addOperation(Operation.payment({
            destination: receiver,
            asset: Asset.native(),
            amount: '0.1000000',
        }))
    }
    if (memo) builder.addMemo(memo)
    builder.setTimebounds(0, validBefore)
    const transaction = builder.build()
    return {
        transaction,
        networkPassphrase,
        token,
        depository,
        encodedArgs: [
            sourceKey.publicKey(),
            Buffer.from(depositIdBytes(depositId)).toString('hex'),
            tokenContract,
            receiver,
            amount,
        ],
        amount,
        depositId,
    }
}

function validateFixture(fixture, overrides = {}) {
    return validateStellarXdr({
        envelopeXdr: fixture.transaction.toXdr(),
        networkPassphrase: fixture.networkPassphrase,
        selectedAddress: sourceKey.publicKey(),
        depositoryContract: fixture.depository,
        token: fixture.token,
        amountInBaseUnits: fixture.amount,
        encodedArgs: fixture.encodedArgs,
        swapSequenceNumber: fixture.depositId,
        currentAccountSequence: sourceSequence,
        ...overrides,
    })
}

test('validates G- and M-address checksums and rejects C-addresses', () => {
    const raw = new Uint8Array(32).fill(7)
    const gAddress = StrKey.encodeEd25519PublicKey(raw)
    const mAddress = encodeMuxedAccountToAddress(encodeMuxedAccount(gAddress, '42'))
    const cAddress = StrKey.encodeContract(raw)
    const badChecksum = `${gAddress.slice(0, -1)}${gAddress.endsWith('A') ? 'B' : 'A'}`

    assert.equal(isValidStellarAddress(gAddress), true)
    assert.equal(isValidStellarAddress(mAddress), true)
    assert.equal(isValidStellarAddress(badChecksum), false)
    assert.equal(isValidStellarAddress(cAddress), false)
    assert.equal(isValidStellarAddress(`X${gAddress.slice(1)}`), false)
})

test('pins backend network IDs to their chain_id passphrases', () => {
    assert.equal(resolveStellarNetworkPassphrase({
        name: 'STELLAR_MAINNET',
        chain_id: STELLAR_PUBLIC_PASSPHRASE,
    }), Networks.PUBLIC)
    assert.equal(resolveStellarNetworkPassphrase({
        name: 'STELLAR_TESTNET',
        chain_id: STELLAR_TESTNET_PASSPHRASE,
    }), Networks.TESTNET)
    assert.throws(() => resolveStellarNetworkPassphrase({
        name: 'STELLAR_MAINNET',
        chain_id: Networks.TESTNET,
    }), /does not match/)
})

test('maps backend token fields to native and issued Stellar assets', () => {
    assert.equal(resolveStellarAsset(nativeToken).isNative(), true)
    const issued = resolveStellarAsset(issuedToken)
    assert.equal(issued.getCode(), 'USDC')
    assert.equal(issued.getIssuer(), issuerKey.publicKey())
    assert.throws(() => resolveStellarAsset({ ...issuedToken, contract: depositoryContract }), /issuer is invalid/)
})

test('validates native and issued-asset depository XDR on both networks', () => {
    const native = buildFixture()
    assert.equal(validateFixture(native).source, sourceKey.publicKey())

    const issued = buildFixture({ networkPassphrase: Networks.PUBLIC, token: issuedToken })
    assert.equal(validateFixture(issued).source, sourceKey.publicKey())
})

test('rejects security-sensitive depository XDR mismatches', () => {
    const fixture = buildFixture()
    const otherSource = Keypair.random().publicKey()
    const otherContract = Address.contract(new Uint8Array(32).fill(8)).toString()

    assert.throws(() => validateFixture(fixture, { selectedAddress: otherSource }), /source does not match/)
    assert.throws(() => validateFixture(fixture, { depositoryContract: otherContract }), /contract does not match/)
    assert.throws(() => validateFixture(fixture, { amountInBaseUnits: '1' }), /amount does not match/)
    assert.throws(() => validateFixture(fixture, { token: issuedToken }), /asset does not match/)
    assert.throws(() => validateFixture(fixture, { swapSequenceNumber: 43 }), /ID does not match/)
    assert.throws(() => validateFixture(fixture, {
        encodedArgs: fixture.encodedArgs.map((value, index) => index === 3 ? otherSource : value),
    }), /encoded_args do not match/)
    assert.throws(() => validateFixture(fixture, { currentAccountSequence: '12344' }), error => (
        error.name === 'TransactionExpired' && /stale account sequence/.test(error.message)
    ))

    const sourceOverride = buildFixture({ operationSource: otherSource })
    assert.throws(() => validateFixture(sourceOverride), /cannot override/)

    const extraOperation = buildFixture({ secondOperation: true })
    assert.throws(() => validateFixture(extraOperation), /exactly one operation/)

    const wrongFunction = buildFixture({ functionName: 'withdraw' })
    assert.throws(() => validateFixture(wrongFunction), /function must be deposit/)

    const extraAuthorization = buildFixture({ extraAuthorizedTransfer: true })
    assert.throws(() => validateFixture(extraAuthorization), /authorization tree is invalid/)

    const withMemo = buildFixture({ memo: Memo.id('42') })
    assert.throws(() => validateFixture(withMemo), /cannot contain a memo/)

    const expired = buildFixture({ validBefore: Math.floor(Date.now() / 1000) - 1 })
    assert.throws(() => validateFixture(expired), error => error.name === 'TransactionExpired')

    fixture.transaction.sign(sourceKey)
    assert.throws(() => validateFixture(fixture), /must be unsigned/)
})

test('maps spendable Horizon balances like the backend', () => {
    const balances = [
        {
            asset_type: 'native',
            balance: '12.5000000',
            selling_liabilities: '1.0000000',
        },
        {
            asset_type: 'credit_alphanum4',
            asset_code: 'USDC',
            asset_issuer: issuerKey.publicKey(),
            balance: '9.7500000',
            selling_liabilities: '0.2500000',
            is_authorized: true,
        },
    ]
    const reserve = {
        account: { subentry_count: 1, num_sponsoring: 0, num_sponsored: 0 },
        baseReserveInStroops: 5_000_000,
    }
    assert.equal(resolveStellarBalanceAmount(nativeToken, balances, reserve), 10)
    assert.equal(resolveStellarBalanceAmount(issuedToken, balances), 9.5)
    assert.equal(resolveStellarBalanceAmount({ ...issuedToken, symbol: 'EURC' }, balances), 0)
    assert.throws(() => resolveStellarBalanceAmount(issuedToken, [
        { ...balances[1], is_authorized: false },
    ]), /not authorized/)

    const network = {
        name: 'STELLAR_TESTNET',
        tokens: [nativeToken, issuedToken],
        token: nativeToken,
    }
    const unfunded = createUnfundedStellarBalances([nativeToken, issuedToken], network)
    assert.deepEqual(unfunded.map(balance => balance.amount), [0, 0])
    assert.ok(unfunded.every(balance => balance.error === undefined))
    assert.equal(baseUnitsToNumber(100n, 7), 0.00001)
})

test('marks web-based Stellar wallets as loadable instead of installed', () => {
    const connectors = [
        {
            id: 'albedo',
            name: 'Albedo',
            type: 'HOT_WALLET',
            isAvailable: true,
            isPlatformWrapper: false,
            icon: 'albedo.png',
            url: 'https://albedo.link/',
        },
        {
            id: 'xbull',
            name: 'xBull',
            type: 'HOT_WALLET',
            isAvailable: true,
            isPlatformWrapper: false,
            icon: 'xbull.png',
            url: 'https://xbull.app',
        },
        {
            id: 'freighter',
            name: 'Freighter',
            type: 'HOT_WALLET',
            isAvailable: true,
            isPlatformWrapper: false,
            icon: 'freighter.png',
            url: 'https://freighter.app',
        },
    ].map(toStellarConnector)
    const albedo = connectors.find(connector => connector.id === 'albedo')
    const xbull = connectors.find(connector => connector.id === 'xbull')
    const freighter = connectors.find(connector => connector.id === 'freighter')

    assert.equal(albedo?.type, 'injected')
    assert.equal(albedo?.isLoadable, true)
    assert.equal(albedo?.extensionNotFound, false)
    assert.equal(xbull?.type, 'injected')
    assert.equal(xbull?.isLoadable, true)
    assert.equal(xbull?.extensionNotFound, false)
    assert.equal(freighter?.type, 'injected')
    assert.equal(freighter?.isLoadable, false)
})
