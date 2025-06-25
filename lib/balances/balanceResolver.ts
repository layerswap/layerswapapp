import { NetworkWithTokens } from "../../Models/Network";
import { BitcoinBalanceProvider } from "./providers/bitcoinBalanceProvider";
import { EVMBalanceProvider } from "./providers/evmBalanceProvider";
import { FuelBalanceProvider } from "./providers/fuelBalanceProvider";
import { ImmutableXBalanceProvider } from "./providers/immutableXBalanceProvider";
import { LoopringBalanceProvider } from "./providers/loopringBalanceProvider";
import { ParadexBalanceProvider } from "./providers/paradexBalanceProvider";
import { QueryBalanceProvider } from "./providers/queryBalanceProvider";
import { SolanaBalanceProvider } from "./providers/solanaBalanceProvider";
import { StarknetBalanceProvider } from "./providers/starknetBalanceProvider";
import { TonBalanceProvider } from "./providers/tonBalanceProvider";
import { TronBalanceProvider } from "./providers/tronBalanceProvider";
import { ZkSyncBalanceProvider } from "./providers/zkSyncBalanceProvider";

export class BalanceResolver {
    private providers = [
        new QueryBalanceProvider(),
        new StarknetBalanceProvider(),
        new EVMBalanceProvider(),
        new FuelBalanceProvider(),
        new ImmutableXBalanceProvider(),
        new LoopringBalanceProvider(),
        new SolanaBalanceProvider(),
        new TonBalanceProvider(),
        new ZkSyncBalanceProvider(),
        new TronBalanceProvider(),
        new ParadexBalanceProvider(),
        new BitcoinBalanceProvider()
    ];

    getBalance(address: string, network: NetworkWithTokens) {
        const provider = this.providers.find(p => p.supportsNetwork(network));
        //TODO: create interface for balance providers in case of empty state they shoudl throw error 
        //never return undefined as SWR does not set loading state if undefined is returned
        if (!provider) throw new Error(`No balance provider found for network ${network.name}`);

        return provider.fetchBalance(address, network);
    }
}
