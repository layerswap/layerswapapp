import type { Network } from '../types';

export interface ContractAddressCheckerProvider {
    supportsNetwork(network: Network): boolean;
    isContractAddress(address: string, network: Network): Promise<boolean>;
}
