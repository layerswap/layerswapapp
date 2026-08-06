import type { Connector } from 'wagmi'
import type { CreateConnectorFn, Config } from '@wagmi/core'
import { getAccount } from '@wagmi/core'
import {
    createRegistryConnector,
    getIconByKey,
    resolveWalletIdentity,
    sleep,
    type DisplayUriSource,
    type RegistryConnector,
    type WalletConnectWalletBase,
} from '@layerswap/widget/internal'
import type { InternalConnector } from '@layerswap/widget/types'
import { HIDDEN_WALLETCONNECT_ID, name as PROVIDER_NAME } from '../constants'
import { explicitInjectedProviderDetected } from '../connectors/explicitInjectedProviderDetected'

const connectorIdentity = (connector: { id: string; name: string }) =>
    resolveWalletIdentity({
        rdns: connector.id.includes('.') ? connector.id : undefined,
        nativeId: connector.id,
        name: connector.name,
    })

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

/**
 * Registry-wallet connects (deep links / per-wallet QR) are executed through
 * the package's custom hidden WalletConnect connector. When the wagmi config
 * doesn't contain it — e.g. a host-supplied external config built without
 * `createHiddenWalletConnectConnector` — registry wallets must not be offered
 * at all, since every tap would fail at connect time.
 */
export const supportsRegistryConnects = (allConnectors: readonly Connector[]): boolean =>
    allConnectors.some(c => c.id === HIDDEN_WALLETCONNECT_ID)

export const splitRegistryWallets = (
    registryWallets: readonly WalletConnectWalletBase[],
    isMobilePlatform: boolean,
): { featured: RegistryConnector[]; additional: RegistryConnector[] } =>
    registryWallets.reduce<{ featured: RegistryConnector[]; additional: RegistryConnector[] }>((acc, wallet) => {
        const connector = createRegistryConnector(wallet, isMobilePlatform, PROVIDER_NAME)
        if (connector.identity?.catalog?.featuredRank != null) {
            acc.featured.push(connector)
        } else {
            acc.additional.push(connector)
        }
        return acc
    }, { featured: [], additional: [] })

export function dedupePreferInjected(arr: readonly Connector<CreateConnectorFn>[]): Connector<CreateConnectorFn>[] {
    const groups = new Map<string, Connector<CreateConnectorFn>[]>()
    for (const connector of arr) {
        const key = connectorIdentity(connector).id as string
        const group = groups.get(key)
        if (group) group.push(connector)
        else groups.set(key, [connector])
    }
    return [...groups.values()].flatMap(group => {
        const injected = group.filter(o => o.type === 'injected')
        return injected.length > 0 ? injected : group
    })
}

export function computeConfiguredConnectors({
    allConnectors,
}: {
    allConnectors: readonly Connector[]
}): InternalConnector[] {
    const activeBrowserWallet = explicitInjectedProviderDetected()
        && allConnectors.filter(c => c.id !== 'com.immutable.passport' && c.type === 'injected').length === 1

    const filterConnectors = (wallet: Connector): boolean => (
        (wallet.id === 'injected' ? activeBrowserWallet : true)
        && wallet.id !== HIDDEN_WALLETCONNECT_ID
    )

    return dedupePreferInjected(allConnectors.filter(filterConnectors))
        .map(w => {
            const identity = connectorIdentity(w)
            const isWalletConnectSupported = w.type === 'walletConnect' || w.name === 'WalletConnect'
            const type = ((w.type == 'injected' && w.id !== 'com.immutable.passport')
                || w.id === 'metaMaskSDK'
                || isWalletConnectSupported)
                ? w.type
                : 'other'

            return {
                ...w,
                type,
                isMobileSupported: isWalletConnectSupported,
                icon: w.icon || getIconByKey(identity.catalog?.iconKey),
                rdns: w.id.includes('.') ? w.id : undefined,
                identity,
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
