import { Network } from "@layerswap/utils";

export interface NftBalanceProps {
    address: string;
    network: Network;
    contractAddress: string;
}

export interface NftProvider {
    supportsNetwork(network: Network): boolean;
    getBalance(props: NftBalanceProps): Promise<number>;
} 