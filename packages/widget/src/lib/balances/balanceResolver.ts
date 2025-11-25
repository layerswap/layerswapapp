import { NetworkBalance } from "@/Models/Balance";
import { BalanceProvider } from "@/types/balance";
import { NetworkWithTokens } from "@/Models/Network";
import { ErrorHandler } from "@/lib/ErrorHandler";

export class BalanceResolver {

    private providers: BalanceProvider[];

    constructor(providers?: BalanceProvider[]) {
        this.providers = providers || []
    }

    async getBalance(network: NetworkWithTokens, address?: string, options?: { timeoutMs?: number, retryCount?: number }): Promise<NetworkBalance> {
        try {
            if (!address)
                throw new Error(`No address provided for network ${network.name}`)
            const provider = this.providers.find(p => p.supportsNetwork(network))
            //TODO: create interface for balance providers in case of empty state they shoudl throw error 
            //never return undefined as SWR does not set loading state if undefined is returned
            if (!provider) throw new Error(`No balance provider found for network ${network.name}`)
            const balances = await provider.fetchBalance(address, network, { timeoutMs: options?.timeoutMs, retryCount: options?.retryCount })

            return { balances };
        }
        catch (e) {
            const error = e as Error;
            ErrorHandler({ 
                type: 'BalanceResolverError', 
                message: error.message,
                name: error.name,
                stack: error.stack,
                cause: error
            });
            return { balances: [] }
        }
    }
}
