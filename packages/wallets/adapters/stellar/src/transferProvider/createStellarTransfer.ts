import { Horizon, Transaction, TransactionBuilder, TransactionFailedError } from '@stellar/stellar-sdk'
import { bytesToHex } from '@layerswap/utils/common'
import { foregroundWalletApp } from '@layerswap/wallet-core'
import { ActionMessageType, NetworkType, type TransferProvider } from '@layerswap/widget-types'
import { resolveStellarNetworkPassphrase } from '../stellarNetwork'
import { stellarKitManager } from '../service/stellarKitManager'
import { validateStellarXdr } from './validateStellarXdr'

function mappedError(name: ActionMessageType, message: string, cause?: unknown): Error {
    const error = new Error(message, cause === undefined ? undefined : { cause })
    error.name = name
    return error
}

function isWalletRejection(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error)
    return /reject|declin|cancel|denied|closed/i.test(message)
}

function classifyTransferError(error: unknown): Error {
    if (error instanceof Error && Object.values(ActionMessageType).includes(error.name as ActionMessageType)) return error
    if (isWalletRejection(error)) {
        return mappedError(ActionMessageType.TransactionRejected, 'The Stellar transaction was rejected', error)
    }
    if (error instanceof TransactionFailedError) {
        const resultCodes = error.getResultCodes()
        if (
            resultCodes.transaction === 'tx_insufficient_balance'
            || resultCodes.operations.some(code => code === 'op_underfunded' || code === 'op_low_reserve')
        ) {
            return mappedError(ActionMessageType.InsufficientFunds, 'Insufficient Stellar balance or reserve', error)
        }
        if (resultCodes.transaction === 'tx_bad_seq' || resultCodes.transaction === 'tx_too_late') {
            // This failure happened after the user signed. Never classify it as
            // a preflight expiry: the widget retries only unsigned stale actions.
            return mappedError(ActionMessageType.TransactionFailed, 'The signed Stellar transaction became stale', error)
        }
        return mappedError(ActionMessageType.TransactionFailed, 'Horizon rejected the Stellar transaction', error)
    }
    const message = error instanceof Error ? error.message : String(error)
    return mappedError(ActionMessageType.UnexpectedErrorMessage, message || 'Stellar transaction failed', error)
}

export function createStellarTransfer(): TransferProvider {
    return {
        supportsNetwork: network => network.type === NetworkType.Stellar,

        async executeTransfer(params): Promise<string> {
            const {
                selectedWallet,
                depositAddress,
                network,
                token,
                callData,
                amountInBaseUnits,
                encodedArgs,
                sequenceNumber,
            } = params
            if (!selectedWallet?.address) throw new Error('Stellar wallet address not found')
            if (!depositAddress) throw new Error('Stellar depository contract not found')
            if (!amountInBaseUnits) throw new Error('Stellar deposit amount is missing')
            if (!encodedArgs) throw new Error('Stellar deposit encoded_args are missing')
            if (sequenceNumber === undefined) throw new Error('Stellar swap sequence number is missing')

            try {
                const networkPassphrase = resolveStellarNetworkPassphrase(network)
                const server = new Horizon.Server(network.node_url)
                const account = await server.loadAccount(selectedWallet.address)
                const unsignedTransaction = validateStellarXdr({
                    envelopeXdr: callData,
                    networkPassphrase,
                    selectedAddress: selectedWallet.address,
                    depositoryContract: depositAddress,
                    token,
                    amountInBaseUnits,
                    encodedArgs,
                    swapSequenceNumber: sequenceNumber,
                    currentAccountSequence: account.sequence,
                })
                await stellarKitManager.revalidate(selectedWallet.address, networkPassphrase)

                await foregroundWalletApp(selectedWallet.metadata?.deepLink)

                const signed = await stellarKitManager.signTransaction(
                    callData,
                    networkPassphrase,
                    selectedWallet.address,
                )
                if (signed.signerAddress && signed.signerAddress !== selectedWallet.address) {
                    throw mappedError(ActionMessageType.WaletMismatch, 'The Stellar wallet signed with a different account')
                }

                const signedTransaction = TransactionBuilder.fromXdr(signed.signedTxXdr, networkPassphrase)
                if (!(signedTransaction instanceof Transaction)) throw new Error('Wallet returned an unsupported fee-bump transaction')
                if (signedTransaction.signatures.length === 0) throw new Error('Wallet returned a Stellar transaction without a signature')
                if (bytesToHex(signedTransaction.hash()) !== bytesToHex(unsignedTransaction.hash())) {
                    throw new Error('Wallet changed the Stellar transaction while signing')
                }

                const result = await server.submitTransaction(signedTransaction)
                if (!result.successful || !result.hash) throw new Error('Horizon did not accept the Stellar transaction')
                return result.hash
            } catch (error) {
                throw classifyTransferError(error)
            }
        },
    }
}
