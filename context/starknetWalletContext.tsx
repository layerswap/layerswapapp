import React, { useEffect, createContext, ReactNode } from 'react';
import { useConnect, useDisconnect } from '@starknet-react/core';
import { useSettingsState } from './settings';
import KnownInternalNames from '../lib/knownIds';
import { resolveStarknetWallet } from '../lib/wallets/starknet/useStarknet';
import { useStarknetStore } from '../stores/starknetWalletStore';
import { getStarknet } from 'get-starknet-core';

export const StarknetContext = createContext({});

export const StarknetWalletProvider = ({ children }: { children: ReactNode }) => {
    const { connectors } = useConnect();
    const { disconnectAsync } = useDisconnect()
    const { networks } = useSettingsState();

    const name = 'Starknet'

    const addWallet = useStarknetStore((state) => state.connectWallet)
    const removeWallet = useStarknetStore((state) => state.disconnectWallet)
    const starknetAccounts = useStarknetStore((state) => state.starknetAccounts) || {};

    const disconnectWallets = async (connectorId?: string) => {
        try {
            await disconnectAsync()
            removeWallet(name, connectorId)
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

            const wallet = getStarknet();
            const preAuthorized = await wallet.getPreAuthorizedWallets();
            const authorizedIds = preAuthorized.map(w => w.id);

            const validConnectors = connectors.filter(
                (connector) =>
                    authorizedIds.includes(connector.id) &&
                    connector.id in starknetAccounts
            );

            for (const connector of validConnectors) {
                const starkent = networks.find(n => n.name === KnownInternalNames.Networks.StarkNetMainnet || n.name === KnownInternalNames.Networks.StarkNetSepolia)

                const { RpcProvider, WalletAccount } = await import('starknet')
                const rpcProvider = new RpcProvider({ nodeUrl: starkent?.node_url });
                const walletAccount = new WalletAccount(rpcProvider, (connector as any).wallet, "1", starknetAccounts[connector.id]);

                const wallet = await resolveStarknetWallet({
                    name,
                    connector,
                    network: starknetNetwork,
                    disconnectWallets: () => disconnectWallets(connector.id),
                    account: starknetAccounts[connector.id],
                    walletAccount
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