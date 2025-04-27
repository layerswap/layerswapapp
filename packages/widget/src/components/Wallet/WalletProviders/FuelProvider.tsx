
// import { BaskoRequestAPI } from '../../../lib/wallets/fuel/Bako';
// import { BakoSafeConnector } from '../../../lib/fuels/connectors/bako-safe';
// import { FuelProvider } from '@fuels/react';
// import { FueletWalletConnector } from '../../../lib/fuels/connectors/fuelet-wallet';
// import { FuelWalletConnector } from '../../../lib/fuels/connectors/fuel-wallet';

// export const HOST_URL = 'https://api.bako.global';

// const FuelProviderWrapper = ({
//     children
// }: { children: React.ReactNode }) => {
//     const fuelConfig = {
//         connectors: [
//             new FuelWalletConnector(),
//             new BakoSafeConnector({
//                 api: new BaskoRequestAPI(HOST_URL)
//             }),
//             new FueletWalletConnector(),
//         ]
//     }

//     return (
//         <FuelProvider uiConfig={{ suggestBridge: false }} theme={'dark'} fuelConfig={fuelConfig}>
//             {children}
//         </FuelProvider>
//     );
// };


// export default FuelProviderWrapper;