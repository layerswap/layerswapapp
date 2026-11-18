import { Provider, type FuelConnector } from '@fuel-ts/account'
import type { EnsureWalletChainOptions } from '@layerswap/wallet-core/types'
import { resolveFuelChainId, type KnownFuelNetwork } from './resolveFuelChainId'

type Options = EnsureWalletChainOptions & {
    connector: Pick<FuelConnector, 'currentNetwork' | 'selectNetwork'>
    chainId: string | number
    knownNetworks?: readonly KnownFuelNetwork[]
    displayName?: string
    allowSwitch?: boolean
    timeoutMs?: number
}

/** Send-time readiness owns one deadline for network reads, discovery and switching. */
export async function ensureFuelChain(options: Options): Promise<void> {
    const { connector, knownNetworks, allowSwitch = true, timeoutMs = 60_000 } = options
    const targetChainId = Number(options.chainId)
    if (options.chainId === '' || !Number.isSafeInteger(targetChainId) || targetChainId < 0) {
        throw new Error('Invalid Fuel chain ID')
    }
    options.signal?.throwIfAborted()

    const controller = new AbortController()
    const { signal } = controller
    const cancel = () => controller.abort(options.signal?.reason)
    options.signal?.addEventListener('abort', cancel, { once: true })
    const timer = setTimeout(() => {
        controller.abort(Object.assign(new Error('Timed out checking the Fuel wallet network'), { reasonCode: 'timeout' }))
    }, timeoutMs)
    let rejectAborted: (() => void) | undefined
    const aborted = new Promise<never>((_, reject) => {
        rejectAborted = () => reject(signal.reason)
        signal.addEventListener('abort', rejectAborted, { once: true })
    })

    async function request<T>(execute: () => Promise<T>): Promise<T> {
        signal.throwIfAborted()
        const result = await Promise.race([execute(), aborted])
        signal.throwIfAborted()
        return result
    }

    async function readChainId(): Promise<number> {
        const network = await request(() => connector.currentNetwork())
        const chainId = resolveFuelChainId(network, knownNetworks)
        if (chainId != null) {
            return chainId
        }
        // The operation deadline also bounds SDK requests shared with another
        // Provider. Our own discovery fetch uses the same cancellation signal.
        return request(() => new Provider(network.url, {
            fetch: (url, init) => fetch(url, { ...init, signal }),
            retryOptions: { maxRetries: 0 },
        }).getChainId())
    }

    try {
        if (await readChainId() === targetChainId) {
            return
        }
        if (!allowSwitch) {
            throw new Error(`Switch your Fuel wallet to ${options.displayName ?? `chain ${targetChainId}`} before sending`)
        }

        options.onSwitchStart?.()
        const switched = await request(() => connector.selectNetwork({ chainId: targetChainId }))
        if (!switched) {
            throw new Error('Could not switch the Fuel wallet network')
        }
        const actualChainId = await readChainId()
        if (actualChainId !== targetChainId) {
            throw new Error(`Fuel wallet is still on chain ${actualChainId}; expected ${targetChainId}`)
        }
    } finally {
        clearTimeout(timer)
        options.signal?.removeEventListener('abort', cancel)
        if (rejectAborted) {
            signal.removeEventListener('abort', rejectAborted)
        }
    }
}
