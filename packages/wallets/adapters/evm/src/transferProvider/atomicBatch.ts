import { type Config } from '@wagmi/core'
import { isAddress } from 'viem'
import { sendCalls, getCallsStatus } from 'viem/actions'
import type { AtomicBatchCall, AtomicBatchProvider } from '@layerswap/widget-types'
import { foregroundWalletApp } from '@layerswap/wallet-core'
import { toTransferError } from './toTransferError'
import { createClientForConnector, getWalletCapabilityService, resolveSelectedConnector } from './walletCapabilities'

const UINT256_LIMIT = 2n ** 256n
const ZERO_ADDRESS = /^0x0{40}$/i
const HEX_BYTES = /^0x(?:[0-9a-fA-F]{2})*$/

// viem appends this marker to IDs for its local sequential fallback.
const SEQUENTIAL_BATCH_ID_SUFFIX = '5792'.repeat(16)
const DUPLICATE_BATCH_ID_CODE = 5720
const NON_SUBMISSION_CODES = new Set([
    -32601, // Method not found.
    -32602, // Invalid parameters.
    4100,   // Unauthorized.
    4200,   // Unsupported method.
    5700,   // Unsupported required capability.
    5710,   // Unsupported chain.
    5740,   // Batch too large.
    5750,   // Atomic wallet upgrade rejected.
    5760,   // Atomic execution not supported.
])
const providers = new WeakMap<Config, AtomicBatchProvider>()

/** Submit backend-built calls together and track the batch through its original wallet. */
export function createAtomicBatchProvider(config: Config): AtomicBatchProvider {
    const existingProvider = providers.get(config)
    if (existingProvider) {
        return existingProvider
    }

    const walletCapabilities = getWalletCapabilityService(config)

    const provider: AtomicBatchProvider = {
        async getCapabilities(context, options) {
            return (await walletCapabilities.getCapabilities(context, options)).atomic
        },

        async submit(context) {
            let walletRequestStarted = false
            try {
                const walletSnapshot = walletCapabilities.readWalletSnapshot(context)
                await walletCapabilities.assertLiveWalletUnchanged(context, walletSnapshot)
                if (walletSnapshot.currentChainId !== walletSnapshot.sourceChainId) {
                    throw new Error('Switch to the batch source chain')
                }

                const capability = await provider.getCapabilities(context, { fresh: true })
                if (capability !== 'supported') {
                    throw new Error('This wallet does not currently support atomic swaps')
                }

                const chain = config.chains.find(chain => chain.id === walletSnapshot.sourceChainId)
                if (!chain) {
                    throw new Error('Batch chain is not configured')
                }
                validateBatchCalls(context.calls)

                const client = await createClientForConnector(walletSnapshot.connector)
                await foregroundWalletApp(context.wallet.metadata?.deepLink)
                await walletCapabilities.assertLiveWalletUnchanged(context, walletSnapshot)
                assertBatchNotExpired(context.validBefore)

                context.onWalletPrompt?.()
                walletRequestStarted = true
                const result = await sendCalls(client, {
                    account: context.account as `0x${string}`,
                    chain,
                    calls: context.calls,
                    forceAtomic: true,
                    version: '2.0.0',
                    experimental_fallback: false,
                })

                if (!result || typeof result.id !== 'string' || !result.id.trim()) {
                    throw new Error('Wallet returned no batch ID; reconcile the swap before retrying.')
                }
                return { id: result.id }
            } catch (error) {
                const transferError = toTransferError(error)
                // After sending, an ambiguous error may hide an accepted batch.
                if (!walletRequestStarted || isProvenNonSubmission(error)) {
                    Object.assign(transferError, { atomicSubmission: 'not_submitted' })
                }
                throw transferError
            }
        },

        async getStatus(context, id) {
            if (id.endsWith(SEQUENTIAL_BATCH_ID_SUFFIX)) {
                throw new Error('Sequential batch IDs cannot be tracked as atomic execution')
            }

            const connector = resolveSelectedConnector(config, context.wallet, context.account)
            const client = await createClientForConnector(connector)
            return getCallsStatus(client, { id })
        },
    }

    providers.set(config, provider)
    return provider
}

function validateBatchCalls(calls: AtomicBatchCall[]): void {
    if (calls.length === 0) {
        throw new Error('Invalid batch calls')
    }
    for (const call of calls) {
        if (!isAddress(call.to) || ZERO_ADDRESS.test(call.to)) {
            throw new Error('Invalid batch calls')
        }
        if (!HEX_BYTES.test(call.data)) {
            throw new Error('Invalid batch calls')
        }
        if (typeof call.value !== 'bigint' || call.value < 0n || call.value >= UINT256_LIMIT) {
            throw new Error('Invalid batch calls')
        }
    }
}

function assertBatchNotExpired(validBefore: number): void {
    const nowInSeconds = Math.floor(Date.now() / 1000)
    if (!Number.isSafeInteger(validBefore) || validBefore <= nowInSeconds) {
        throw new Error('Batch expired. Refresh the quote before retrying.')
    }
}

function isProvenNonSubmission(error: unknown): boolean {
    const errorCodes = new Set<number>()
    let currentError = error
    // Wallet errors may wrap RPC errors in several causes.
    for (let depth = 0; depth < 10 && currentError && typeof currentError === 'object'; depth++) {
        const cause = currentError as { code?: unknown; cause?: unknown }
        if (typeof cause.code === 'number') {
            errorCodes.add(cause.code)
        }
        currentError = cause.cause
    }

    // A duplicate ID can refer to a batch that the wallet already accepted.
    if (errorCodes.has(DUPLICATE_BATCH_ID_CODE)) {
        return false
    }
    return [...errorCodes].some(code => NON_SUBMISSION_CODES.has(code))
}
