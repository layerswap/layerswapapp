import type { Connector } from 'wagmi'
import type { CreateConnectorFn, Config } from '@wagmi/core'
import { getAccount } from '@wagmi/core'
import {
    createRegistryConnector,
    DisplayUriSource,
    getKnownConnectorIconBase64,
    sleep,
    type RegistryConnector,
    type WalletConnectWalletBase,
} from '@layerswap/widget/internal'
import type { InternalConnector } from '@layerswap/widget/types'
import { evmConnectorNameResolver } from '../evmUtils'
import KnownEVMConnectorIds from '../evmUtils/knownConnectorIds'
import { explicitInjectedProviderDetected } from '../connectors/explicitInjectedProviderDetected'
import { featuredWalletsIds, HIDDEN_WALLETCONNECT_ID, name as PROVIDER_NAME } from '../constants'

const resolveEVMConnectorOrder = (id: string) =>
    KnownEVMConnectorIds.findIndex(known => known.toLowerCase() === id?.toLowerCase())

// Adapts a wagmi `Connector` to the shared `DisplayUriSource` contract.
// Subscribes synchronously to the connector's emitter — wagmi connectors
// (including the custom one in ./connectors/resolveConnectors/walletConnect.ts)
// re-emit `display_uri` as a `message` event via `config.emitter.emit('message',
// { type: 'display_uri', data: uri })`. Registering synchronously avoids a race
// where `display_uri` fires before an async `getProvider()` resolves, which
// would leave the QR modal stuck in the `loading` state.
export const wagmiDisplayUriSource = (connector: Connector): DisplayUriSource => ({
    onDisplayUri(listener) {
        const handler = ({ type, data }: { type: string; data?: unknown }) => {
            if (type === 'display_uri' && typeof data === 'string') listener(data)
        }
        connector.emitter.on('message', handler)
        return () => {
            try { connector.emitter.off('message', handler) } catch { /* noop */ }
        }
    },
})

export const isFeaturedRegistryWallet = (wallet: WalletConnectWalletBase): boolean => (
    featuredWalletsIds.includes(wallet.id.toLowerCase())
    || featuredWalletsIds.some(featuredId => wallet.name.toLowerCase().includes(featuredId))
)

export const splitRegistryConnectors = (
    configuredConnectors: InternalConnector[],
    registryWallets: WalletConnectWalletBase[],
    isMobilePlatform: boolean,
    providerName: string,
): { featured: RegistryConnector[]; additional: RegistryConnector[] } => {
    const existingConnectorKeys = new Set(
        configuredConnectors.flatMap(connector => [connector.id.toLowerCase(), connector.name.toLowerCase()]),
    )

    return registryWallets.reduce<{ featured: RegistryConnector[]; additional: RegistryConnector[] }>((acc, wallet) => {
        if (existingConnectorKeys.has(wallet.id.toLowerCase()) || existingConnectorKeys.has(wallet.name.toLowerCase())) {
            return acc
        }

        const connector = createRegistryConnector(wallet, isMobilePlatform, providerName)

        if (isFeaturedRegistryWallet(wallet)) {
            acc.featured.push(connector)
        } else {
            acc.additional.push(connector)
        }

        return acc
    }, { featured: [], additional: [] })
}

export function dedupePreferInjected(arr: readonly Connector<CreateConnectorFn>[]): Connector<CreateConnectorFn>[] {
    const getBaseId = (id: string) => id.includes('.') ? id.split('.').pop()! : id

    const groups = arr.reduce<Record<string, Connector<CreateConnectorFn>[]>>((acc, obj) => {
        const key = getBaseId(obj.name)
        ;(acc[key] = acc[key] || []).push(obj)
        return acc
    }, {})

    return Object.values(groups).flatMap(group => {
        const injected = group.filter(o => o.type === 'injected')
        return injected.length > 0 ? injected : group
    })
}

export function computeConfiguredConnectors({
    allConnectors,
    walletConnectConnectors,
    isMobilePlatform,
}: {
    allConnectors: readonly Connector[]
    walletConnectConnectors: readonly WalletConnectWalletBase[]
    isMobilePlatform: boolean
}): InternalConnector[] {
    const activeBrowserWallet = explicitInjectedProviderDetected()
        && allConnectors.filter(c => c.id !== 'com.immutable.passport' && c.type === 'injected').length === 1

    const filterConnectors = (wallet: Connector): boolean => (
        (wallet.id === 'injected' ? activeBrowserWallet : true)
        && wallet.id !== HIDDEN_WALLETCONNECT_ID
    )

    return dedupePreferInjected(allConnectors.filter(filterConnectors))
        .map(w => {
            const walletConnectWallet = walletConnectConnectors.find(w2 =>
                w2.name.toLowerCase().includes(w.name.toLowerCase())
                || w2.id.toLowerCase() === w.id.toLowerCase(),
            )
            const isWalletConnectSupported = w.type === 'walletConnect' || w.name === 'WalletConnect'
            const type = ((w.type == 'injected' && w.id !== 'com.immutable.passport')
                || w.id === 'metaMaskSDK'
                || isWalletConnectSupported)
                ? w.type
                : 'other'
            const resolvedConnectorName = evmConnectorNameResolver(w)
            const knownIconBase64 = getKnownConnectorIconBase64(resolvedConnectorName)

            return {
                ...w,
                order: resolveEVMConnectorOrder(w.id),
                type,
                isMobileSupported: isWalletConnectSupported,
                installUrl: walletConnectWallet?.installUrl,
                hasBrowserExtension: walletConnectWallet?.hasBrowserExtension,
                extensionNotFound: walletConnectWallet?.hasBrowserExtension ? (type == 'walletConnect' && !isMobilePlatform) : false,
                icon: w.icon || knownIconBase64 || walletConnectWallet?.icon,
                providerName: PROVIDER_NAME,
            }
        })
}

export async function attemptGetAccount(config: Config, maxAttempts = 5): Promise<ReturnType<typeof getAccount>> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const account = getAccount(config)
        if (account.address) return account
        await sleep(500)
    }
    return getAccount(config)
}
