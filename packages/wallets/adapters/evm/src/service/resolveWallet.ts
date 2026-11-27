import { NetworkType, type Wallet, type LayerswapNetwork } from '@layerswap/widget-types';
import type { Connector } from 'wagmi'
import { getDynamicWcMetadata, getPendingDynamicWcMetadata } from "@layerswap/wallet-core"
import { evmConnectorNameResolver, resolveEVMWalletConnectorIcon } from '../evmUtils'
import { EIP155_NAMESPACE, HIDDEN_WALLETCONNECT_ID } from '../constants'
import type { LSConnector } from '../connectors/types'
import { findEthereumNetwork } from './findEthereumNetwork'
import { resolveSupportedNetworks } from './resolveSupportedNetworks'

export type ResolveWalletProps<Network extends LayerswapNetwork = LayerswapNetwork> = {
    connection: {
        accounts: readonly [`0x${string}`, ...`0x${string}`[]]
        chainId: number
        connector: Connector
    } | undefined
    networks: Network[]
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

export function resolveWallet<Network extends LayerswapNetwork = LayerswapNetwork>(props: ResolveWalletProps<Network>): Wallet | undefined {
    const {
        activeConnection,
        connection,
        networks,
        disconnect,
        supportedNetworks,
        providerName,
    } = props
    const walletIsActive = activeConnection?.id === connection?.connector.id
    const addresses = connection?.accounts as (string[] | undefined)
    const activeAddress = activeConnection?.address
    const connector = connection?.connector
    if (!connector) return undefined
    const address = walletIsActive ? activeAddress : addresses?.[0]
    if (!address) return undefined

    const isHiddenConnector = connector.id === HIDDEN_WALLETCONNECT_ID
    const dynamicMetadata = isHiddenConnector
        ? (getPendingDynamicWcMetadata(EIP155_NAMESPACE) || getDynamicWcMetadata(EIP155_NAMESPACE, address))
        : null

    const walletName = dynamicMetadata?.name || connector.name
    const walletId = dynamicMetadata?.id || connector.id
    const walletIcon = dynamicMetadata?.icon || connector.icon

    const walletDisplayName = `${walletName} ${walletId === 'com.immutable.passport' ? '' : ' - EVM'}`

    const iconNetwork = walletId === 'com.immutable.passport'
        ? networks.find(network => network.type === NetworkType.EVM && Number(network.chain_id) === 13371)
        : findEthereumNetwork(networks)

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
        asSourceSupportedNetworks: resolveSupportedNetworks(supportedNetworks.asSource, walletId, networks),
        autofillSupportedNetworks: resolveSupportedNetworks(supportedNetworks.autofill, walletId, networks),
        withdrawalSupportedNetworks: resolveSupportedNetworks(supportedNetworks.withdrawal, walletId, networks),
        networkIcon: iconNetwork ? iconNetwork.logo : undefined,
        metadata: {
            connectorId: connector.id,
            connectorUid: connector.uid,
            deepLink: dynamicMetadata?.deepLink || (connector as LSConnector).deepLink,
            evmConnectorUid: connector.uid,
            walletConnectTopic: (connector as LSConnector).getSessionTopic?.(),
        },
    }
}
