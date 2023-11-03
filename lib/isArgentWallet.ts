import { createPublicClient, http, parseAbi } from "viem";
import { CryptoNetwork } from "../Models/CryptoNetwork";
import resolveChain from "./resolveChain";

const isArgentWallet = async (address: string, source_network: CryptoNetwork) => {

    const publicClient = createPublicClient({
        chain: resolveChain(source_network),
        transport: http()
    })

    const walletDetectorAddress = "0xeca4B0bDBf7c55E9b7925919d03CbF8Dc82537E8";
    const walletDetectorABI = parseAbi([
        "function isArgentWallet(address _wallet) external view returns (bool)"
    ]);
    const result = await publicClient.readContract({
        address: walletDetectorAddress,
        abi: walletDetectorABI,
        functionName: 'isArgentWallet',
        args: [address as `0x${string}`]
    })
    const data: boolean = result
    return data

}

export default isArgentWallet