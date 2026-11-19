import { Operation, StrKey, Transaction, TransactionBuilder } from '@stellar/stellar-sdk'
import { foregroundWalletApp } from '@layerswap/wallet-core'
import { bytesToHex } from '@layerswap/utils/common'
import type { SwapPrerequisiteContext, SwapPrerequisiteProvider } from '@layerswap/widget-types'
import { resolveStellarAsset, resolveStellarNetworkPassphrase } from '../stellarNetwork'
import { getStellarHorizonServer } from '../stellarServers'
import { stellarKitManager } from '../service/stellarKitManager'
import { evaluateStellarRecipient, stellarRecipientAddress } from './stellarRecipient'
import { supportsStellarRecipient } from './supports'

const SETUP_TX_TIMEOUT_S = 180

function statusOf(error: unknown) {
    const value = error as { status?: number; response?: { status?: number } }
    return value?.status ?? value?.response?.status
}

function ownsAccount(wallet: { address: string; addresses?: string[] }, baseAddress: string) {
    return [wallet.address, ...(wallet.addresses ?? [])].some(address => {
        try {
            return stellarRecipientAddress(address) === baseAddress
        } catch {
            return false
        }
    })
}

async function readRecipient(context: SwapPrerequisiteContext) {
    const { network, token, address } = context.destination
    resolveStellarAsset(token)
    const networkPassphrase = resolveStellarNetworkPassphrase(network)
    const baseAddress = stellarRecipientAddress(address)
    const server = await getStellarHorizonServer(network, networkPassphrase)
    const [account, ledgers, baseFee] = await Promise.all([
        server.loadAccount(baseAddress).catch(error => {
            if (statusOf(error) === 404) return undefined
            throw error
        }),
        server.ledgers().order('desc').limit(1).call(),
        server.fetchBaseFee(),
    ])
    const reserve = ledgers.records[0]?.base_reserve_in_stroops
    if (!Number.isSafeInteger(reserve) || reserve <= 0 || !Number.isSafeInteger(baseFee) || baseFee <= 0) {
        throw new Error('Stellar reserve or fee is unavailable')
    }
    return { account, server, networkPassphrase, baseAddress, baseFee, reserve }
}

export function createStellarPrerequisiteProvider({ canSign = true }: { canSign?: boolean } = {}): SwapPrerequisiteProvider {
    return {
        id: 'stellar-recipient',
        supports: supportsStellarRecipient,
        async check(context) {
            // Contract accounts hold classic assets through the SAC and need no trustline.
            if (StrKey.isValidContract(context.destination.address.trim().toUpperCase())) return { status: 'ready' }
            const { account, reserve, baseFee } = await readRecipient(context)
            return evaluateStellarRecipient(context, account, BigInt(reserve), BigInt(baseFee), canSign)
        },
        async execute(context, actionId, { wallet, signal, onProgress }) {
            if (!canSign || actionId !== 'add-trustline') throw new Error('Complete token setup in your Stellar wallet, then check again.')
            try {
                const { account, server, networkPassphrase, baseAddress, baseFee, reserve } = await readRecipient(context)
                signal.throwIfAborted()
                const status = evaluateStellarRecipient(context, account, BigInt(reserve), BigInt(baseFee), canSign)
                if (status.status === 'ready') return
                if (status.status !== 'required' || !account) throw new Error(status.description ?? 'Check account setup again.')
                if (!ownsAccount(wallet, baseAddress)) throw new Error('Connect the Stellar account that owns the destination.')
                await stellarKitManager.revalidate(baseAddress, networkPassphrase)
                signal.throwIfAborted()
                const unsigned = new TransactionBuilder(account, { fee: String(baseFee), networkPassphrase })
                    .addOperation(Operation.changeTrust({ asset: resolveStellarAsset(context.destination.token) }))
                    .setTimeout(SETUP_TX_TIMEOUT_S)
                    .build()
                onProgress?.({ title: 'Enable token in your wallet', description: 'Approve the one-time trustline transaction in your Stellar wallet.' })
                await foregroundWalletApp(wallet.metadata?.deepLink)
                signal.throwIfAborted()
                const signed = await stellarKitManager.signTransaction(unsigned.toXdr(), networkPassphrase, baseAddress)
                signal.throwIfAborted()
                if (signed.signerAddress && signed.signerAddress !== baseAddress) throw new Error('The wallet signed with a different Stellar account.')
                const transaction = TransactionBuilder.fromXdr(signed.signedTxXdr, networkPassphrase)
                if (!(transaction instanceof Transaction) || !transaction.signatures.length || bytesToHex(transaction.hash()) !== bytesToHex(unsigned.hash())) {
                    throw new Error('The wallet changed the token setup transaction.')
                }
                onProgress?.({ title: 'Confirming token setup', description: 'Waiting for Stellar to confirm the trustline.' })
                const result = await server.submitTransaction(transaction)
                if (!result.successful) throw new Error('Stellar did not accept the trustline transaction. Check your XLM balance and try again.')
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error)
                if (/reject|declin|cancel|denied|closed/i.test(message) && !signal.aborted) {
                    throw new Error('Token setup was cancelled. You can try again when you’re ready.')
                }
                throw error
            } finally {
                onProgress?.(undefined)
            }
        },
    }
}

export const stellarPrerequisiteProvider = createStellarPrerequisiteProvider()
