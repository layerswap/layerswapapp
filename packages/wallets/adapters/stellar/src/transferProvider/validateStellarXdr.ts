import {
    Address,
    Operation,
    StrKey,
    Transaction,
    TransactionBuilder,
    nativeToScVal,
    scValToNative,
    xdr,
} from '@stellar/stellar-sdk'
import { bytesToHex } from '@layerswap/utils/common'
import { isValidStellarAddress } from '@layerswap/utils'
import { ActionMessageType } from '@layerswap/widget-types'
import type { Token as LayerswapToken } from '@layerswap/widget-types'
import { resolveStellarAsset } from '../stellarNetwork'

export type ValidateStellarXdrParams = {
    envelopeXdr: string
    networkPassphrase: string
    selectedAddress: string
    depositoryContract: string
    token: LayerswapToken
    amountInBaseUnits: string
    encodedArgs: readonly string[]
    swapSequenceNumber: number
    currentAccountSequence: string
    now?: number
}

export type BuildStellarDepositOperationParams = Omit<
    ValidateStellarXdrParams,
    'envelopeXdr' | 'currentAccountSequence' | 'now'
>

export type ValidateStellarOperationXdrParams = Omit<
    ValidateStellarXdrParams,
    'envelopeXdr' | 'currentAccountSequence' | 'now'
> & {
    operationXdr: string
}

function staleError(message: string): Error {
    const error = new Error(message)
    error.name = ActionMessageType.TransactionExpired
    return error
}

function readAddress(value: xdr.ScVal, label: string): string {
    try {
        return Address.fromScVal(value).toString()
    } catch {
        throw new Error(`Stellar depository ${label} is not an address`)
    }
}

function readBytes(value: xdr.ScVal, label: string): Uint8Array {
    const decoded = scValToNative(value) as unknown
    if (!(decoded instanceof Uint8Array)) {
        throw new Error(`Stellar depository ${label} is not bytes`)
    }
    return decoded
}

function readInteger(value: xdr.ScVal, label: string): bigint {
    const decoded = scValToNative(value) as unknown
    if (typeof decoded !== 'bigint') {
        throw new Error(`Stellar depository ${label} is not an integer`)
    }
    return decoded
}

function assertInvocation(
    invocation: xdr.InvokeContractArgs,
    expectedContract: string,
    expectedFunction: string,
    expectedArgs: readonly xdr.ScVal[],
    label: string,
): void {
    if (Address.fromScAddress(invocation.contractAddress).toString() !== expectedContract) {
        throw new Error(`Stellar ${label} contract does not match the deposit action`)
    }
    if (invocation.functionName.toString() !== expectedFunction) {
        throw new Error(`Stellar ${label} function does not match the deposit action`)
    }
    if (invocation.args.length !== expectedArgs.length) {
        throw new Error(`Stellar ${label} arguments do not match the deposit action`)
    }
    for (let index = 0; index < expectedArgs.length; index += 1) {
        if (bytesToHex(invocation.args[index].toXdr()) !== bytesToHex(expectedArgs[index].toXdr())) {
            throw new Error(`Stellar ${label} arguments do not match the deposit action`)
        }
    }
}

function encodeDepositId(sequenceNumber: number): string {
    if (!Number.isSafeInteger(sequenceNumber) || sequenceNumber < 0) {
        throw new Error('Stellar swap sequence number is invalid')
    }
    return BigInt(sequenceNumber).toString(16).padStart(64, '0')
}

function validateAddresses(selectedAddress: string, depositoryContract: string): void {
    if (!selectedAddress.startsWith('G') || !isValidStellarAddress(selectedAddress)) {
        throw new Error('Selected Stellar source account is invalid')
    }
    if (!StrKey.isValidContract(depositoryContract)) {
        throw new Error('Stellar depository destination must be a C-address')
    }
}

