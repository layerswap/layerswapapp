
import { BakoSafeConnector, FuelWalletConnector, FueletWalletConnector, SolanaConnector, WalletConnectConnector, defaultConnectors } from '@fuels/connectors';
import { FuelProvider } from '@fuels/react';
import { CHAIN_IDS, Provider, urlJoin } from '@fuel-ts/account';
import { useConfig } from 'wagmi';
import KnownInternalNames from '../../lib/knownIds';
import { useSettingsState } from '../../context/settings';
export const HOST_URL = 'https://api.bako.global';

const FuelProviderWrapper = ({
    children,
}: { children: React.ReactNode }) => {

    const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '28168903b2d30c75e5f7f2d71902581b';
    const config = useConfig()
    const { networks } = useSettingsState()

    const network = networks.find(network => network.name === KnownInternalNames.Networks.FuelMainnet || network.name === KnownInternalNames.Networks.FuelTestnet)
    const isMainnet = network?.name === KnownInternalNames.Networks.FuelMainnet

    const fuelConfig = {
        connectors: [
            new FuelWalletConnector(),
            new BakoSafeConnector({
                api: new BaskoRequestAPI(HOST_URL)
            }),
            new FueletWalletConnector(),
            new WalletConnectConnector({
                projectId: WALLETCONNECT_PROJECT_ID,
                wagmiConfig: config,
                chainId: isMainnet ? CHAIN_IDS.fuel.mainnet : CHAIN_IDS.fuel.testnet,
                ...(network?.node_url ? { fuelProvider: Provider.create(network?.node_url) } : {}),
            }),
            new SolanaConnector({
                projectId: WALLETCONNECT_PROJECT_ID,
                chainId: isMainnet ? CHAIN_IDS.fuel.mainnet : CHAIN_IDS.fuel.testnet,
                ...(network?.node_url ? { fuelProvider: Provider.create(network?.node_url) } : {}),
            })
        ]
    }

    return (
        <FuelProvider uiConfig={{ suggestBridge: false }} theme={'dark'} fuelConfig={fuelConfig}>
            {children}
        </FuelProvider>
    );
};

export const BAKO_STATE: {
    state: { last_req?: Date, data: boolean, req_count: number, period_start?: Date },
    period_durtion: number
} = { state: { data: false, req_count: 0 }, period_durtion: 10000 };

export class BaskoRequestAPI {
    baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async get(pathname: string) {

        if (!pathname.includes('/state')) {
            const data = await fetch(urlJoin(this.baseUrl, pathname)).then((res) =>
                res.json(),
            );
            return data;
        }

        const period_elapsed = BAKO_STATE.state?.period_start && new Date().getTime() - BAKO_STATE.state?.period_start?.getTime() > BAKO_STATE.period_durtion;
        const skip = BAKO_STATE.state?.last_req && new Date().getTime() - BAKO_STATE.state?.last_req?.getTime() < 1000 * 60 * 2 && period_elapsed;

        if (skip)
            return BAKO_STATE.state?.data;

        const data = await fetch(urlJoin(this.baseUrl, pathname)).then((res) =>
            res.json(),
        );
        const count = BAKO_STATE.state?.req_count || 0;
        BAKO_STATE.state = { last_req: new Date(), data, req_count: count + 1, period_start: period_elapsed ? new Date() : BAKO_STATE.state?.period_start || new Date() };
        return data;
    }

    async delete(pathname: string) {
        await fetch(urlJoin(this.baseUrl, pathname), {
            method: 'DELETE',
        });
    }
}

export default FuelProviderWrapper;