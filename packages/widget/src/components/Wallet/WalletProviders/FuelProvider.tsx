
import { BakoRequestAPI } from '../../../lib/wallets/fuel/Bako';
import { BakoSafeConnector } from '../../../lib/fuels/connectors/bako-safe';
import { FuelProvider, NetworkConfig } from '@fuels/react';
import { FueletWalletConnector } from '../../../lib/fuels/connectors/fuelet-wallet';
import { FuelWalletConnector } from '../../../lib/fuels/connectors/fuel-wallet';
import { useSettingsState } from '@/context/settings';
import { NetworkType } from '@/Models/Network';
import { useMemo } from 'react';

const HOST_URL = 'https://api.bako.global';

const FuelProviderWrapper = ({
    children
}: { children: React.ReactNode }) => {

    const { networks } = useSettingsState()

    const fuelConfig = {
        connectors: [
            new FuelWalletConnector(),
            new BakoSafeConnector({
                api: new BakoRequestAPI(HOST_URL)
            }),
            new FueletWalletConnector(),
        ]
    }

    const fuelNetworks: Array<NetworkConfig> = useMemo(() => networks.filter(n => n.type == NetworkType.Fuel).map((network) => ({
        chainId: Number(network.chain_id!)
    })), [networks])

    return (
        <FuelProvider uiConfig={{ suggestBridge: false }} theme={'dark'} fuelConfig={fuelConfig} networks={fuelNetworks}>
            {children}
        </FuelProvider>
    );
};


export default FuelProviderWrapper;