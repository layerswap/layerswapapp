import { Network } from "@/Models";

export interface NftBalanceProps {
    address: string;
    network: Network;
    contractAddress: string;
}

export interface NftProvider {
    supportsNetwork(network: Network): boolean;
    getBalance(props: NftBalanceProps): Promise<number>;
} 