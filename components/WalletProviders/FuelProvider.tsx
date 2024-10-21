
import { defaultConnectors } from '@fuels/connectors';
import { FuelProvider } from '@fuels/react';
import { CHAIN_IDS, Provider } from 'fuels';
import { useConfig } from 'wagmi';

const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '28168903b2d30c75e5f7f2d71902581b';

const NETWORKS = [
    {
        chainId: CHAIN_IDS.fuel.testnet,
        url: 'https://testnet.fuel.network/v1/graphql',
    },
];

const FuelProviderWrapper = ({
    children,
}: { children: React.ReactNode }) => {

    const config = useConfig()
    const fuelConfig = {
        connectors: defaultConnectors({
            devMode: false,
            wcProjectId: WALLETCONNECT_PROJECT_ID,
            chainId: NETWORKS[0].chainId,
            fuelProvider: Provider.create(NETWORKS[0].url),
            ethWagmiConfig: config
        }),
    };

    return (
        <FuelProvider uiConfig={{ suggestBridge: false }} theme={'dark'} fuelConfig={fuelConfig} networks={NETWORKS}>
            {children}
        </FuelProvider>
    );
};

export default FuelProviderWrapper;