import { KnownInternalNames } from '@layerswap/utils'

export const STARKNET_MAINNET_RPC_URL = 'https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_10/eF1rLmRte_tchnl5hieO_'

export function getStarknetRpcUrl(rpcUrl: string, networkId: string, chainId?: string | number | null): string {
    const isMainnet = networkId === KnownInternalNames.Networks.StarkNetMainnet
        || chainId === 'SN_MAIN'
        || String(chainId).toLowerCase() === '0x534e5f4d41494e'

    if (!isMainnet || new URL(rpcUrl).pathname.split('/').includes('v0_10')) return rpcUrl
    return STARKNET_MAINNET_RPC_URL
}
