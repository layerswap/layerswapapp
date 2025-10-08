import { BalanceResolver } from "@/lib/balances/balanceResolver";
import { GasResolver } from "@/lib/gases/gasResolver";
import { BalanceProvider } from "@/lib/wallets/types/balance";
import { GasProvider } from "@/lib/wallets/types/gas";

class BalanceAndGasResolverService {
    private balanceResolver: BalanceResolver | null = null;
    private gasResolver: GasResolver | null = null;

    setProviders(balanceProviders: BalanceProvider[], gasProviders: GasProvider[]) {
        this.balanceResolver = new BalanceResolver(balanceProviders);
        this.gasResolver = new GasResolver(gasProviders);
    }

    getBalanceResolver(): BalanceResolver {
        if (!this.balanceResolver) {
            throw new Error('ResolverService not initialized. Make sure to call setProviders first.');
        }
        return this.balanceResolver;
    }

    getGasResolver(): GasResolver {
        if (!this.gasResolver) {
            throw new Error('ResolverService not initialized. Make sure to call setProviders first.');
        }
        return this.gasResolver;
    }
}

export const resolverService = new BalanceAndGasResolverService();
