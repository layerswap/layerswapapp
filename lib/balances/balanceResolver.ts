import { NetworkBalance, TokenBalance } from "../../Models/Balance";
import { NetworkWithTokens } from "../../Models/Network";
import { truncateDecimals } from "../../components/utils/RoundDecimals";
import { useNetworksBalanceStore } from "../../stores/networksBalanceStore";
import { EVMBalanceProvider } from "./providers/evmBalanceProvider";
import { FuelBalanceProvider } from "./providers/fuelBalanceProvider";
import { ImmutableXBalanceProvider } from "./providers/immutableXBalanceProvider";
import { LoopringBalanceProvider } from "./providers/loopringBalanceProvider";
import { ParadexBalanceProvider } from "./providers/paradexBalanceProvider";
import { QueryBalanceProvider } from "./providers/queryBalanceProvider";
import { SolanaBalanceProvider } from "./providers/solanaBalanceProvider";
import { StarknetBalanceProvider } from "./providers/starknetBalanceProvider";
import { TonBalanceProvider } from "./providers/tonBalanceProvider";
import { TronBalanceProvider } from "./providers/tronBalanceResolver";
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
        new ParadexBalanceProvider()
    ];

    async getBalance(network: NetworkWithTokens, address?: string,): Promise<NetworkBalance> {
        try {
            if (!address)
                throw new Error(`No address provided for network ${network.name}`)

            const provider = this.providers.find(p => p.supportsNetwork(network))
            //TODO: create interface for balance providers in case of empty state they shoudl throw error 
            //never return undefined as SWR does not set loading state if undefined is returned
            if (!provider) throw new Error(`No balance provider found for network ${network.name}`)
            const balances = await provider.fetchBalance(address, network)
            const totalInUSD = balances?.reduce((acc, b) => {
                const token = network.tokens.find(t => t?.symbol === b?.token);
                const tokenPriceInUsd = token?.price_in_usd || 0;
                const tokenPrecision = token?.precision || 0;
                const formattedBalance = Number(truncateDecimals(b?.amount, tokenPrecision));
                return acc + (formattedBalance * tokenPriceInUsd);
            }, 0)

            useNetworksBalanceStore.getState().setNetworkBalance(network.name, {
                balances: balances || [],
                totalInUSD,
                success: true
            })

            return { balances, totalInUSD };
        }
        catch (e) {
            useNetworksBalanceStore.getState().setNetworkBalance(network.name, {
                success: false
            })
            return { balances: [], totalInUSD: 0 }
        }

    }

}
