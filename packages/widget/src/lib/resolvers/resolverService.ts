import { BalanceResolver } from "@/lib/balances/balanceResolver";
import { GasResolver } from "@/lib/gases/gasResolver";
import { AddressUtilsResolver } from '@/lib/address/addressUtilsResolver'
import { AddressUtilsProvider, BalanceProvider, ContractAddressCheckerProvider, GasProvider, NftProvider, TransferProvider } from "@/types";
import { RpcHealthCheckProvider } from "@/types/rpcHealth";
import { NftBalanceResolver } from "../nft/nftBalanceResolver";
import { TransferResolver } from "../transfers/transferResolver";
import { ContractAddressResolver } from "@/lib/address/contractAddressResolver";
import { RpcHealthCheckResolver } from "../rpcHealth/rpcHealthCheckResolver";

class UtilsResolverService {
    private balanceResolver: BalanceResolver | null = null;
    private gasResolver: GasResolver | null = null;
    private addressUtilsResolver: AddressUtilsResolver | null = null;
    private nftResolver: NftBalanceResolver | null = null;
    private transferResolver: TransferResolver | null = null;
    private contractAddressResolver: ContractAddressResolver | null = null;
    private rpcHealthCheckResolver: RpcHealthCheckResolver | null = null;

    setProviders(
        balanceProviders: BalanceProvider[],
        gasProviders: GasProvider[],
        addressUtilsProviders: AddressUtilsProvider[],
        nftProviders: NftProvider[],
        transferProviders: TransferProvider[],
        contractAddressProviders: ContractAddressCheckerProvider[],
        rpcHealthCheckProviders?: RpcHealthCheckProvider[],
    ) {
        this.balanceResolver = new BalanceResolver(balanceProviders);
        this.gasResolver = new GasResolver(gasProviders);
        this.addressUtilsResolver = new AddressUtilsResolver(addressUtilsProviders);
        this.nftResolver = new NftBalanceResolver(nftProviders);
        this.transferResolver = new TransferResolver(transferProviders);
        this.contractAddressResolver = new ContractAddressResolver(contractAddressProviders);
        this.rpcHealthCheckResolver = new RpcHealthCheckResolver(rpcHealthCheckProviders);
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

    getTransferResolver(): TransferResolver {
        if (!this.transferResolver) {
            throw new Error('TransferResolver not initialized. Make sure to call setProviders first.');
        }
        return this.transferResolver;
    }

    getContractAddressResolver(): ContractAddressResolver {
        if (!this.contractAddressResolver) {
            throw new Error('ContractAddressResolver not initialized. Make sure to call setProviders first.');
        }
        return this.contractAddressResolver;
    }

    getRpcHealthCheckResolver(): RpcHealthCheckResolver | null {
        return this.rpcHealthCheckResolver;
    }
}

export const resolverService = new UtilsResolverService();
