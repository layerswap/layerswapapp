import { Contract, RpcProvider } from "starknet-rpc";
import { NftBalanceProps, NftProvider, NetworkType, LayerswapNetwork } from "@layerswap/widget-types";

const NFT_ABI = [
    {
        "name": "balanceOf",
        "type": "function",
        "inputs": [
            {
                "name": "owner",
                "type": "felt"
            }
        ],
        "outputs": [
            {
                "name": "balance",
                "type": "felt"
            }
        ],
        "stateMutability": "view"
    }
];

export class StarknetNftProvider implements NftProvider {
    supportsNetwork(network: LayerswapNetwork): boolean {
        return (network.type === NetworkType.Starknet)
    }

    getBalance = async ({ address, network, contractAddress }: NftBalanceProps): Promise<number> => {
        if (!contractAddress || !network.node_url) {
            throw new Error("Missing NFT contract address or node URL");
        }

        const provider = await RpcProvider.create({
            nodeUrl: network.node_url
        });

        try {
            const contract = new Contract({ abi: NFT_ABI, address: contractAddress, providerOrAccount: provider });
            const response = await contract.balanceOf(address);

            if (!response || typeof response.balance === 'undefined') {
                throw new Error("Invalid response from NFT contract");
            }

            return Number(response.balance);
        } catch (error) {
            console.error("Error fetching NFT balance:", error);
            throw error;
        }
    }
}
