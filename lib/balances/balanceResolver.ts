import posthog from "posthog-js";
import { NetworkBalance } from "@/Models/Balance";
import { BalanceProvider } from "@/Models/BalanceProvider";
import { NetworkWithTokens } from "@/Models/Network";
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

    async getBalance(network: NetworkWithTokens, address?: string, options?: { timeoutMs?: number, retryCount?: number }): Promise<NetworkBalance> {
        try {
            if (!address)
                throw new Error(`No address provided for network ${network.name}`)
            const provider = this.providers.find(p => p.supportsNetwork(network))
            //TODO: create interface for balance providers in case of empty state they shoudl throw error 
            //never return undefined as SWR does not set loading state if undefined is returned
            if (!provider) throw new Error(`No balance provider found for network ${network.name}`)
            const balances = await provider.fetchBalance(address, network, { timeoutMs: options?.timeoutMs, retryCount: options?.retryCount })

            const errorBalances = balances?.filter(b => b.error)
            if (errorBalances?.length) {
                posthog.capture('$exception', {
                    name: "BalanceError",
                    $layerswap_exception_type: "Balance Error",
                    network: network.name,
                    address: address,
                    balances: errorBalances,
                    where: 'BalanceProviderError',
                    message: `Could not fetch balance for ${errorBalances.map(t=>t.token).join(", ")} in ${network.name}, message: ${errorBalances.map(b=>b.error).join(", ")}`,
                });
            }

            return { balances };
        }
        catch (e) {
            const error = new Error(e)
            error.name = "BalanceError"
            error.cause = e
            posthog.capture('$exception', {
                name: error.name,
                message: error.message,
                $layerswap_exception_type: "Balance Error",
                stack: error.stack,
                cause: error.cause,
                type: 'BalanceError',
                where: 'BalanceProviderError',
                severity: 'error',
            });

            return { balances: [] }
        }
    }
}
