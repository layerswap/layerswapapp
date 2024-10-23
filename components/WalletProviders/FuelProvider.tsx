
import { defaultConnectors } from '@fuels/connectors';
import { FuelProvider } from '@fuels/react';
import { CHAIN_IDS, Provider } from 'fuels';
import { useConfig } from 'wagmi';
import KnownInternalNames from '../../lib/knownIds';
import { useSettingsState } from '../../context/settings';

const FuelProviderWrapper = ({
    children,
}: { children: React.ReactNode }) => {

    const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '28168903b2d30c75e5f7f2d71902581b';
    const config = useConfig()
    const { networks } = useSettingsState()

    const network = networks.find(network => network.name === KnownInternalNames.Networks.FuelMainnet || network.name === KnownInternalNames.Networks.FuelTestnet)
    const isMainnet = network?.name === KnownInternalNames.Networks.FuelMainnet

    if (!network) return <>
        {children}
    </>

    const fuelConfig = {
        connectors: defaultConnectors({
            devMode: false,
            wcProjectId: WALLETCONNECT_PROJECT_ID,
            chainId: isMainnet ? CHAIN_IDS.fuel.mainnet : CHAIN_IDS.fuel.testnet,
            fuelProvider: Provider.create(network?.node_url),
            ethWagmiConfig: config
        }),
    };

    return (
        <FuelProvider uiConfig={{ suggestBridge: false }} theme={'dark'} fuelConfig={fuelConfig}>
            {children}
        </FuelProvider>
    );
};

export default FuelProviderWrapper;