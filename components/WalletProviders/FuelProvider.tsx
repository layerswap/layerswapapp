
import { defaultConnectors } from '@fuels/connectors';
import { FuelProvider } from '@fuels/react';
import { CHAIN_IDS, Provider } from 'fuels';

const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '28168903b2d30c75e5f7f2d71902581b';

const NETWORKS = [
    {
        chainId: CHAIN_IDS.fuel.testnet,
        url: 'https://testnet.fuel.network/v1/graphql',
    },
];

const fuelConfig = {
    connectors: defaultConnectors({
        devMode: true,
        wcProjectId: WALLETCONNECT_PROJECT_ID,
        chainId: NETWORKS[0].chainId,
        fuelProvider: Provider.create(NETWORKS[0].url),
    }),
};
export const Providers = ({
    children,
}: { children: React.ReactNode }) => {

    return (
        <FuelProvider theme={'dark'} fuelConfig={fuelConfig} networks={NETWORKS}>
            {children}
        </FuelProvider>
    );
};