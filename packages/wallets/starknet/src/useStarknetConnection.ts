import { Connector, useConnect, useDisconnect } from "@starknet-react/core";
import { InternalConnector, Wallet, WalletConnectionProvider, WalletConnectionProviderProps, NetworkWithTokens } from "@layerswap/widget/types";
import { KnownInternalNames, walletIconResolver } from "@layerswap/widget/internal";
import { useStarknetStore } from "./starknetWalletStore";
import { useStarknetTransfer } from "./useStarknetTransfer";
import { resolveStarknetWalletIcon } from "./utils";
import { name, id, starknetNames } from "./constants"

export default function useStarknetConnection({ networks }: WalletConnectionProviderProps): WalletConnectionProvider {

    const { connectors } = useConnect();
    const { disconnectAsync } = useDisconnect()

    const starknetWallets = useStarknetStore((state) => state.connectedWallets)
    const addWallet = useStarknetStore((state) => state.connectWallet)
    const removeAccount = useStarknetStore((state) => state.removeAccount)
    const addAccount = useStarknetStore((state) => state.addAccount)

    const activeWalletAddress = useStarknetStore((state) => state.activeWalletAddress);
    const setActiveWallet = useStarknetStore((state) => state.setActiveWallet);

    const activeWallet = starknetWallets.find(wallet => wallet.address === activeWalletAddress);
    const isMainnet = networks?.some(network => network.name === KnownInternalNames.Networks.StarkNetMainnet)

    const connectWallet = async ({ connector }) => {
        try {
            const starknetConnector = connectors.find(c => c.id === connector.id)

            let result = await starknetConnector?.connect({})

            const walletChain = `0x${result?.chainId?.toString(16)}`
            const isWalletOnMainnet = walletChain === '0x534e5f4d41494e'
            const wrongChain = isWalletOnMainnet !== isMainnet
            const starknetNetwork = networks.find(n => n.name === KnownInternalNames.Networks.StarkNetMainnet || n.name === KnownInternalNames.Networks.StarkNetSepolia)

            if (result?.account && wrongChain) {
                const wallet = (starknetConnector as any)?._wallet || (starknetConnector as any)?.wallet
                if (wallet?.request) {
                    const targetChainId = isMainnet ? 'SN_MAIN' : 'SN_SEPOLIA'
                    try {
                        await wallet.request({
                            type: "wallet_switchStarknetChain",
                            params: { chainId: targetChainId }
                        })
                        result = await starknetConnector?.connect({})
                    } catch (switchError) {
                        console.log('Chain switch failed:', switchError)
                        disconnectWallets(connector?.name, result?.account)
                        throw new Error(`Failed to switch network. Please switch manually to ${isMainnet ? 'Mainnet' : 'Sepolia'} in your wallet.`)
                    }
                } else {
                    disconnectWallets(connector?.name, result?.account)
                    throw new Error(`Please switch the network in your wallet to ${isMainnet ? 'Mainnet' : 'Sepolia'} and connect again.`)
                }
            }

            if (result?.account && starknetConnector) {
                const resolvedWallet = await resolveStarknetWallet({
                    name,
                    connector: starknetConnector,
                    network: starknetNetwork,
                    disconnectWallets: () => disconnectWallets(starknetConnector.id, result?.account),
                    address: result?.account,
                    withdrawalSupportedNetworks: starknetNames,
                    autofillSupportedNetworks: starknetNames,
                    asSourceSupportedNetworks: starknetNames,
                });

                addAccount(starknetConnector.id, result.account);
                if (resolvedWallet) {
                    addWallet(resolvedWallet);
                    setActiveWallet(resolvedWallet.address)
                    return resolvedWallet;
                }
            }
        }
        catch (e) {
            throw e
        }
    }

    const disconnectWallets = async (connectorName?: string, address?: string) => {
        try {
            await disconnectAsync()
            if (address) removeAccount(address)
        }
        catch (e) {
            //TODO: handle error
            console.log(e)
        }
    }

    const availableWalletsForConnect: InternalConnector[] = connectors.map(connector => {

        const name = (!connectorsConfigs.some(c => c.id === connector.id) || connector?.["_wallet"]) ? connector.name : `${connectorsConfigs.find(c => c.id === connector.id)?.name}`

        return {
            name: name,
            id: connector.id,
            icon: resolveStarknetWalletIcon({ icon: connector.icon }),
            type: connector?.["_wallet"] ? 'injected' : 'other',
            installUrl: connectorsConfigs.find(c => c.id === connector.id)?.installLink,
            extensionNotFound: !connector?.["_wallet"] && connectorsConfigs.find(c => c.id === connector.id)?.installLink !== undefined,
            providerName: name
        }
    })

    const switchAccount = async (connector: Wallet, address: string): Promise<void> => {
        setActiveWallet(address);
    };

    const { executeTransfer: transfer } = useStarknetTransfer()

    const provider: WalletConnectionProvider = {
        connectWallet,
        switchAccount,

        transfer,

        connectedWallets: starknetWallets,
        activeWallet,
        withdrawalSupportedNetworks: starknetNames,
        autofillSupportedNetworks: starknetNames,
        asSourceSupportedNetworks: starknetNames,
        availableWalletsForConnect,
        name,
        id,
        providerIcon: networks.find(n => starknetNames.some(name => name === n.name))?.logo,
        ready: connectors.length > 0
    }

    return provider
}
type ResolveStarknetWalletProps = {
    name: string,
    connector: Connector;
    network: NetworkWithTokens | undefined;
    disconnectWallets: (connectorName?: string, address?: string) => Promise<void>;
    address: string,
    withdrawalSupportedNetworks: string[]
    autofillSupportedNetworks?: string[],
    asSourceSupportedNetworks?: string[]
}

