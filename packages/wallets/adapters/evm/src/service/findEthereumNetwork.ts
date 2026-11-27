import { NetworkType, type LayerswapNetwork } from '@layerswap/widget-types'

export function findEthereumNetwork<Network extends LayerswapNetwork>(networks: Network[]): Network | undefined {
    return networks.find(network => network.type === NetworkType.EVM && [1, 11155111].includes(Number(network.chain_id)))
}
