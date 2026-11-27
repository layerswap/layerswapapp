import { NetworkType, type LayerswapNetwork } from '@layerswap/widget-types'

const SPECIFIC_NETWORKS_BY_CONNECTOR: { id: string; chainIds: number[] }[] = [
    {
        id: 'com.immutable.passport',
        chainIds: [13371, 13473],
    },
    {
        id: 'com.roninchain.wallet',
        chainIds: [2020, 1, 137, 8453, 56, 42161],
    },
    {
        id: 'app.phantom',
        chainIds: [1, 8453, 137, 143],
    },
]

export function resolveSupportedNetworks(supportedNetworks: string[], connectorId: string, networks: LayerswapNetwork[]): string[] {
    const specific = SPECIFIC_NETWORKS_BY_CONNECTOR.find(connector => connector.id === connectorId)
    if (specific) {
        return networks.filter(network => network.type === NetworkType.EVM
            && specific.chainIds.includes(Number(network.chain_id))
            && supportedNetworks.includes(network.name)).map(network => network.name)
    }
    return supportedNetworks
}
