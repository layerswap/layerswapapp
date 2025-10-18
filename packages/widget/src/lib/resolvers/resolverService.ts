import { BalanceResolver } from "@/lib/balances/balanceResolver";
import { GasResolver } from "@/lib/gases/gasResolver";
import { AddressUtilsResolver } from '@/lib/address/addressUtilsResolver'
import { AddressUtilsProvider, BalanceProvider, GasProvider, NftProvider } from "@/types";
import { NftBalanceResolver } from "../nft/nftBalanceResolver";

class UtilsResolverService {
    private balanceResolver: BalanceResolver | null = null;
    private gasResolver: GasResolver | null = null;
    private addressUtilsResolver: AddressUtilsResolver | null = null;
    private nftResolver: NftBalanceResolver | null = null;
    setProviders(balanceProviders: BalanceProvider[], gasProviders: GasProvider[], addressUtilsProviders: AddressUtilsProvider[], nftProviders: NftProvider[]) {
        this.balanceResolver = new BalanceResolver(balanceProviders);
        this.gasResolver = new GasResolver(gasProviders);
        this.addressUtilsResolver = new AddressUtilsResolver(addressUtilsProviders);
        this.nftResolver = new NftBalanceResolver(nftProviders);
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

    getNftResolver(): NftBalanceResolver {
        if (!this.nftResolver) {
            throw new Error('NftResolverService not initialized. Make sure to call setProviders first.');
        }
        return this.nftResolver;
    }
}

export const resolverService = new UtilsResolverService();
