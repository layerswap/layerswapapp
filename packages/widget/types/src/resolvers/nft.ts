import { LayerswapNetwork } from "../types";

export interface NftBalanceProps {
    address: string;
    network: LayerswapNetwork;
    contractAddress: string;
}

export interface NftProvider {
    supportsNetwork(network: LayerswapNetwork): boolean;
    getBalance(props: NftBalanceProps): Promise<number>;
} 
