import React, { useEffect, createContext, ReactNode } from 'react';
import { useConnect, useDisconnect } from '@starknet-react/core';
import { useSettingsState } from './settings';
import KnownInternalNames from '../lib/knownIds';
import { resolveStarknetWallet } from '../lib/wallets/starknet/useStarknet';
import { useStarknetStore } from '../stores/starknetWalletStore';

export const StarknetContext = createContext({});

export const StarknetWalletProvider = ({ children }: { children: ReactNode }) => {
    const { connectors } = useConnect();
    const { disconnectAsync } = useDisconnect()
    const { networks } = useSettingsState();

    const name = 'Starknet'

    const addWallet = useStarknetStore((state) => state.connectWallet)
    const removeWallet = useStarknetStore((state) => state.disconnectWallet)
    const removeAccount = useStarknetStore((state) => state.removeAccount)
    const starknetAccounts = useStarknetStore((state) => state.starknetAccounts) || {};

    const disconnectWallets = async (connectorName?: string, address?: string) => {
        try {
            await disconnectAsync()
            removeWallet(name, connectorName)
            if (address) removeAccount(address)
        }
        catch (e) {
            console.log(e)
        }
    }

    useEffect(() => {
        const initializeWallet = async () => {
            const starknetNetwork = networks.find(
                (n) =>
                    n.name === KnownInternalNames.Networks.StarkNetMainnet ||
                    n.name === KnownInternalNames.Networks.StarkNetSepolia
            );
            
            for (const connector of connectors) {
                const wallet = await resolveStarknetWallet({
                    name,
                    connector,
                    network: starknetNetwork,
                    disconnectWallets: () => disconnectWallets(connector.name, starknetAccounts[connector.id]),
                    address: starknetAccounts[connector.id]
                });

                if (wallet && wallet.address && starknetAccounts[connector.id]) {
                    addWallet(wallet);
                }
            }
        };

        if (Object.keys(starknetAccounts).length) {
            initializeWallet();
        }
    }, [connectors, networks]);

    return <StarknetContext.Provider value={{}}>{children}</StarknetContext.Provider>;
};