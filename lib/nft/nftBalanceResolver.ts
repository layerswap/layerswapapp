import { Network } from "../../Models/Network";
import { StarknetNftProvider } from "./providers/starknetNftProvider";

export class NftBalanceResolver {
    private providers = [
        new StarknetNftProvider()
    ];

    async getBalance({ address, network, contractAddress }: { address: string, network: Network, contractAddress: string }) {
        const provider = this.providers.find(p => p.supportsNetwork(network));
        
        if (!provider) {
            throw new Error(`No provider found for network ${network.name}`);
        }

        return provider.getBalance({ address, network, contractAddress });
    }
} 