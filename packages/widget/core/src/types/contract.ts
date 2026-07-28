import type { Network } from '../Models/Network';

export interface ContractAddressCheckerProvider {
    supportsNetwork(network: Network): boolean;
    isContractAddress(address: string, network: Network): Promise<boolean>;
}

