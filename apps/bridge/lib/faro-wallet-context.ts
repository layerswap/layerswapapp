import type { WalletConnectionProvider } from '@layerswap/wallet-core/types'

export type ConnectedWalletContext = {
    wallet_address: string
    wallet_family: string
    wallet_connector: string
    wallet_chain_id?: string
}

// Bound the complete JSON, never truncate inside an address or JSON record.
// Leave headroom under the existing 8,192-character sanitizer limit.
export const MAX_WALLET_CONTEXT_BYTES = 6_000
const families = new Set(['evm', 'starknet', 'fuel', 'paradex', 'bitcoin', 'ton', 'solana', 'tron'])

function boundedString(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 && value.length <= 256 ? value : undefined
}

/** Projects only current connected-account data; never serialize provider metadata. */
export function getWalletSessionAttributes(providers: readonly WalletConnectionProvider[]): Record<string, string> {
    const records = new Map<string, ConnectedWalletContext>()
    let omitted = 0
    let restoring = false
    for (const provider of providers) {
        if (provider.pendingSessionRestore || (!provider.isStub && !provider.ready)) restoring = true
        if (provider.isStub) continue
        for (const wallet of provider.connectedWallets ?? []) {
            const address = boundedString(wallet.address)
            const connector = boundedString(wallet.internalId) ?? boundedString(wallet.id)
            if (!address || !connector) { omitted++; continue }
            const chainId = typeof wallet.chainId === 'number'
                ? (Number.isSafeInteger(wallet.chainId) && wallet.chainId >= 0 ? String(wallet.chainId) : undefined)
                : boundedString(wallet.chainId)
            const record: ConnectedWalletContext = {
                wallet_address: address,
                wallet_family: families.has(provider.id) ? provider.id : 'unknown',
                wallet_connector: connector,
                ...(chainId === undefined ? {} : { wallet_chain_id: chainId }),
            }
            records.set(JSON.stringify(record), record)
        }
    }
    // Stable ordering avoids metadata writes when provider array order changes.
    const selected: ConnectedWalletContext[] = []
    for (const key of [...records.keys()].sort()) {
        const record = records.get(key)!
        if (new TextEncoder().encode(JSON.stringify([...selected, record])).length > MAX_WALLET_CONTEXT_BYTES) {
            omitted++
        }
        else selected.push(record)
    }
    return {
        connected_wallets: JSON.stringify(selected),
        connected_wallet_count: String(selected.length),
        connected_wallets_omitted: String(omitted),
        connected_wallets_state: restoring ? 'restoring' : providers.length ? 'ready' : 'unavailable',
    }
}
