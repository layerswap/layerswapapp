// import { http, type Config, createConfig, injected } from '@wagmi/core';
// import { DEFAULT_PROJECT_ID } from './constants';

// import { createAppKit, AppKit } from '@reown/appkit/react'
// import { arbitrum, mainnet, sepolia } from '@reown/appkit/networks'
// import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
// import { EthereumProvider } from '@walletconnect/ethereum-provider'

// export const createWagmiConfig = (): Config =>
//   createConfig({
//     chains: [sepolia, mainnet],
//     syncConnectedChain: true,
//     transports: {
//       [mainnet.id]: http(),
//       [sepolia.id]: http(),
//     },
//     connectors: [injected({ shimDisconnect: false })],
//   });


// interface CreateWeb3ModalProps {
//   adapter: WagmiAdapter | undefined;
//   projectId?: string;
// }


// export function createWeb3ModalInstance({
//   adapter,
//   projectId = DEFAULT_PROJECT_ID,
// }: CreateWeb3ModalProps): AppKit {
//   if (!projectId) {
//     console.warn(
//       '[WalletConnect Connector]: Get a project ID on https://cloud.walletconnect.com to use WalletConnect features.',
//     );
//   }


//   return createAppKit({
//     adapters: [adapter!],
//     networks: [mainnet, arbitrum],
//     projectId,
//     allWallets: 'ONLY_MOBILE',
//     features: {
//       analytics: false,
//     }
//   })

//   // return createWeb3Modal({
//   //   wagmiConfig: {
//   //     ...wagmiConfig,
//   //     // @ts-ignore
//   //     enableWalletConnect: !!projectId,
//   //   },
//   //   allWallets: 'ONLY_MOBILE',
//   //   enableAnalytics: false,
//   //   allowUnsupportedChain: true,
//   //   projectId: projectId,
//   // });
// }
