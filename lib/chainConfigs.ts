import { arbitrum, arbitrumGoerli, bsc, bscTestnet, goerli, mainnet, okc, optimism, optimismGoerli, polygon, polygonMumbai, polygonZkEvmTestnet, polygonZkEvm, sepolia, zkSync, zkSyncTestnet, lineaTestnet, base, mantle, evmos, linea, avalanche, arbitrumNova } from 'wagmi/chains';

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

export const pgn = {
  id: 424,
  name: 'Public Goods Network',
  network: 'pgn-mainnet',
  nativeCurrency: { name: 'PGN Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://rpc.publicgoods.network'],
    }
  },
  blockExplorers: {
    default: {
      name: 'Etherscan',
      url: '	https://explorer.publicgoods.network',
    },
  },
  testnet: false,
}

export var supportedChains =
  [mainnet, avalanche, arbitrum, arbitrumGoerli, arbitrumNova, bsc, bscTestnet, goerli, okc, kcc, optimism, optimismGoerli, polygon, polygonMumbai, polygonZkEvmTestnet, polygonZkEvm, sepolia, zkSync, zkSyncTestnet, linea, lineaTestnet, base, mantle, evmos, pgn];
