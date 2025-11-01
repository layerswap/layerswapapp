import { useConnectors, useFuel as useGlobalFuel, } from '@fuels/react';
import { FuelConnector, FuelConnectorEventTypes, Provider, } from '@fuel-ts/account';
import { Address } from '@fuel-ts/address';
import { useWalletStore, sleep, KnownInternalNames } from "@layerswap/widget/internal";
import { useEffect, useMemo } from "react";
import { transactionBuilder } from "./services/transferService/transactionBuilder";
import { BAKO_STATE } from "./connectors/bako-safe/Bako";
import { TransactionMessageType, InternalConnector, Wallet, WalletConnectionProvider, WalletConnectionProviderProps } from "@layerswap/widget/types";
import { resolveFuelWalletConnectorIcon } from './utils';

export default function useFuelConnection({ networks }: WalletConnectionProviderProps): WalletConnectionProvider {
    const commonSupportedNetworks = [
        KnownInternalNames.Networks.FuelTestnet,
        KnownInternalNames.Networks.FuelDevnet,
        KnownInternalNames.Networks.FuelMainnet
    ]
    const name = 'Fuel'
    const id = 'fuel'

    const { connectors } = useConnectors()
    const { fuel } = useGlobalFuel()

    const wallets = useWalletStore((state) => state.connectedWallets)
    const addWallet = useWalletStore((state) => state.connectWallet)
    const removeWallet = useWalletStore((state) => state.disconnectWallet)
    const connectedWallets = wallets.filter(wallet => wallet.providerName === name)

    const connectWallet = async ({ connector }: { connector: InternalConnector }) => {
        const attemptConnection = async (isRetry: boolean = false): Promise<Wallet | undefined> => {
            try {

                const fuelConnector = connectors.find(w => w.name === connector.name)

                BAKO_STATE.state.last_req = undefined
                BAKO_STATE.period_durtion = 120_000
                await fuelConnector?.connect()

                const addresses = (await fuelConnector?.accounts())?.map(a => new Address(a).toB256())

                if (addresses && fuelConnector) {

                    const result = await resolveFuelWallet({
                        address: addresses[0],
                        addresses: addresses,
                        connector: fuelConnector,
                        disconnectWallet,
                        name,
                        commonSupportedNetworks,
                        networkIcon: networks.find(n => commonSupportedNetworks.some(name => name === n.name))?.logo
                    })

                    addWallet(result)
                    await switchAccount(result)
                    return result
                }

            }
            catch (e) {
                // For Bako Safe, retry once if error is 'false' (connection timeout/user closed popup)
                if (connector.name === 'Bako Safe' && e === false && !isRetry) {
                    console.log('Bako Safe connection failed with false, retrying once...')
                    await sleep(1000)
                    return await attemptConnection(true)
                }
                console.log(e)
                throw new Error(e)
            }
        }

        return await attemptConnection()
    }

    const disconnectWallet = async (connectorName: string) => {
        try {
            const fuelConnector = connectors.find(c => c.name === connectorName)

            if (!fuelConnector) throw new Error('Connector not found')

            await fuelConnector.disconnect()
        }
        catch (e) {
            console.log(e)
        } finally {
            removeWallet(name, connectorName)
        }
    }

    const disconnectWallets = async () => {
        try {
            BAKO_STATE.state.last_req = undefined
            BAKO_STATE.period_durtion = 10_000
            for (const connector of connectors.filter(c => c.connected)) {
                await connector.disconnect()
                removeWallet(name)
            }
        }
        catch (e) {
            console.log(e)
        }
    }

    const switchAccount = async (wallet: Wallet) => {
        try {
            const res = await fuel.selectConnector(wallet.id)

            if (!res) throw new Error('Could not switch account')
        } catch (e) {
            console.log(e)
        }
    }

    const switchChain = async (connector: Wallet, chainId: string | number) => {
        try {
            const fuelConnector = connectors.find(c => c.name === connector.id)

            if (!fuelConnector) throw new Error('Connector not found')

            const res = await fuelConnector.selectNetwork({ chainId: Number(chainId) })

            if (!res) throw new Error('Could not switch chain')
        } catch (e) {
            console.log(e)
        }
    }

    const transfer: WalletConnectionProvider['transfer'] = async (params) => {
        const { callData, network, selectedWallet, swapId } = params

        const fuelProvider = new Provider(network.node_url);
        const fuelWallet = await fuel.getWallet(selectedWallet.address, fuelProvider);

        if (!fuelWallet) throw Error("Fuel wallet not found")

        try {
            const scriptTransaction = await transactionBuilder({ fuelWallet, callData })
            await fuelProvider.simulate(scriptTransaction);

            const transactionResponse = await fuelWallet.sendTransaction(scriptTransaction);

            if (swapId && transactionResponse) {
                return transactionResponse.id;
            }
        } catch (error) {
            const e = new Error()
            e.message = error.message
            if (error === "The account(s) sending the transaction don't have enough funds to cover the transaction."
                || error === "the target cannot be met due to no coins available or exceeding the 255 coin limit."
            ) {
                error.name = TransactionMessageType.InsufficientFunds
                throw e
            }
            else if (error === "Request cancelled without user response!" || error === "User rejected the transaction!" || error === "User canceled sending transaction") {
                e.name = TransactionMessageType.TransactionRejected
                throw e
            }
            else {
                e.name = TransactionMessageType.UnexpectedErrorMessage
                throw e
            }
        }
    }

    const connectedConnectors = useMemo(() => connectors.filter(w => w.connected), [connectors])

    useEffect(() => {
        (async () => {
            resolveWallet()
        })()
    }, [connectedConnectors])

    const resolveWallet = async () => {
        for (const connector of connectedConnectors) {
            try {
                const addresses = (await connector.accounts()).map(a => Address.fromAddressOrString(a).toB256())
                if (connector.connected && addresses.length > 0) {
                    const w = await resolveFuelWallet({
                        address: addresses?.[0],
                        addresses,
                        connector,
                        disconnectWallet,
                        name,
                        commonSupportedNetworks: commonSupportedNetworks,
                        networkIcon: networks.find(n => commonSupportedNetworks.some(name => name === n.name))?.logo
                    })
                    addWallet(w)
                }

            } catch (e) {
                console.log(e)
            }
        }
    };

    useEffect(() => {
        const disposers = connectors.map((c) => {
            const handler = async () => {
                await resolveWallet()
            };

            c.on(FuelConnectorEventTypes.currentNetwork, handler);
            return { connector: c, handler };
        });

        return () => {
            disposers.forEach(({ connector, handler }) => {
                connector.off(FuelConnectorEventTypes.currentNetwork, handler);
            });
        };
    }, [connectors]);

    const availableWalletsForConnect: InternalConnector[] = connectors.map(c => {
        const isInstalled = c.installed && !c['dAppWindow']
        return {
            name: c.name,
            id: c.name,
            icon: typeof c.metadata.image === 'string' ? c.metadata.image : (c.metadata.image?.dark.startsWith('data:') ? c.metadata.image.dark : `data:image/svg+xml;base64,${c.metadata.image && btoa(c.metadata.image.dark)}`),
            type: isInstalled ? 'injected' : 'other',
            installUrl: c.installed ? undefined : c.metadata.install.link,
        }
    })

    const provider: WalletConnectionProvider = {
        connectWallet,
        disconnectWallets,
        switchAccount,
        switchChain,

        transfer,

        availableWalletsForConnect,
        autofillSupportedNetworks: commonSupportedNetworks,
        withdrawalSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        activeWallet: connectedWallets?.[0],
        connectedWallets,
        name,
        id,
    }

    return provider
}

