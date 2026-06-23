import { NetworkType, type NetworkWithTokens } from '@layerswap/widget/types'
import { KnownInternalNames } from '@layerswap/widget/internal'

export type EvmNetworkBuckets = {
    asSource: string[]
    withdrawal: string[]
    autofill: string[]
}

export function computeEvmNetworkBuckets(networks: NetworkWithTokens[]): EvmNetworkBuckets {
    const asSource = [
        ...networks.filter(n => n.type === NetworkType.EVM).map(n => n.name),
        KnownInternalNames.Networks.LoopringGoerli,
        KnownInternalNames.Networks.LoopringMainnet,
        KnownInternalNames.Networks.LoopringSepolia,
    ]
    const withdrawal = [
        ...asSource,
        KnownInternalNames.Networks.HyperliquidMainnet,
        KnownInternalNames.Networks.HyperliquidTestnet,
    ]
    const autofill = [
        ...withdrawal,
        KnownInternalNames.Networks.BrineMainnet
    ]
    return { asSource, withdrawal, autofill }
}
