import KnownInternalNames from '@layerswap/utils/known-ids'

export const name = 'Stellar'
export const id = 'stellar' as const

export const supportedNetworkNames = [
    KnownInternalNames.Networks.StellarMainnet,
    KnownInternalNames.Networks.StellarTestnet,
] as const

export const STELLAR_SESSION_KEY = 'layerswap:stellar-wallet'
