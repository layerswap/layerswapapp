import type { Network } from '@layerswap/utils';

export interface ContractAddressCheckerProvider {
    supportsNetwork(network: Network): boolean;
    isContractAddress(address: string, network: Network): Promise<boolean>;
}

