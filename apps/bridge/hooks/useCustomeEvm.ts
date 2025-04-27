import { useAccount, useConfig, useSwitchAccount } from "wagmi"
import { useMemo } from "react"
import { useUserWallets, useDynamicContext, Wallet as DynamicWallet, dynamicEvents } from "@dynamic-labs/sdk-react-core"
import { WalletProvider, useSettingsState, Wallet, resolveWalletConnectorIcon, NetworkWithTokens, NetworkType, InternalConnector } from "@layerswap/widget"

export default function useEVM(): WalletProvider {
    const name = 'EVM'
    const id = 'evm'
    const { connectors: activeConnectors } = useSwitchAccount()
    const activeAccount = useAccount()
    const config = useConfig()
    const { setShowAuthFlow, handleLogOut } = useDynamicContext();
    const userWallets = useUserWallets();
    const { networks } = useSettingsState()
    const asSourceSupportedNetworks = [
        ...networks.filter(network => network.type === NetworkType.EVM).map(l => l.name),
    ]

    const withdrawalSupportedNetworks = [
        ...asSourceSupportedNetworks,
    ]

    const autofillSupportedNetworks = [
        ...asSourceSupportedNetworks,
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
                supportedNetworks: {
                    asSource: asSourceSupportedNetworks,
                    autofill: autofillSupportedNetworks,
                    withdrawal: withdrawalSupportedNetworks
                },
                providerName: name
            })

            return wallet
        }).filter(w => w !== undefined) as Wallet[]
    }, [activeAccount, activeConnectors, config, userWallets])

    const logo = networks.find(n => n.name.toLowerCase().includes('ethereum'))?.logo
    const availableWalletsForConnect: InternalConnector[] = [{
        id: id,
        name: name,
        icon: logo,
    }]
    const provider = {
        connectWallet,
        connectConnector: connectWallet,
        disconnectWallets,
        activeWallet: resolvedConnectors.find(w => w.isActive),
        connectedWallets: resolvedConnectors,
        autofillSupportedNetworks,
        withdrawalSupportedNetworks,
        asSourceSupportedNetworks,
        name,
        id,
        availableWalletsForConnect,
        providerIcon: logo,
    }

    return provider
}

type ResolveWalletProps = {
    connection: DynamicWallet
    networks: NetworkWithTokens[],
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
    const { activeConnection, connection, networks, discconnect, supportedNetworks, providerName } = props
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
        asSourceSupportedNetworks: supportedNetworks.asSource,
        autofillSupportedNetworks: supportedNetworks.autofill,
        withdrawalSupportedNetworks: supportedNetworks.withdrawal,
        networkIcon: networks.find(n => "ETHEREUM_MAINNET")?.logo,
    }

    return wallet
}
