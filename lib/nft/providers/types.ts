import { Network } from "../../../Models/Network";

export interface NftBalanceProps {
    address: string;
    network: Network;
    contractAddress: string;
}

export interface Provider {
    supportsNetwork(network: Network): boolean;
    getBalance(props: NftBalanceProps): Promise<number>;
} 