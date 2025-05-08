import React, { useEffect, createContext, ReactNode } from 'react';
import { useConnect, useDisconnect } from '@starknet-react/core';
import { useSettingsState } from './settings';
import KnownInternalNames from '../lib/knownIds';
import { useWalletStore } from '../stores/walletStore';
import { resolveStarknetWallet } from '../lib/wallets/starknet/useStarknet';

export const StarknetContext = createContext({});

export const StarknetProvider = ({ children }: { children: ReactNode }) => {
    const { connectors } = useConnect();
    const { disconnectAsync } = useDisconnect()
    const { networks } = useSettingsState();

    const name = 'Starknet'

    const addWallet = useWalletStore((state) => state.connectWallet)
    const removeWallet = useWalletStore((state) => state.disconnectWallet)
    
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
                });

                if (wallet) {
                    addWallet(wallet);
                }
            }
        };

        initializeWallet();
    }, [connectors, networks]);

    return <StarknetContext.Provider value={{}}>{children}</StarknetContext.Provider>;
};