import type { AppNetworkAdapter } from '@layerswap/ui-kit'

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

export function computeEvmNetworkBuckets<Network>(
    networks: Network[],
    networkAdapter: AppNetworkAdapter<Network>,
    additionalSupportedNetworks: EvmAdditionalSupportedNetworks = emptyAdditionalSupportedNetworks,
): EvmNetworkBuckets {
    const asSource = [
        ...networks
            .filter(network => networkAdapter.isEvmNetwork(network))
            .map(network => networkAdapter.getId(network)),
        ...additionalSupportedNetworks.asSource,
    ]
    const withdrawal = [
        ...asSource,
        ...additionalSupportedNetworks.withdrawal,
    ]
    const autofill = [
        ...withdrawal,
        ...additionalSupportedNetworks.autofill,
    ]
    return { asSource, withdrawal, autofill }
}
