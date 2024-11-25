import { Token } from "@imtbl/imx-sdk";
import { NetworkWithTokens } from "../../Models/Network";
import { EVMBalanceProvider } from "./providers/evmBalanceProvider";
import { FuelBalanceProvider } from "./providers/fuelBalanceProvider";
import { ImmutableXBalanceProvider } from "./providers/immutableXBalanceProvider";
import { LoopringBalanceProvider } from "./providers/loopringBalanceProvider";
import { QueryBalanceProvider } from "./providers/queryBalanceProvider";
import { SolanaBalanceProvider } from "./providers/solanaBalanceProvider";
import { StarknetBalanceProvider } from "./providers/starknetBalanceProvider";
import { TonBalanceProvider } from "./providers/tonBalanceProvider";
import { ZkSyncBalanceProvider } from "./providers/zkSyncBalanceProvider";

export class BalanceResolver {
    private providers = [
        new StarknetBalanceProvider(),
        new EVMBalanceProvider(),
        new FuelBalanceProvider(),
        new ImmutableXBalanceProvider(),
        new LoopringBalanceProvider(),
        //new QueryBalanceProvider(),
        new SolanaBalanceProvider(),
        new TonBalanceProvider(),
        new ZkSyncBalanceProvider()
    ];

    getBalance(address: string, network: NetworkWithTokens) {

        const provider = this.providers.find(p => p.supportsNetwork(network));
        if (!provider) return;

        return provider.fetchBalance(address, network);
    }
}
