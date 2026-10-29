import type { SwapPrerequisiteContext, SwapPrerequisiteProvider, SwapPrerequisiteResult } from '@layerswap/widget-types'

export type ResolvedSwapPrerequisite = { provider: SwapPrerequisiteProvider; result: SwapPrerequisiteResult }

export type SwapPrerequisiteSnapshot = { swapId: string; context: SwapPrerequisiteContext }

/** A create response is usable immediately, before the active swap has re-rendered. */
export function resolveExecutionPrerequisites(
    current: SwapPrerequisiteSnapshot | undefined,
    created: SwapPrerequisiteSnapshot | undefined,
    swapId = created?.swapId ?? current?.swapId,
): SwapPrerequisiteContext {
    const snapshot = current?.swapId === swapId ? current : created?.swapId === swapId ? created : undefined
    if (!snapshot) throw new Error('Swap details are unavailable. Return to the form before continuing.')
    return snapshot.context
}

export class SwapPrerequisiteError extends Error {
    constructor(public readonly prerequisites: ResolvedSwapPrerequisite[], message?: string) {
        const blocked = prerequisites.find(entry => entry.result.status !== 'ready')
        super(message ?? blocked?.result.description ?? blocked?.result.title ?? 'Account setup is required before continuing.')
        this.name = 'SwapPrerequisiteError'
    }
}

export function prerequisitesReady(entries: ResolvedSwapPrerequisite[]): boolean {
    return entries.every(entry => entry.result.status === 'ready')
}

export class SwapPrerequisiteResolver {
    constructor(private readonly providers: readonly SwapPrerequisiteProvider[] = []) { }

    supports(context: SwapPrerequisiteContext): boolean {
        return this.providers.some(provider => provider.supports(context))
    }

    async check(context: SwapPrerequisiteContext): Promise<ResolvedSwapPrerequisite[]> {
        return Promise.all(this.providers.filter(provider => provider.supports(context)).map(async provider => {
            let timer: ReturnType<typeof setTimeout> | undefined
            try {
                const result = await Promise.race([
                    provider.check(context),
                    new Promise<never>((_, reject) => {
                        timer = setTimeout(() => reject(new Error('Account check timed out')), 15_000)
                    }),
                ])
                return { provider, result }
            } catch {
                return { provider, result: {
                    status: 'unavailable' as const,
                    title: 'Couldn’t check account setup',
                    description: 'Check again before continuing with this transfer.',
                } }
            } finally {
                clearTimeout(timer)
            }
        }))
    }
}

/** Include endpoint and asset identity so configuration changes cannot reuse old readiness. */
export function swapPrerequisiteKey(context: SwapPrerequisiteContext): string {
    const networkKey = (network: SwapPrerequisiteContext['destination']['network']) =>
        [network.name, network.type, network.chain_id, network.node_url, network.nodes]
    const tokenKey = (token: SwapPrerequisiteContext['destination']['token']) =>
        [token.symbol, token.contract, token.decimals]
    const { source, destination, receiveAmount } = context
    return JSON.stringify([
        source && [networkKey(source.network), tokenKey(source.token), source.address, source.amount],
        networkKey(destination.network), tokenKey(destination.token), destination.address, receiveAmount,
    ])
}
