import { KnownInternalNames } from "@layerswap/widget/internal"

export const name = 'EVM'
export const id = 'evm'
export const ethereumNames = [KnownInternalNames.Networks.EthereumMainnet, KnownInternalNames.Networks.EthereumSepolia]
export const immutableZKEvm = [KnownInternalNames.Networks.ImmutableZkEVM]

export const featuredWalletsIds = [
    'metamask',
    'argent',
    'rainbow',
    'bitkeep',
    'okx-wallet',
]

export const HIDDEN_WALLETCONNECT_ID = 'hiddenWalletConnect'