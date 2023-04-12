import { arbitrum, arbitrumGoerli, bsc, bscTestnet, goerli, mainnet, okc, optimism, optimismGoerli, polygon, polygonMumbai, polygonZkEvmTestnet, polygonZkEvm, sepolia, zkSync, zkSyncTestnet } from 'wagmi/chains';

export const kcc = {
    id: 321,
    name: "KCC",
    network: "kcc",
    nativeCurrency: {
        decimals: 18,
        name: "KCS",
        symbol: "KCS",
    },
    rpcUrls: {
        default: {
            http: ["https://rpc-mainnet.kcc.network"],
        },
        public: {
            http: ["https://kcc-rpc.com"],
        },
    },
    blockExplorers: {
        default: {
            name: "kcc",
            url: "https://explorer.kcc.io/",
        },
    },
}

export var supportedChains =
    [arbitrum, arbitrumGoerli, bsc, bscTestnet, goerli, mainnet, okc, kcc, optimism, optimismGoerli, polygon, polygonMumbai, polygonZkEvmTestnet, polygonZkEvm, sepolia, zkSync, zkSyncTestnet];
