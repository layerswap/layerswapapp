import { Network } from "@/Models/Network";
import { NftProvider } from "@/types";
export class NftBalanceResolver {
    private providers: NftProvider[]

    constructor(providers?: NftProvider[]) {
        this.providers = providers || [];
    }
    async getBalance({ address, network, contractAddress }: { address: string, network: Network, contractAddress: string }) {
        const provider = this.providers.find(p => p.supportsNetwork(network));

        if (!provider) {
            throw new Error(`No provider found for network ${network.name}`);
        }

        return provider.getBalance({ address, network, contractAddress });
    }
} 