function validateExpectedArguments(params: {
    args: readonly xdr.ScVal[]
    selectedAddress: string
    tokenContract: string
    amountInBaseUnits: string
    encodedArgs: readonly string[]
    swapSequenceNumber: number
}): { receiver: string } {
    const { args, selectedAddress, tokenContract, amountInBaseUnits, encodedArgs, swapSequenceNumber } = params
    if (args.length !== 5) throw new Error('Stellar depository deposit must contain exactly five arguments')
    if (!/^[1-9]\d*$/.test(amountInBaseUnits)) throw new Error('Stellar deposit amount is invalid')

    const source = readAddress(args[0], 'source')
    const depositId = bytesToHex(readBytes(args[1], 'ID'))
    const assetContract = readAddress(args[2], 'asset contract')
    const receiver = readAddress(args[3], 'receiver')
    const amount = readInteger(args[4], 'amount').toString()
    const expectedDepositId = encodeDepositId(swapSequenceNumber)

    if (source !== selectedAddress) throw new Error('Stellar depository source does not match the connected account')
    if (depositId !== expectedDepositId) throw new Error('Stellar depository ID does not match the swap')
    if (assetContract !== tokenContract) throw new Error('Stellar depository asset does not match the quote')
    if (!StrKey.isValidEd25519PublicKey(receiver)) throw new Error('Stellar depository receiver is invalid')
    if (amount !== amountInBaseUnits) throw new Error('Stellar depository amount does not match the deposit action')

    const expectedEncodedArgs = [depositId, assetContract, receiver, amount]
    if (
        encodedArgs.length !== expectedEncodedArgs.length
        || encodedArgs.some((value, index) => value !== expectedEncodedArgs[index])
    ) {
        throw new Error('Stellar encoded_args do not match the transaction')
    }

    return { receiver }
}

function validateDepositOperation(
    operation: ReturnType<typeof Operation.fromXdrObject>,
    params: Pick<
        ValidateStellarXdrParams,
        'selectedAddress' | 'depositoryContract' | 'networkPassphrase' | 'token' | 'amountInBaseUnits' | 'encodedArgs' | 'swapSequenceNumber'
    >,
): { tokenContract: string; receiver: string } {
    const {
        selectedAddress,
        depositoryContract,
        networkPassphrase,
        token,
        amountInBaseUnits,
        encodedArgs,
        swapSequenceNumber,
    } = params

    if (operation.type !== 'invokeHostFunction') {
        throw new Error('Stellar deposit XDR must contain one Soroban contract invocation')
    }
    if (operation.source !== selectedAddress) {
        throw new Error('Stellar depository operation source does not match the connected account')
    }
    if (operation.func.type !== 'hostFunctionTypeInvokeContract') {
        throw new Error('Stellar deposit XDR must invoke the depository contract')
    }

    const invocation = operation.func.invokeContract
    if (Address.fromScAddress(invocation.contractAddress).toString() !== depositoryContract) {
        throw new Error('Stellar depository contract does not match the deposit action')
    }
    if (invocation.functionName.toString() !== 'deposit') {
        throw new Error('Stellar depository function must be deposit')
    }

    const tokenContract = resolveStellarAsset(token).contractId(networkPassphrase)
    const { receiver } = validateExpectedArguments({
        args: invocation.args,
        selectedAddress,
        tokenContract,
        amountInBaseUnits,
        encodedArgs,
        swapSequenceNumber,
    })
    return { tokenContract, receiver }
}

export function validateStellarOperationXdr(params: ValidateStellarOperationXdrParams): xdr.Operation {
    const { operationXdr, selectedAddress, depositoryContract } = params
    validateAddresses(selectedAddress, depositoryContract)
    if (!operationXdr) throw new Error('Stellar deposit action is missing operation XDR')

    let encodedOperation: xdr.Operation
    try {
        encodedOperation = xdr.Operation.fromXdr(operationXdr, 'base64')
    } catch (cause) {
        throw new Error('Stellar deposit action contains invalid operation XDR', { cause })
    }

    const operation = Operation.fromXdrObject(encodedOperation)
    validateDepositOperation(operation, params)
    if (operation.type !== 'invokeHostFunction' || (operation.auth?.length ?? 0) !== 0) {
        throw new Error('Unsigned Stellar depository operation must not contain authorization entries')
    }
    return encodedOperation
}

export function buildStellarDepositOperation(params: BuildStellarDepositOperationParams): xdr.Operation {
    const { selectedAddress, depositoryContract, encodedArgs } = params
    validateAddresses(selectedAddress, depositoryContract)
    if (encodedArgs.length !== 4) throw new Error('Stellar deposit must contain exactly four encoded_args')

    const [depositId, tokenContract, receiver, amount] = encodedArgs
    if (!/^[0-9a-f]{64}$/.test(depositId)) throw new Error('Stellar depository ID must be 32 hex-encoded bytes')
    if (!/^[1-9]\d*$/.test(amount)) throw new Error('Stellar deposit amount is invalid')
    if (!StrKey.isValidContract(tokenContract)) throw new Error('Stellar depository asset contract is invalid')
    if (!StrKey.isValidEd25519PublicKey(receiver)) throw new Error('Stellar depository receiver is invalid')

    const idBytes = Uint8Array.from({ length: 32 }, (_, index) => Number.parseInt(depositId.slice(index * 2, index * 2 + 2), 16))
    const operation = Operation.invokeContractFunction({
        contract: depositoryContract,
        function: 'deposit',
        source: selectedAddress,
        args: [
            new Address(selectedAddress).toScVal(),
            nativeToScVal(idBytes),
            new Address(tokenContract).toScVal(),
            new Address(receiver).toScVal(),
            nativeToScVal(BigInt(amount), { type: 'i128' }),
        ],
        auth: [],
    })
    validateDepositOperation(Operation.fromXdrObject(operation), params)
    return operation
}

