'use client'
import useSWR from "swr";
import { Network } from "@layerswap/widget-types";
import { resolverService } from "../resolvers/resolverService";

const useSWRNftBalance = (
    address: string,
    network: Network | undefined,
    contractAddress: string,
    { enabled = true }: { enabled?: boolean } = {},
) => {
    const { data: balance, error, isLoading } = useSWR(
        (enabled && network && address && contractAddress) ? `/nft-balance/${address}/${network.name}/${contractAddress}` : null,
        () => {
            if (!network || !contractAddress || !address) return 0;
            return resolverService.getNftResolver().getBalance({ address, network, contractAddress });
        },
        { refreshInterval: enabled ? 60000 : 0, keepPreviousData: !enabled }
    );

    return {
        balance: typeof balance === 'number' ? balance : 0,
        isLoading,
        error
    };
};

export default useSWRNftBalance;
