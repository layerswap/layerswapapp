import { arbitrum, arbitrumGoerli, bsc, bscTestnet, goerli, mainnet, okc, optimism, optimismGoerli, polygon, polygonMumbai, polygonZkEvmTestnet, polygonZkEvm, sepolia, zkSync, zkSyncTestnet, lineaTestnet, base, mantle, evmos } from 'wagmi/chains';

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

export const arbitrumNova = {
  id: 42_170,
  name: 'Arbitrum Nova',
  network: 'arbitrum-nova',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    blast: {
      http: ['https://arbitrum-nova.public.blastapi.io'],
      webSocket: ['wss://arbitrum-nova.public.blastapi.io'],
    },
    default: {
      http: ['https://nova.arbitrum.io/rpc'],
    },
    public: {
      http: ['https://nova.arbitrum.io/rpc'],
    },
  },
  blockExplorers: {
    etherscan: { name: 'Arbiscan', url: 'https://nova.arbiscan.io' },
    blockScout: {
      name: 'BlockScout',
      url: 'https://nova-explorer.arbitrum.io/',
    },
    default: { name: 'Arbiscan', url: 'https://nova.arbiscan.io' },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
      blockCreated: 1746963,
    },
  },
}


export const avalanche = {
  id: 43114,
  name: 'Avalanche Mainnet',
  network: 'avalanche',
  nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 6 },
  rpcUrls: {
    blast: {
      http: ['https://ava-mainnet.public.blastapi.io/ext/bc/C/rpc'],
      webSocket: ['wss://ava-mainnet.public.blastapi.io/ext/bc/C/ws'],
    },
    default: {
      http: ['https://api.avax.network/ext/bc/C/rpc'],
    },
    public: {
      http: ['https://api.avax.network/ext/bc/C/rpc'],
    },
  },
  blockExplorers: {
    default: { name: 'Snowtrace', url: 'https://snowtrace.io' },
  }
}

export const linea = {
  id: 59_144,
  name: 'Linea Mainnet',
  network: 'linea-mainnet',
  nativeCurrency: { name: 'Linea Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    infura: {
      http: ['https://linea-mainnet.infura.io/v3'],
      webSocket: ['wss://linea-mainnet.infura.io/ws/v3'],
    },
    default: {
      http: ['https://rpc.linea.build'],
      webSocket: ['wss://rpc.linea.build'],
    },
    public: {
      http: ['https://rpc.linea.build'],
      webSocket: ['wss://rpc.linea.build'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Etherscan',
      url: 'https://lineascan.build',
    },
    etherscan: {
      name: 'Etherscan',
      url: 'https://lineascan.build',
    },
    blockscout: {
      name: 'Blockscout',
      url: 'https://explorer.linea.build',
    },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      blockCreated: 42,
    },
  },
  testnet: false,
}


export var supportedChains =
  [mainnet, avalanche, arbitrum, arbitrumGoerli, arbitrumNova, bsc, bscTestnet, goerli, okc, kcc, optimism, optimismGoerli, polygon, polygonMumbai, polygonZkEvmTestnet, polygonZkEvm, sepolia, zkSync, zkSyncTestnet, linea, lineaTestnet, base, mantle, evmos];
