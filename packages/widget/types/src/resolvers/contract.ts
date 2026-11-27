import type { LayerswapNetwork } from '../types';

export interface ContractAddressCheckerProvider {
    supportsNetwork(network: LayerswapNetwork): boolean;
    isContractAddress(address: string, network: LayerswapNetwork): Promise<boolean>;
}
