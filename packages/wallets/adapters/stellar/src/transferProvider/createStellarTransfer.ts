import { Transaction, TransactionBuilder } from '@stellar/stellar-sdk'
import { bytesToHex } from '@layerswap/utils/common'
import { foregroundWalletApp } from '@layerswap/wallet-core'
import { walletActionError } from '@layerswap/wallet-core/errors'
import { ActionMessageType, NetworkType, type TransferProvider } from '@layerswap/widget-types'
import { resolveStellarNetworkPassphrase } from '../stellarNetwork'
import { getStellarHorizonServer, getStellarRpcServer } from '../stellarServers'
import { stellarKitManager } from '../service/stellarKitManager'
import { buildStellarDepositOperation, validateStellarXdr } from './validateStellarXdr'
import { toSigningError, toTransferError } from './toTransferError'

const TRANSACTION_TIMEOUT_SECONDS = 5 * 60

export function createStellarTransfer(): TransferProvider {
    return {
        supportsNetwork: network => network.type === NetworkType.Stellar,

        async executeTransfer(params): Promise<string> {
            const {
                selectedWallet,
                depositAddress,
                network,
                token,
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
                const operation = buildStellarDepositOperation({
                    networkPassphrase,
                    selectedAddress: selectedWallet.address,
                    depositoryContract: depositAddress,
                    token,
                    amountInBaseUnits,
                    encodedArgs,
                    swapSequenceNumber: sequenceNumber,
                })
                const [horizonServer, rpcServer] = await Promise.all([
                    getStellarHorizonServer(network, networkPassphrase),
                    getStellarRpcServer(network, networkPassphrase),
                ])
                const [account, baseFee] = await Promise.all([
                    horizonServer.loadAccount(selectedWallet.address),
                    horizonServer.fetchBaseFee(),
                ])
                if (!Number.isSafeInteger(baseFee) || baseFee <= 0) {
                    throw new Error('Horizon returned an invalid Stellar base fee')
                }
                const currentAccountSequence = account.sequence
                const preparedTransaction = await rpcServer.prepareTransaction(
                    new TransactionBuilder(account, {
                        fee: baseFee.toString(),
                        networkPassphrase,
                    })
                        .addOperation(operation)
                        .setTimeout(TRANSACTION_TIMEOUT_SECONDS)
                        .build(),
                )
                const preparedXdr = preparedTransaction.toXdr()
                const unsignedTransaction = validateStellarXdr({
                    envelopeXdr: preparedXdr,
                    networkPassphrase,
                    selectedAddress: selectedWallet.address,
                    depositoryContract: depositAddress,
                    token,
                    amountInBaseUnits,
                    encodedArgs,
                    swapSequenceNumber: sequenceNumber,
                    currentAccountSequence,
                })
                await stellarKitManager.revalidate(selectedWallet.address, networkPassphrase)

                await foregroundWalletApp(selectedWallet.metadata?.deepLink)

                let signed: Awaited<ReturnType<typeof stellarKitManager.signTransaction>>
                try {
                    signed = await stellarKitManager.signTransaction(
                        preparedXdr,
                        networkPassphrase,
                        selectedWallet.address,
                    )
                } catch (error) {
                    // The only stage where a decline can happen: the wallet prompt.
                    throw toSigningError(error)
                }
                if (signed.signerAddress && signed.signerAddress !== selectedWallet.address) {
                    throw walletActionError(ActionMessageType.WaletMismatch, { message: 'The Stellar wallet signed with a different account' })
                }

                const signedTransaction = TransactionBuilder.fromXdr(signed.signedTxXdr, networkPassphrase)
                if (!(signedTransaction instanceof Transaction)) throw new Error('Wallet returned an unsupported fee-bump transaction')
                if (signedTransaction.signatures.length === 0) throw new Error('Wallet returned a Stellar transaction without a signature')
                if (bytesToHex(signedTransaction.hash()) !== bytesToHex(unsignedTransaction.hash())) {
                    throw new Error('Wallet changed the Stellar transaction while signing')
                }

                const result = await horizonServer.submitTransaction(signedTransaction)
                if (!result.successful || !result.hash) throw new Error('Horizon did not accept the Stellar transaction')
                return result.hash
            } catch (error) {
                throw toTransferError(error)
            }
        },
    }
}
