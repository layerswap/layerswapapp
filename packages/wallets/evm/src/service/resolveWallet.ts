import type { Connector } from 'wagmi'
import type { NetworkWithTokens, Wallet } from '@layerswap/widget/types'
import { getDynamicWcMetadata, getPendingDynamicWcMetadata } from '@layerswap/widget/internal'
import { evmConnectorNameResolver, resolveEVMWalletConnectorIcon } from '../evmUtils'
import { ethereumNames, HIDDEN_WALLETCONNECT_ID, immutableZKEvm } from '../constants'
import type { LSConnector } from '../connectors/types'
import { resolveSupportedNetworks } from './resolveSupportedNetworks'

const EVM_NS = 'eip155'

export type ResolveWalletProps = {
    connection: {
        accounts: readonly [`0x${string}`, ...`0x${string}`[]]
        chainId: number
        connector: Connector
    } | undefined
    networks: NetworkWithTokens[]
    activeConnection: {
        id: string
        address: string
    } | undefined
    disconnect: (connectorName: string) => Promise<void>
    supportedNetworks: {
        asSource: string[]
        autofill: string[]
        withdrawal: string[]
    }
    providerName: string
}

export function resolveWallet(props: ResolveWalletProps): Wallet | undefined {
    const { activeConnection, connection, networks, disconnect, supportedNetworks, providerName } = props
    const walletIsActive = activeConnection?.id === connection?.connector.id
    const addresses = connection?.accounts as (string[] | undefined)
    const activeAddress = activeConnection?.address
    const connector = connection?.connector
    if (!connector) return undefined
    const address = walletIsActive ? activeAddress : addresses?.[0]
    if (!address) return undefined

    const isHiddenConnector = connector.id === HIDDEN_WALLETCONNECT_ID
    const dynamicMetadata = isHiddenConnector
        ? (getDynamicWcMetadata(EVM_NS, address) || getPendingDynamicWcMetadata(EVM_NS))
        : null

    const walletName = dynamicMetadata?.name || connector.name
    const walletId = dynamicMetadata?.id || connector.id
    const walletIcon = dynamicMetadata?.icon || connector.icon

    const walletDisplayName = `${walletName} ${walletId === 'com.immutable.passport' ? '' : ' - EVM'}`

    return {
        chainId: connection?.chainId,
        id: walletName,
        internalId: walletId,
        isActive: walletIsActive,
        address,
        addresses: addresses || [address],
        displayName: walletDisplayName,
        providerName,
        icon: resolveEVMWalletConnectorIcon({ connector: evmConnectorNameResolver(connector), iconUrl: walletIcon }),
        disconnect: () => disconnect(connector.name),
        asSourceSupportedNetworks: resolveSupportedNetworks(supportedNetworks.asSource, walletId),
        autofillSupportedNetworks: resolveSupportedNetworks(supportedNetworks.autofill, walletId),
        withdrawalSupportedNetworks: resolveSupportedNetworks(supportedNetworks.withdrawal, walletId),
        networkIcon: networks.find(n =>
            walletId === 'com.immutable.passport'
                ? immutableZKEvm.some(name => name === n.name)
                : ethereumNames.some(name => name === n.name),
        )?.logo,
        metadata: {
            deepLink: (connector as LSConnector).deepLink,
        },
    }
}