export async function resolveStarknetWallet(props: ResolveStarknetWalletProps): Promise<Wallet | null> {
    const { name, connector, network, disconnectWallets, address, withdrawalSupportedNetworks, autofillSupportedNetworks, asSourceSupportedNetworks } = props;
    try {
        const walletChain = network?.chain_id;
        const { RpcProvider, WalletAccount } = await import('starknet')
        const rpcProvider = new RpcProvider({ nodeUrl: network?.node_url })

        const walletAccount = new WalletAccount({ provider: rpcProvider, walletProvider: (connector as any).wallet, address })

        const accounts = await walletAccount.requestAccounts(true)
        const account = accounts?.[0];

        const wallet: Wallet = {
            id: connector.name,
            displayName: `${connector.name} - Starknet`,
            address: account,
            addresses: [account],
            chainId: walletChain || '',
            icon: walletIconResolver(address, resolveStarknetWalletIcon({ icon: connector.icon })),
            providerName: name,
            metadata: {
                starknetAccount: walletAccount,
            },
            isActive: true,
            withdrawalSupportedNetworks,
            disconnect: () => disconnectWallets(connector.name, account),
            networkIcon: starknetNames.includes(network?.name || '') ? network?.logo : undefined,
            autofillSupportedNetworks,
            asSourceSupportedNetworks
        };

        return wallet;
    } catch (e) {
        console.warn(`Failed to initialize wallet for ${connector.name}:`, e);
        return null;
    }
}

const connectorsConfigs = [
    {
        id: "braavos",
        name: "Braavos",
        installLink: "https://chromewebstore.google.com/detail/braavos-starknet-wallet/jnlgamecbpmbajjfhmmmlhejkemejdma"
    },
    {
        id: "argentX",
        name: 'Argent X',
        installLink: "https://chromewebstore.google.com/detail/argent-x-starknet-wallet/dlcobpjiigpikoobohmabehhmhfoodbb"
    },
    {
        id: "keplr",
        name: 'Keplr',
        installLink: "https://chromewebstore.google.com/detail/keplr/dmkamcknogkgcdfhhbddcghachkejeap"
    },
    {
        id: "xverse",
        name: 'Xverse Wallet',
        installLink: "https://chromewebstore.google.com/detail/xverse-bitcoin-crypto-wal/idnnbdplmphpflfnlkomgpfbpcgelopg"
    }
]
