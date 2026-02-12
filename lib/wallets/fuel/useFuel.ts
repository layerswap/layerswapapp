import KnownInternalNames from "../../knownIds";
import {
    useConnectors,
    useFuel as useGlobalFuel,
} from '@fuels/react';
import { Connector, useAccount } from "wagmi";
import {
    FuelConnector,
    FuelConnectorEventTypes,
    Predicate,
    getPredicateRoot,
} from '@fuel-ts/account';
import { Address } from '@fuel-ts/address';
import { Address as LayerswapAddress } from "@/lib/address";
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon";
import { InternalConnector, Wallet, WalletProvider } from "@/Models/WalletProvider";
import { useEffect, useMemo } from "react";
import { useSettingsState } from "@/context/settings";
import { BAKO_STATE } from "./Bako";
import sleep from "../utils/sleep";
import { useWalletStore } from "@/stores/walletStore";

export default function useFuel(): WalletProvider {
    const commonSupportedNetworks = [
        KnownInternalNames.Networks.FuelTestnet,
        KnownInternalNames.Networks.FuelDevnet,
        KnownInternalNames.Networks.FuelMainnet
    ]
    const name = 'Fuel'
    const id = 'fuel'

    const { address: evmAddress, connector: evmConnector } = useAccount()
    const { connectors } = useConnectors()
    const { fuel } = useGlobalFuel()
    const { networks } = useSettingsState()

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
                        evmAddress,
                        evmConnector,
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
                        evmAddress,
                        evmConnector,
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
            type: isInstalled ? 'injected' : 'other',
            installUrl: c.metadata.install.link,
            extensionNotFound: !c.installed,
            providerName: name
        }
    })

    const provider: WalletProvider = {
        connectWallet,
        disconnectWallets,
        switchAccount,
        switchChain,
        availableWalletsForConnect,
        autofillSupportedNetworks: commonSupportedNetworks,
        withdrawalSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        activeWallet: connectedWallets?.[0],
        connectedWallets,
        name,
        id,
        ready: connectors.length > 0
    }

    return provider
}

type ResolveWalletProps = {
    address: string,
    addresses: string[],
    connector: FuelConnector,
    evmAddress: `0x${string}` | undefined,
    evmConnector: Connector | undefined,
    disconnectWallet: (connectorName: string) => Promise<void>,
    name: string,
    commonSupportedNetworks: string[],
    networkIcon?: string,
}

const resolveFuelWallet = async ({ address, addresses, commonSupportedNetworks, connector, disconnectWallet, evmAddress, evmConnector, name, networkIcon }: ResolveWalletProps) => {
    let fuelCurrentConnector: string | undefined = undefined

    let customConnectorname: string | undefined = undefined
    const fuelEvmConnector = connector.name === 'Ethereum Wallets' ? connector : undefined
    // const fuelSolanaConnector = connector.name === 'Solana Wallets' ? connector : undefined

    if (fuelEvmConnector && evmAddress && fuelEvmConnector.connected && evmConnector) {
        // @ts-expect-error processPredicateData is only available in the Predicate class
        const { predicateBytes } = Predicate.processPredicateData(
            (fuelEvmConnector as any)?.predicateAccount?.bytecode,
            (fuelEvmConnector as any)?.predicateAccount?.abi,
            {
                SIGNER: (fuelEvmConnector as any)?.predicateAccount?.adapter?.convertAddress(evmAddress),
            },
        );
        const convertedAddress = Address.fromB256(getPredicateRoot(predicateBytes)).toString();
        if (convertedAddress.toLowerCase() === address.toLowerCase()) {
            fuelCurrentConnector = `${evmConnector.name} (${new LayerswapAddress(evmAddress, null, 'evm').toShortString()})`
            customConnectorname = evmConnector.name
        }
    }
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
        icon: resolveWalletConnectorIcon({ connector: customConnectorname || connector.name, address: address, iconUrl: typeof connector.metadata.image === 'string' ? connector.metadata.image : (connector.metadata.image?.light.startsWith('data:') ? connector.metadata.image.light : `data:image/svg+xml;base64,${connector.metadata.image && btoa(connector.metadata.image.light)}`) }),
        autofillSupportedNetworks: commonSupportedNetworks,
        withdrawalSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        networkIcon
    }

    return w
}