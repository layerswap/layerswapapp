import type { SwapPrerequisiteContext, SwapPrerequisiteProvider, SwapPrerequisiteResult } from '@layerswap/widget-types'

export type ResolvedSwapPrerequisite = { provider: SwapPrerequisiteProvider; result: SwapPrerequisiteResult }

const CHECK_TIMEOUT_MS = 15_000

export function prerequisitesReady(entries: ResolvedSwapPrerequisite[]): boolean {
    return entries.every(entry => entry.result.status === 'ready')
}

export function firstBlockingPrerequisite(entries: ResolvedSwapPrerequisite[]): SwapPrerequisiteResult | undefined {
    return entries.find(entry => entry.result.status !== 'ready')?.result
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
                        timer = setTimeout(() => reject(new Error('Account check timed out')), CHECK_TIMEOUT_MS)
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

/** Includes endpoint and asset identity so configuration changes cannot reuse old readiness. */
export function swapPrerequisiteKey({ destination: { network, token, address }, receiveAmount }: SwapPrerequisiteContext): string {
    return JSON.stringify([
        [network.name, network.type, network.chain_id, network.node_url, network.nodes],
        [token.symbol, token.contract, token.decimals],
        address,
        receiveAmount,
    ])
}
