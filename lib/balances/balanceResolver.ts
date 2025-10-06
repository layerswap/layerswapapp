import posthog from "posthog-js";
import { NetworkBalance } from "@/Models/Balance";
import { BalanceProvider } from "@/Models/BalanceProvider";
import { NetworkWithTokens } from "@/Models/Network";
import { truncateDecimals } from "@/components/utils/RoundDecimals";
import {
    BitcoinBalanceProvider,
    EVMBalanceProvider,
    FuelBalanceProvider,
    ImmutableXBalanceProvider,
    LoopringBalanceProvider,
    ParadexBalanceProvider,
    QueryBalanceProvider,
    SolanaBalanceProvider,
    StarknetBalanceProvider,
    TonBalanceProvider,
    TronBalanceProvider,
    ZkSyncBalanceProvider,
    HyperliquidBalanceProvider
} from "./providers";

export class BalanceResolver {

    private providers: BalanceProvider[] = [
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
        new BitcoinBalanceProvider(),
        new HyperliquidBalanceProvider()
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
                const amount = b?.amount || 0;
                return acc + (amount * tokenPriceInUsd);
            }, 0)
            return { balances, totalInUSD };
        }
        catch (e) {
            const error = new Error(e)
            error.name = "BalanceError"
            error.cause = e
            posthog.capture('$exception', {
                name: error.name,
                message: error.message,
                stack: error.stack,
                cause: error.cause,
                where: 'BalanceProviderError',
                severity: 'error',
            });

            return { balances: [], totalInUSD: 0 }
        }
    }
}
