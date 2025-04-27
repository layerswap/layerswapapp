// import KnownInternalNames from "../../knownIds"
// import { useWallet } from "@solana/wallet-adapter-react"
// import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon"
// import { Network, NetworkType } from "../../../Models/Network"
// import { InternalConnector, Wallet, WalletProvider } from "../../../Models/WalletProvider"
// import { useMemo } from "react"
// import { useConnectModal } from "../../../components/Wallet/WalletModal"
// import { useSettingsState } from "../../../context/settings"
// import { Adapter } from "@solana/wallet-adapter-base"

// const solanaNames = [KnownInternalNames.Networks.SolanaMainnet, KnownInternalNames.Networks.SolanaDevnet, KnownInternalNames.Networks.SolanaTestnet]

// export default function useSVM({ network }: { network: Network | undefined }): WalletProvider {
//     const { networks } = useSettingsState()

//     const commonSupportedNetworks = [
//         ...networks.filter(network => network.type === NetworkType.Solana).map(l => l.name)
//     ]

//     const name = 'Solana'
//     const id = 'solana'
//     const { disconnect, select, wallets } = useWallet();

//     const connectedWallet = wallets.find(w => w.adapter.connected === true)
//     const connectedAddress = connectedWallet?.adapter.publicKey?.toBase58()
//     const connectedAdapterName = connectedWallet?.adapter.name

//     const connectedWallets = useMemo(() => {

//         const wallet: Wallet | undefined = (connectedAddress && connectedAdapterName) ? {
//             id: connectedAdapterName,
//             address: connectedAddress,
//             displayName: `${connectedWallet?.adapter.name} - Solana`,
//             providerName: name,
//             icon: resolveWalletConnectorIcon({ connector: String(connectedAdapterName), address: connectedAddress, iconUrl: connectedWallet?.adapter.icon }),
//             disconnect,
//             connect: () => connectWallet(),
//             isActive: true,
//             addresses: [connectedAddress],
//             isNotAvailable: isNotAvailable(connectedWallet?.adapter, network),
//             asSourceSupportedNetworks: resolveSupportedNetworks(commonSupportedNetworks, connectedAdapterName),
//             autofillSupportedNetworks: resolveSupportedNetworks(commonSupportedNetworks, connectedAdapterName),
//             withdrawalSupportedNetworks: resolveSupportedNetworks(commonSupportedNetworks, connectedAdapterName),
//             networkIcon: networks.find(n => solanaNames.some(name => name === n.name))?.logo
//         } : undefined

//         if (wallet) {
//             return [wallet]
//         }

//     }, [network, connectedAddress, connectedAdapterName])

//     const { connect } = useConnectModal()

//     const connectWallet = async () => {
//         try {
//             return await connect(provider)
//         }
//         catch (e) {
//             console.log(e)
//             throw new Error(e)
//         }
//     }

//     const connectConnector = async ({ connector }: { connector: InternalConnector }) => {
//         const solanaConnector = wallets.find(w => w.adapter.name === connector.name)
//         if (!solanaConnector) throw new Error('Connector not found')
//         if (connectedWallet) await solanaConnector.adapter.disconnect()
//         select(solanaConnector.adapter.name)
//         await solanaConnector.adapter.connect()

//         const newConnectedWallet = wallets.find(w => w.adapter.connected === true)
//         const connectedAddress = newConnectedWallet?.adapter.publicKey?.toBase58()
//         const wallet: Wallet | undefined = connectedAddress && newConnectedWallet ? {
//             id: newConnectedWallet.adapter.name,
//             address: connectedAddress,
//             displayName: `${newConnectedWallet?.adapter.name} - Solana`,
//             providerName: name,
//             icon: resolveWalletConnectorIcon({ connector: String(newConnectedWallet?.adapter.name), address: connectedAddress, iconUrl: newConnectedWallet?.adapter.icon }),
//             disconnect,
//             connect: () => connectWallet(),
//             isActive: true,
//             addresses: [connectedAddress],
//             isNotAvailable: isNotAvailable(solanaConnector.adapter, network),
//             asSourceSupportedNetworks: resolveSupportedNetworks(commonSupportedNetworks, connector.id),
//             autofillSupportedNetworks: resolveSupportedNetworks(commonSupportedNetworks, connector.id),
//             withdrawalSupportedNetworks: resolveSupportedNetworks(commonSupportedNetworks, connector.id),
//             networkIcon: networks.find(n => solanaNames.some(name => name === n.name))?.logo
//         } : undefined

//         return wallet
//     }

//     const disconnectWallet = async () => {
//         try {
//             await disconnect()
//         }
//         catch (e) {
//             console.log(e)
//         }
//     }

//     const filterConnectors = wallet => !isNotAvailable(wallet.adapter, network)
//     const filteredWallets = wallets.filter(filterConnectors)

//     const availableWalletsForConnect = useMemo(() => {
//         const connectors: InternalConnector[] = [];

//         for (const wallet of filteredWallets) {

//             const internalConnector: InternalConnector = {
//                 name: wallet.adapter.name,
//                 id: wallet.adapter.name,
//                 icon: wallet.adapter.icon,
//                 type: wallet.readyState === 'Installed' ? 'injected' : 'other',
//                 installUrl: (wallet.readyState === 'Installed' || wallet.readyState === 'Loadable') ? undefined : wallet.adapter?.url,
//             }

//             connectors.push(internalConnector)
//         }

//         return connectors;
//     }, [filteredWallets]);

//     const provider = {
//         connectedWallets: connectedWallets,
//         activeWallet: connectedWallets?.[0],
//         connectWallet,
//         connectConnector,
//         disconnectWallets: disconnectWallet,
//         availableWalletsForConnect,
//         withdrawalSupportedNetworks: commonSupportedNetworks,
//         autofillSupportedNetworks: commonSupportedNetworks,
//         asSourceSupportedNetworks: commonSupportedNetworks,
//         name,
//         id,
//         providerIcon: networks.find(n => solanaNames.some(name => name === n.name))?.logo
//     }

//     return provider
// }

// const isNotAvailable = (connector: Adapter | undefined, network: Network | undefined) => {
//     if (!network) return false
//     if (!connector) return true
//     return resolveSupportedNetworks([network.name], connector.name).length === 0
// }

// const networkSupport = {
//     soon: ["okx wallet", "tokenpocket", "nightly"],
//     eclipse: ["nightly", "backpack"],
// };

// function resolveSupportedNetworks(supportedNetworks: string[], connectorId: string): string[] {
//     const supportedNetworksForWallet: string[] = [];

//     supportedNetworks.forEach((network) => {
//         const networkName = network.split("_")[0].toLowerCase();
//         if (networkName === "solana") {
//             supportedNetworksForWallet.push(networkName);
//         } else if (networkSupport[networkName] && networkSupport[networkName].includes(connectorId?.toLowerCase())) {
//             supportedNetworksForWallet.push(networkName);
//         }
//     });

//     return supportedNetworksForWallet;
// }