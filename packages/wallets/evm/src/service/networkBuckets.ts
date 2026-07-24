import { NetworkType, type NetworkWithTokens } from '@layerswap/widget/types'
import { KnownInternalNames } from '@layerswap/widget/internal'
import { HYPERLIQUID_ROUTES } from '../additionalProviders/hyperliquid/routes'
import { POLYMARKET_CONFIG } from '../additionalProviders/polymarket/constants'

export type EvmNetworkBuckets = {
    asSource: string[]
    withdrawal: string[]
    autofill: string[]
}

// Extended sources are withdrawal-capable through this package's EVM wallets.
// Derived from the providers' own route configs so a network added there
// automatically gets wallet-withdrawal support — a hand-maintained copy here
// would silently hide the wallet-funded route for any name it misses.
const extendedWithdrawalNetworks = [
    ...Object.keys(HYPERLIQUID_ROUTES),
    ...Object.keys(POLYMARKET_CONFIG),
]

export function computeEvmNetworkBuckets(networks: NetworkWithTokens[]): EvmNetworkBuckets {
    const asSource = [
        ...networks.filter(n => n.type === NetworkType.EVM).map(n => n.name),
        KnownInternalNames.Networks.LoopringGoerli,
        KnownInternalNames.Networks.LoopringMainnet,
        KnownInternalNames.Networks.LoopringSepolia,
    ]
    const withdrawal = [
        ...asSource,
        ...extendedWithdrawalNetworks,
    ]
    const autofill = [
        ...withdrawal,
        KnownInternalNames.Networks.BrineMainnet
    ]
    return { asSource, withdrawal, autofill }
}