type ResolveWalletProps = {
    address: string,
    addresses: string[],
    connector: FuelConnector,
    disconnectWallet: (connectorName: string) => Promise<void>,
    name: string,
    commonSupportedNetworks: string[],
    networkIcon?: string,
}

const resolveFuelWallet = async ({ address, addresses, commonSupportedNetworks, connector, disconnectWallet, name, networkIcon }: ResolveWalletProps) => {
    let fuelCurrentConnector: string | undefined = undefined

    let customConnectorname: string | undefined = undefined

    const network = await connector.currentNetwork()
    const chainId = network.chainId || network.url.toLowerCase().includes('testnet') ? 0 : 9889

    const w: Wallet = {
        id: connector.name,
        address: address,
        addresses: addresses,
        isActive: true,
        chainId: chainId,
        disconnect: () => disconnectWallet(connector.name),
        displayName: `${fuelCurrentConnector || connector.name} - Fuel`,
        providerName: name,
        icon: resolveFuelWalletConnectorIcon({ connector: customConnectorname || connector.name, address: address, iconUrl: typeof connector.metadata.image === 'string' ? connector.metadata.image : (connector.metadata.image?.dark.startsWith('data:') ? connector.metadata.image.dark : `data:image/svg+xml;base64,${connector.metadata.image && btoa(connector.metadata.image.dark)}`) }),
        autofillSupportedNetworks: commonSupportedNetworks,
        withdrawalSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        networkIcon
    }

    return w
}