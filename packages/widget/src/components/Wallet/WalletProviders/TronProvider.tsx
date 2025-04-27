// import { useMemo } from 'react';
// import { WalletProvider } from '@tronweb3/tronwallet-adapter-react-hooks';
// import {
//     BitKeepAdapter,
//     OkxWalletAdapter,
//     TokenPocketAdapter,
//     TronLinkAdapter,
// } from '../../../lib/wallets/tron/connectors'

// export default function TronProvider({ children }: { children: React.ReactNode }) {

//     const adapters = useMemo(() => {
//         return [
//             new TronLinkAdapter(),
//             new TokenPocketAdapter(),
//             new OkxWalletAdapter(),
//             new BitKeepAdapter(),
//         ]
//     }, [])

//     return (
//         <WalletProvider adapters={adapters} disableAutoConnectOnLoad={true} autoConnect={false}>
//             {children}
//         </WalletProvider>
//     );
// }