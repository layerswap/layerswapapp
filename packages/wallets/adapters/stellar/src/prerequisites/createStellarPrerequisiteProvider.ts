import { Operation, Transaction, TransactionBuilder, TransactionFailedError } from '@stellar/stellar-sdk'
import { foregroundWalletApp } from '@layerswap/wallet-core'
import { bytesToHex } from '@layerswap/utils/common'
import { NetworkType, type SwapPrerequisiteContext, type SwapPrerequisiteProvider } from '@layerswap/widget-types'
import { resolveStellarAsset, resolveStellarNetworkPassphrase } from '../stellarNetwork'
import { getStellarHorizonServer } from '../stellarServers'
import { stellarKitManager } from '../service/stellarKitManager'
import { evaluateStellarRecipient, stellarRecipientAddress } from './stellarRecipient'

type PendingSetup = { hash: string; expires: number }
const pending = new Map<string, PendingSetup>()
const executing = new Set<string>()
const STORAGE_PREFIX = 'layerswap:account-setup:'

function statusOf(error: unknown) {
    const value = error as { status?: number; response?: { status?: number } }
    return value?.status ?? value?.response?.status
}

function pendingSetup(key: string): PendingSetup | undefined {
    if (pending.has(key)) return pending.get(key)
    try {
        const value = JSON.parse(sessionStorage.getItem(STORAGE_PREFIX + key) ?? 'null')
        if (/^[a-f0-9]{64}$/.test(value?.hash) && Number.isSafeInteger(value?.expires)) {
            pending.set(key, value)
            return value
        }
    } catch { /* Storage is optional. */ }
}

function setPending(key: string, value?: PendingSetup) {
    if (value) pending.set(key, value)
    else pending.delete(key)
    try {
        if (value) sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
        else sessionStorage.removeItem(STORAGE_PREFIX + key)
    } catch { /* Storage is optional. */ }
}

function setupKey(context: SwapPrerequisiteContext) {
    const { network, token, address } = context.destination
    return `${resolveStellarNetworkPassphrase(network)}:${stellarRecipientAddress(address)}:${token.symbol}:${token.contract}`
}

export function createStellarPrerequisiteProvider({ canSign = true }: { canSign?: boolean } = {}): SwapPrerequisiteProvider {
    const read = async (context: SwapPrerequisiteContext) => {
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
        const ledger = ledgers.records[0]
        const reserve = ledger?.base_reserve_in_stroops
        if (!Number.isSafeInteger(reserve) || reserve <= 0 || !Number.isSafeInteger(baseFee) || baseFee <= 0) {
            throw new Error('Stellar reserve or fee is unavailable')
        }
        return { account, server, networkPassphrase, baseAddress, baseFee, reserve, ledger }
    }

    const check: SwapPrerequisiteProvider['check'] = async context => {
        if (!context.destination.token.contract && context.destination.token.symbol === 'XLM') return { status: 'ready' }
        const snapshot = await read(context)
        const key = setupKey(context)
        const previous = pendingSetup(key)
        if (previous) {
            const transaction = await snapshot.server.transactions().transaction(previous.hash).call().catch(error => {
                if (statusOf(error) === 404) return undefined
                throw error
            })
            // Wait for ledger time, not the browser clock, before allowing a fresh signature.
            const ledgerTime = Date.parse(snapshot.ledger.closed_at) / 1000
            if (transaction || ledgerTime > previous.expires + 30) setPending(key)
            else return {
                status: 'pending', title: 'Confirming token setup',
                description: 'Waiting for Stellar to confirm the trustline.',
            }
        }
        return evaluateStellarRecipient(context, snapshot.account, BigInt(snapshot.reserve), BigInt(snapshot.baseFee), canSign)
    }

    return {
        id: 'stellar-recipient',
        supports: context => context.destination.network.type === NetworkType.Stellar
            && (context.destination.token.symbol !== 'XLM' || !!context.destination.token.contract),
        check,
        async execute(context, actionId, { wallet, signal, onProgress }) {
            if (!canSign || actionId !== 'add-trustline') throw new Error('Complete token setup in your Stellar wallet, then check again.')
            const key = setupKey(context)
            if (executing.has(key)) throw new Error('Token setup is already in progress.')
            executing.add(key)
            try {
                const status = await check(context)
                signal.throwIfAborted()
                if (status.status === 'ready') return
                if (status.status !== 'required' || !status.action) throw new Error(status.description ?? 'The account is not ready for token setup.')
                const snapshot = await read(context)
                const fresh = evaluateStellarRecipient(context, snapshot.account, BigInt(snapshot.reserve), BigInt(snapshot.baseFee), canSign)
                if (fresh.status === 'ready') return
                if (fresh.status !== 'required' || !snapshot.account) throw new Error(fresh.description ?? 'Check account setup again.')
                if (stellarRecipientAddress(wallet.address) !== snapshot.baseAddress) throw new Error('Connect the Stellar account that owns the destination.')
                await stellarKitManager.revalidate(snapshot.baseAddress, snapshot.networkPassphrase)
                signal.throwIfAborted()
                const unsigned = new TransactionBuilder(snapshot.account, { fee: String(snapshot.baseFee), networkPassphrase: snapshot.networkPassphrase })
                    .addOperation(Operation.changeTrust({ asset: resolveStellarAsset(context.destination.token) }))
                    .setTimeout(180)
                    .build()
                onProgress?.({ title: 'Enable token in your wallet', description: 'Approve the one-time trustline transaction in your Stellar wallet.' })
                await foregroundWalletApp(wallet.metadata?.deepLink)
                signal.throwIfAborted()
                const signed = await stellarKitManager.signTransaction(unsigned.toXdr(), snapshot.networkPassphrase, snapshot.baseAddress)
                signal.throwIfAborted()
                if (signed.signerAddress && signed.signerAddress !== snapshot.baseAddress) throw new Error('The wallet signed with a different Stellar account.')
                const transaction = TransactionBuilder.fromXdr(signed.signedTxXdr, snapshot.networkPassphrase)
                if (!(transaction instanceof Transaction) || !transaction.signatures.length || bytesToHex(transaction.hash()) !== bytesToHex(unsigned.hash())) {
                    throw new Error('The wallet changed the token setup transaction.')
                }
                const hash = bytesToHex(transaction.hash())
                setPending(key, { hash, expires: Number(unsigned.timeBounds!.maxTime) })
                onProgress?.({ title: 'Confirming token setup', description: 'Waiting for Stellar to confirm the trustline.' })
                try {
                    const result = await snapshot.server.submitTransaction(transaction)
                    if (!result.successful) {
                        setPending(key)
                        throw new Error('Stellar did not accept the trustline transaction. Check your XLM balance and try again.')
                    }
                    setPending(key)
                } catch (error) {
                    if (error instanceof TransactionFailedError) setPending(key)
                    if (pendingSetup(key)) throw new Error('The transaction was submitted but confirmation is unavailable. Check again before retrying.')
                    throw error
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error)
                if (/reject|declin|cancel|denied|closed/i.test(message) && !signal.aborted) {
                    throw new Error('Token setup was cancelled. You can try again when you’re ready.')
                }
                throw error
            } finally {
                executing.delete(key)
                onProgress?.(undefined)
            }
        },
    }
}

export const stellarPrerequisiteProvider = createStellarPrerequisiteProvider()