export function validateStellarXdr(params: ValidateStellarXdrParams): Transaction {
    const {
        envelopeXdr,
        networkPassphrase,
        selectedAddress,
        depositoryContract,
        token,
        amountInBaseUnits,
        encodedArgs,
        swapSequenceNumber,
        currentAccountSequence,
        now = Math.floor(Date.now() / 1000),
    } = params

    validateAddresses(selectedAddress, depositoryContract)
    if (!envelopeXdr) throw new Error('Stellar deposit action is missing unsigned XDR')

    const parsed = TransactionBuilder.fromXdr(envelopeXdr, networkPassphrase)
    if (!(parsed instanceof Transaction)) throw new Error('Fee-bump Stellar transactions are not supported')
    if (parsed.networkPassphrase !== networkPassphrase) throw new Error('Stellar network passphrase mismatch')
    if (parsed.signatures.length !== 0) throw new Error('Stellar deposit XDR must be unsigned')
    if (parsed.source !== selectedAddress) throw new Error('Stellar transaction source does not match the connected account')
    if (!/^[1-9]\d*$/.test(parsed.fee)) throw new Error('Stellar transaction fee is invalid')
    if (parsed.memo.type !== 'none') throw new Error('Stellar depository transaction cannot contain a memo')
    if (
        parsed.ledgerBounds
        || parsed.minAccountSequence !== undefined
        || parsed.minAccountSequenceAge !== undefined
        || parsed.minAccountSequenceLedgerGap !== undefined
        || parsed.extraSigners !== undefined
    ) {
        throw new Error('Stellar depository transaction contains unexpected preconditions')
    }

    let expectedSequence: string
    try {
        expectedSequence = (BigInt(currentAccountSequence) + 1n).toString()
    } catch {
        throw new Error('Horizon returned an invalid Stellar account sequence')
    }
    if (parsed.sequence !== expectedSequence) throw staleError('Stellar deposit action has a stale account sequence')
    if (parsed.operations.length !== 1) throw new Error('Stellar deposit XDR must contain exactly one operation')

    const operation = parsed.operations[0]
    const { tokenContract, receiver } = validateDepositOperation(operation, {
        selectedAddress,
        depositoryContract,
        networkPassphrase,
        token,
        amountInBaseUnits,
        encodedArgs,
        swapSequenceNumber,
    })
    if (operation.type !== 'invokeHostFunction' || operation.func.type !== 'hostFunctionTypeInvokeContract') {
        throw new Error('Stellar deposit XDR must contain one Soroban contract invocation')
    }
    const invocation = operation.func.invokeContract

    const authorization = operation.auth
    if (!authorization || authorization.length !== 1) {
        throw new Error('Stellar depository transaction has unexpected authorization')
    }
    const entry = authorization[0]
    if (entry.credentials.type !== 'sorobanCredentialsSourceAccount') {
        throw new Error('Stellar depository transaction requires unsupported authorization')
    }
    const root = entry.rootInvocation
    if (root.function.type !== 'sorobanAuthorizedFunctionTypeContractFn' || root.subInvocations.length !== 1) {
        throw new Error('Stellar depository authorization tree is invalid')
    }
    assertInvocation(root.function.contractFn, depositoryContract, 'deposit', invocation.args, 'deposit authorization')

    const transfer = root.subInvocations[0]
    if (transfer.function.type !== 'sorobanAuthorizedFunctionTypeContractFn' || transfer.subInvocations.length !== 0) {
        throw new Error('Stellar asset authorization tree is invalid')
    }
    assertInvocation(
        transfer.function.contractFn,
        tokenContract,
        'transfer',
        [invocation.args[0], invocation.args[3], invocation.args[4]],
        'asset authorization',
    )
    if (readAddress(transfer.function.contractFn.args[1], 'authorized receiver') !== receiver) {
        throw new Error('Stellar asset authorization receiver does not match the deposit')
    }

    const bounds = parsed.timeBounds
    if (!bounds || bounds.minTime !== '0' || bounds.maxTime === '0') {
        throw new Error('Stellar deposit XDR must have bounded time conditions')
    }
    if (BigInt(bounds.maxTime) <= BigInt(now)) throw staleError('Stellar deposit action has expired')

    return parsed
}
