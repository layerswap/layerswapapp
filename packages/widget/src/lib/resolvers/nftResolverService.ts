import { NftBalanceResolver } from "../nft/nftBalanceResolver";
import { NftProvider } from "@/types";

class NftResolverService {
    private nftResolver: NftBalanceResolver | null = null;

    setProviders(nftProviders: NftProvider[]) {
        this.nftResolver = new NftBalanceResolver(nftProviders);
    }

    getNftResolver(): NftBalanceResolver {
        if (!this.nftResolver) {
            throw new Error('NftResolverService not initialized. Make sure to call setProviders first.');
        }
        return this.nftResolver;
    }

}

export const nftResolverService = new NftResolverService();
