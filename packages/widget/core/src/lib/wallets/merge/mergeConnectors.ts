import { createRegistryConnector } from '@/lib/walletConnect/createRegistryConnector'
import { getRegistryEntry, type WalletConnectWalletBase } from '@/lib/walletConnect/types'
import type { InternalConnector } from '@/types/wallet'
import type { WalletCatalogEntry } from '../catalog/types'
import { resolveConnectorIdentity } from '../identity'
import { getIconByKey } from '../utils/knownConnectorIcons'

export type MergedWallet = {
    key: string
    displayName: string
    icon?: string
    installUrl?: string
    hasBrowserExtension?: boolean
    primary: InternalConnector
    variants: InternalConnector[]
    isMultiChain: boolean
    featuredRank?: number
    registryOrder?: number
    installed: boolean
    isRegistryOnly: boolean
    registryEntry?: WalletConnectWalletBase
    catalog?: WalletCatalogEntry
}

export type MergeResult = {
    wallets: Map<string, MergedWallet>
    keyOf: (connector: InternalConnector) => string | undefined
}

type MergeOptions = {
    providers: { name: string }[]
    isMobilePlatform: boolean
}

const isInstalledConnector = (c: InternalConnector): boolean =>
    c.type === 'injected' && !c.isLoadable

const candidateScore = (c: InternalConnector): number => {
    if (isInstalledConnector(c)) return 40
    if (c.type === 'injected') return 30
    if (!getRegistryEntry(c)) return 20
    return 10
}

const NAMESPACE_TO_PROVIDER: Record<string, string> = { eip155: 'EVM', solana: 'Solana' }

type MergeRecord = {
    byProvider: Map<string, InternalConnector>
    entry?: WalletConnectWalletBase
    entryStronglyMatched?: boolean
    catalog?: WalletCatalogEntry
}

export function mergeConnectors(pool: InternalConnector[], { providers, isMobilePlatform }: MergeOptions): MergeResult {
    const keyByConnector = new Map<InternalConnector, string>()
    const rdnsToKey = new Map<string, string>()
    const records = new Map<string, MergeRecord>()

    const rdnsOf = (c: InternalConnector): string | undefined =>
        (c.rdns ?? getRegistryEntry(c)?.rdns)?.toLowerCase()

    for (const c of pool) {
        if (!c?.name) continue
        const identity = resolveConnectorIdentity(c)
        const rdns = rdnsOf(c)

        let key: string
        if (identity.catalog) {
            key = identity.id
        } else if (rdns) {
            key = rdnsToKey.get(rdns) ?? identity.id
            if (!rdnsToKey.has(rdns)) rdnsToKey.set(rdns, key)
        } else {
            key = identity.id
        }
        keyByConnector.set(c, key)

        let record = records.get(key)
        if (!record) {
            record = { byProvider: new Map() }
            records.set(key, record)
        }
        if (!record.catalog) record.catalog = identity.catalog

        if (c.providerName) {
            const existing = record.byProvider.get(c.providerName)
            if (!existing || candidateScore(c) > candidateScore(existing)) {
                record.byProvider.set(c.providerName, c)
            }
        }

        const entry = getRegistryEntry(c)
        if (entry) {
            const strong = identity.matchedBy === 'rdns' || identity.matchedBy === 'registryId'
            if (!record.entry || (strong && !record.entryStronglyMatched)) {
                record.entry = entry
                record.entryStronglyMatched = strong
            }
        }
    }

    const wallets = new Map<string, MergedWallet>()
    for (const [key, record] of records) {
        if (record.entry) {
            for (const chain of record.entry.chains ?? []) {
                const providerName = NAMESPACE_TO_PROVIDER[chain.split(':')[0]]
                if (
                    providerName
                    && providers.some(p => p.name === providerName)
                    && !record.byProvider.has(providerName)
                ) {
                    record.byProvider.set(providerName, createRegistryConnector(record.entry, isMobilePlatform, providerName))
                }
            }
        }

        const variants = [...record.byProvider.values()].sort((a, b) =>
            providers.findIndex(p => p.name === a.providerName)
            - providers.findIndex(p => p.name === b.providerName))
        if (!variants.length) continue

        const primary = variants.reduce((best, v) => candidateScore(v) > candidateScore(best) ? v : best, variants[0])

        wallets.set(key, {
            key,
            displayName: record.catalog?.displayName ?? primary.name,
            icon: primary.icon ?? getIconByKey(record.catalog?.iconKey) ?? record.entry?.icon,
            installUrl: primary.installUrl ?? record.catalog?.installUrls?.chrome ?? record.entry?.installUrl,
            hasBrowserExtension: primary.hasBrowserExtension ?? record.entry?.hasBrowserExtension,
            primary,
            variants,
            isMultiChain: variants.length > 1,
            featuredRank: record.catalog?.featuredRank,
            registryOrder: record.entry?.order,
            installed: variants.some(isInstalledConnector),
            isRegistryOnly: variants.every(v => !!getRegistryEntry(v)),
            registryEntry: record.entry,
            catalog: record.catalog,
        })
    }

    return {
        wallets,
        keyOf: connector => keyByConnector.get(connector) ?? resolveConnectorIdentity(connector).id,
    }
}
