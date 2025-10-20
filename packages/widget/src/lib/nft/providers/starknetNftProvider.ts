// import { Contract, RpcProvider } from "starknet";
import { Network } from "../../../Models/Network";
import KnownInternalNames from "../../knownIds";
import { Provider, NftBalanceProps } from "./types";

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

export class StarknetNftProvider implements Provider {
    supportsNetwork(network: Network): boolean {
        return (KnownInternalNames.Networks.StarkNetMainnet.includes(network.name) 
            || KnownInternalNames.Networks.StarkNetGoerli.includes(network.name) 
            || KnownInternalNames.Networks.StarkNetSepolia.includes(network.name))
    }

    getBalance = async ({ address, network, contractAddress }: NftBalanceProps): Promise<number> => {
        return 0
        // if (!contractAddress || !network.node_url) {
        //     throw new Error("Missing NFT contract address or node URL");
        // }

        // const provider = new RpcProvider({
        //     nodeUrl: network.node_url
        // });

        // try {
        //     const contract = new Contract(NFT_ABI, contractAddress, provider);
        //     const response = await contract.balanceOf(address);
            
        //     if (!response || typeof response.balance === 'undefined') {
        //         throw new Error("Invalid response from NFT contract");
        //     }

        //     return Number(response.balance);
        // } catch (error) {
        //     console.error("Error fetching NFT balance:", error);
        //     throw error;
        // }
    }
} 