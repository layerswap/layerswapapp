import { useAccount, useConfig, useSwitchAccount } from "wagmi"
import { Network, NetworkType, NetworkWithTokens } from "../../../Models/Network"
import { useSettingsState } from "../../../context/settings"
import KnownInternalNames from "../../knownIds"
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon"
import { useMemo } from "react"
import { Wallet, WalletProvider } from "../../../Models/WalletProvider"
import { useUserWallets, useDynamicContext, Wallet as DynamicWallet, dynamicEvents } from "@dynamic-labs/sdk-react-core"

const ethereumNames = [KnownInternalNames.Networks.EthereumMainnet, KnownInternalNames.Networks.EthereumSepolia]
export default function useEVM({ network }: { network: Network | undefined }): WalletProvider {
    const name = 'EVM'
    const id = 'evm'
    const { networks } = useSettingsState()
    const { connectors: activeConnectors } = useSwitchAccount()
    const activeAccount = useAccount()
    const config = useConfig()
    const { setShowAuthFlow, handleLogOut } = useDynamicContext();
    const userWallets = useUserWallets();

    const asSourceSupportedNetworks = [
        ...networks.filter(network => network.type === NetworkType.EVM).map(l => l.name),
        KnownInternalNames.Networks.ZksyncMainnet,
        KnownInternalNames.Networks.LoopringGoerli,
        KnownInternalNames.Networks.LoopringMainnet,
        KnownInternalNames.Networks.LoopringSepolia
    ]

    const withdrawalSupportedNetworks = [
        ...asSourceSupportedNetworks,
    ]

    const autofillSupportedNetworks = [
        ...asSourceSupportedNetworks,
        KnownInternalNames.Networks.ImmutableXMainnet,
        KnownInternalNames.Networks.ImmutableXGoerli,
        KnownInternalNames.Networks.BrineMainnet,
    ]

    const connectWallet = async () => {

        if (userWallets.length) await handleLogOut()

        function connectAndWaitForStatusChange() {
            return new Promise((resolve, reject) => {
                try {
                    setShowAuthFlow(true)

                    let wallet: DynamicWallet | undefined = undefined

                    dynamicEvents.on('walletAdded', async (newWallet) => {
                        wallet = newWallet
                        resolve(wallet)
                    })

                    dynamicEvents.on('authFlowCancelled', async (params) => {
                        if (!wallet) {
                            reject('User cancelled the connection');
                        }
                    })

                } catch (error) {
                    console.error('Error connecting:', error);
                    reject(error);
                }
            });
        }

        const result: Wallet | undefined = await connectAndWaitForStatusChange()
            .then((newWallet: DynamicWallet) => {

                const wallet: Wallet | undefined = newWallet && newWallet.address ? ResolveWallet({
                    activeConnection: (activeAccount.connector && activeAccount.address) ? {
                        id: activeAccount.connector.id,
                        address: activeAccount.address
                    } : undefined,
                    connection: newWallet,
                    discconnect: disconnectWallets,
                    networks,
                    network,
                    supportedNetworks: {
                        asSource: asSourceSupportedNetworks,
                        autofill: autofillSupportedNetworks,
                        withdrawal: withdrawalSupportedNetworks
                    },
                    providerName: name
                }) : undefined

                return wallet ? wallet : undefined
            })
            .catch((error) => {
                console.error('Promise rejected with error:', error);
                throw new Error(error);
            });

        return result

    }

    const disconnectWallets = async () => {
        try {
            await handleLogOut()
        }
        catch (e) {
            console.log(e)
        }
    }

    const resolvedConnectors: Wallet[] = useMemo(() => {
        return activeConnectors.map((w): Wallet | undefined => {

            const dynamicWallet = userWallets.find(w => w.connector.name === w.connector.name)

            const wallet = dynamicWallet && ResolveWallet({
                activeConnection: (activeAccount.connector && activeAccount.address) ? {
                    id: activeAccount.connector.id,
                    address: activeAccount.address
                } : undefined,
                connection: dynamicWallet,
                discconnect: disconnectWallets,
                networks,
                network,
                supportedNetworks: {
                    asSource: asSourceSupportedNetworks,
                    autofill: autofillSupportedNetworks,
                    withdrawal: withdrawalSupportedNetworks
                },
                providerName: name
            })

            return wallet
        }).filter(w => w !== undefined) as Wallet[]
    }, [activeAccount, activeConnectors, config, network, userWallets])

    const provider = {
        connectWallet,
        disconnectWallets,
        activeWallet: resolvedConnectors.find(w => w.isActive),
        connectedWallets: resolvedConnectors,
        autofillSupportedNetworks,
        withdrawalSupportedNetworks,
        asSourceSupportedNetworks,
        name,
        id,
        providerIcon: networks.find(n => ethereumNames.some(name => name === n.name))?.logo
    }

    return provider
}

type ResolveWalletProps = {
    connection: DynamicWallet
    networks: NetworkWithTokens[],
    network: Network | undefined,
    activeConnection: {
        id: string,
        address: string
    } | undefined,
    discconnect: (connectorName?: string | undefined) => Promise<void>,
    supportedNetworks: {
        asSource: string[],
        autofill: string[],
        withdrawal: string[]
    },
    providerName: string
}

const ResolveWallet = (props: ResolveWalletProps): Wallet | undefined => {
    const { activeConnection, connection, networks, discconnect, network, supportedNetworks, providerName } = props
    const accountIsActive = activeConnection?.address === connection?.address

    const addresses = [connection?.address] as (string[] | undefined);
    const activeAddress = activeConnection?.address
    const connector = connection?.connector.name
    if (!connector)
        return undefined
    const address = accountIsActive ? activeAddress : addresses?.[0]
    if (!address) return undefined

    const walletname = `${connector} - EVM`

    const wallet: Wallet = {
        id: connector,
        isActive: accountIsActive,
        address,
        addresses: addresses || [address],
        displayName: walletname,
        providerName,
        icon: resolveWalletConnectorIcon({ connector: connector, address }),
        disconnect: () => discconnect(connector),
        isNotAvailable: isNotAvailable(connector, network),
        asSourceSupportedNetworks: supportedNetworks.asSource,
        autofillSupportedNetworks: supportedNetworks.autofill,
        withdrawalSupportedNetworks: supportedNetworks.withdrawal,
        networkIcon: networks.find(n => ethereumNames.some(name => name === n.name))?.logo,
    }

    return wallet
}

const isNotAvailable = (connector: string | undefined, network: Network | undefined) => {
    if (!network) return false
    if (!connector) return true
}