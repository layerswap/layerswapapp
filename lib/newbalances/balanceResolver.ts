import { NetworkWithTokens } from "../../Models/Network";
import { EVMBalanceProvider } from "./providers/evmBalanceProvider";
import { StarknetBalanceProvider } from "./providers/starknetBalanceProvider";


export class BalanceResolver {
    private providers = [
        new StarknetBalanceProvider(),
        new EVMBalanceProvider()
    ];

    getBalance(address: string, network: NetworkWithTokens) {

        const provider = this.providers.find(p => p.supportsNetwork(network));
        if (!provider) return;
        console.log("provider", provider)

        return provider.fetchBalance(address, network);
    }
}
