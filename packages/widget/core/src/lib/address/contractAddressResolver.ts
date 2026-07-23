import { ContractAddressCheckerProvider, Network } from "@/types";

export class ContractAddressResolver {
    private providers: ContractAddressCheckerProvider[];

    constructor(providers?: ContractAddressCheckerProvider[]) {
        this.providers = providers || [];
    }

    async isContractAddress(network: Network, address: string): Promise<boolean> {
        const provider = this.providers.find(p => p.supportsNetwork(network));
        if (!provider) {
            return false;
        }

        return provider.isContractAddress(address, network);
    }
}


