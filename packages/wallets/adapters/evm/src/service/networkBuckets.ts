import { NetworkType, type LayerswapNetwork } from '@layerswap/widget-types';

export type EvmNetworkBuckets = {
    asSource: string[]
    withdrawal: string[]
    autofill: string[]
}

export type EvmAdditionalSupportedNetworks = {
    asSource: readonly string[]
    withdrawal: readonly string[]
    autofill: readonly string[]
}

const emptyAdditionalSupportedNetworks: EvmAdditionalSupportedNetworks = {
    asSource: [],
    withdrawal: [],
    autofill: [],
}

export function computeEvmNetworkBuckets<Network extends LayerswapNetwork = LayerswapNetwork>(
    networks: Network[],
    additionalSupportedNetworks: EvmAdditionalSupportedNetworks = emptyAdditionalSupportedNetworks,
): EvmNetworkBuckets {
    const asSource = [
        ...networks
            .filter(network => network.type === NetworkType.EVM)
            .map(network => network.name),
        ...additionalSupportedNetworks.asSource,
    ]
    const withdrawal = [
        ...asSource,
        ...networks.filter(network => network.type === NetworkType.Hyperliquid || network.type === NetworkType.Polymarket).map(network => network.name),
        ...additionalSupportedNetworks.withdrawal,
    ]
    const autofill = [
        ...withdrawal,
        ...additionalSupportedNetworks.autofill,
    ]
    return { asSource, withdrawal, autofill }
}
