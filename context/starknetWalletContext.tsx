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
    const starknetAccounts = useStarknetStore((state) => state.starknetAccounts) || {};

    const disconnectWallets = async () => {
        try {
            await disconnectAsync()
            removeWallet(name)
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
                    disconnectWallets,
                    address: starknetAccounts[connector.id]
                });

                if (wallet && Object.keys(starknetAccounts).length) {
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