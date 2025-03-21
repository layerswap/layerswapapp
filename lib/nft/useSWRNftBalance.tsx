import useSWR from "swr";
import { Network } from "../../Models/Network";
import { NftBalanceResolver } from "./nftBalanceResolver";

const useSWRNftBalance = (address: string, network: Network | undefined, contractAddress: string) => {
    const { data: balance, error, isLoading } = useSWR(
        (network && address && contractAddress) ? `/nft-balance/${address}/${network.name}/${contractAddress}` : null,
        () => {
            if (!network || !contractAddress || !address) return 0;
            return new NftBalanceResolver().getBalance({ address, network, contractAddress });
        },
        { refreshInterval: 60000 }
    );

    return {
        balance: typeof balance === 'number' ? balance : 0,
        isLoading,
        error
    };
};

export default useSWRNftBalance; 