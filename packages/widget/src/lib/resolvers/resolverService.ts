import { BalanceResolver } from "@/lib/balances/balanceResolver";
import { GasResolver } from "@/lib/gases/gasResolver";
import { AddressUtilsResolver } from '@/lib/address/validator/addressUtilsResolver'
import { AddressUtilsProvider, BalanceProvider, GasProvider } from "@/types";

class BalanceAndGasResolverService {
    private balanceResolver: BalanceResolver | null = null;
    private gasResolver: GasResolver | null = null;
    private addressUtilsResolver: AddressUtilsResolver | null = null;
    setProviders(balanceProviders: BalanceProvider[], gasProviders: GasProvider[], addressUtilsProviders: AddressUtilsProvider[]) {
        this.balanceResolver = new BalanceResolver(balanceProviders);
        this.gasResolver = new GasResolver(gasProviders);
        this.addressUtilsResolver = new AddressUtilsResolver(addressUtilsProviders);
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

    getAddressUtilsResolver(): AddressUtilsResolver {
        if (!this.addressUtilsResolver) {
            throw new Error('ResolverService not initialized. Make sure to call setProviders first.');
        }
        return this.addressUtilsResolver;
    }
}

export const resolverService = new BalanceAndGasResolverService();
