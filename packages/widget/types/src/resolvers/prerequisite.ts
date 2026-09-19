import type { Network, Token } from '../types'
import type { Wallet } from '../wallet'
import type { TransferProgress } from './transfer'

export type SwapPrerequisiteContext = {
    source?: { network: Network; token: Token; address?: string; amount?: string }
    destination: { network: Network; token: Token; address: string }
    /** Expected output, when known. Omitted for deposits with no fixed amount. */
    receiveAmount?: string
}

/** Presentation is supplied by the provider; consumers never interpret protocol error codes. */
export type SwapPrerequisiteResult = {
    status: 'ready' | 'required' | 'blocked' | 'pending' | 'unavailable'
    title?: string
    description?: string
    action?: {
        id: string
        label: string
        wallet: { network: Network; address: string; role: 'source' | 'destination' }
    }
}

export type SwapPrerequisiteExecution = {
    wallet: Wallet
    signal: AbortSignal
    onProgress?: (progress: TransferProgress | undefined) => void
}

/** Optional account preparation, independent of the source transfer and swap creation. */
export interface SwapPrerequisiteProvider {
    id: string
    supports(context: SwapPrerequisiteContext): boolean
    check(context: SwapPrerequisiteContext): Promise<SwapPrerequisiteResult>
    execute?(context: SwapPrerequisiteContext, actionId: string, execution: SwapPrerequisiteExecution): Promise<void>
}

/** Descriptors can offer read-only preflight without initializing a wallet connection. */
export class LazySwapPrerequisiteProvider implements SwapPrerequisiteProvider {
    private pending?: Promise<SwapPrerequisiteProvider>

    constructor(
        public readonly id: string,
        public readonly supports: SwapPrerequisiteProvider['supports'],
        private readonly load: () => Promise<SwapPrerequisiteProvider>,
    ) { }

    private resolve() {
        return this.pending ??= this.load().catch(error => {
            this.pending = undefined
            throw error
        })
    }

    async check(context: SwapPrerequisiteContext) {
        return (await this.resolve()).check(context)
    }

    async execute(context: SwapPrerequisiteContext, actionId: string, execution: SwapPrerequisiteExecution) {
        const provider = await this.resolve()
        execution.signal.throwIfAborted()
        if (!provider.execute) throw new Error('Complete account setup in your wallet, then check again.')
        await provider.execute(context, actionId, execution)
    }
}
