import type { AppNetworkAdapter } from "@layerswap/wallet-core"
import { ethereumNames } from "../constants"

export function findEthereumNetwork<Network>(
    networks: Network[],
    networkAdapter: AppNetworkAdapter<Network>,
    ethereumChainIds: readonly number[] = [],
): Network | undefined {
    return networks.find(network =>
        ethereumNames.includes(networkAdapter.getId(network))
        || ethereumChainIds.includes(Number(networkAdapter.getChainId(network)))
    )
}
