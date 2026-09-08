import { KnownInternalNames } from "@layerswap/utils";const SPECIFIC_NETWORKS_BY_CONNECTOR: { id: string; supportedNetworks: string[] }[] = [
    {
        id: 'com.immutable.passport',
        supportedNetworks: [
            KnownInternalNames.Networks.ImmutableZkEVM,
            KnownInternalNames.Networks.ImmutableZkTestnet,
        ],
    },
    {
        id: 'com.roninchain.wallet',
        supportedNetworks: [
            KnownInternalNames.Networks.RoninMainnet,
            KnownInternalNames.Networks.EthereumMainnet,
            KnownInternalNames.Networks.PolygonMainnet,
            KnownInternalNames.Networks.BaseMainnet,
            KnownInternalNames.Networks.BNBChainMainnet,
            KnownInternalNames.Networks.ArbitrumMainnet,
        ],
    },
    {
        id: 'app.phantom',
        supportedNetworks: [
            KnownInternalNames.Networks.EthereumMainnet,
            KnownInternalNames.Networks.BaseMainnet,
            KnownInternalNames.Networks.PolygonMainnet,
            KnownInternalNames.Networks.MonadMainnet,
        ],
    },
]

export function resolveSupportedNetworks(supportedNetworks: string[], connectorId: string): string[] {
    const specific = SPECIFIC_NETWORKS_BY_CONNECTOR.find(c => c.id === connectorId)
    if (specific) {
        return specific.supportedNetworks.filter(n => supportedNetworks.includes(n))
    }
    return supportedNetworks
}
