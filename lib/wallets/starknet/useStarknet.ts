import { useStarknetStore } from '../../../stores/starknetWalletStore'
import KnownInternalNames from "../../knownIds"
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon";
import { useSettingsState } from "../../../context/settings";
import { Connector, useConnect, useDisconnect, useProvider } from "@starknet-react/core";
import { InternalConnector, Wallet, WalletProvider } from "../../../Models/WalletProvider";
import { useConnectModal } from "../../../components/WalletModal";
import { NetworkWithTokens } from '../../../Models/Network';
import { WalletAccount } from 'starknet';
import { getStarknet } from 'get-starknet-core';


const starknetNames = [KnownInternalNames.Networks.StarkNetGoerli, KnownInternalNames.Networks.StarkNetMainnet, KnownInternalNames.Networks.StarkNetSepolia]
export default function useStarknet(): WalletProvider {
    const commonSupportedNetworks = [
        KnownInternalNames.Networks.StarkNetMainnet,
        KnownInternalNames.Networks.StarkNetGoerli,
        KnownInternalNames.Networks.StarkNetSepolia
    ]
   
    const withdrawalSupportedNetworks = [
        ...commonSupportedNetworks
    ]

    const name = 'Starknet'
    const id = 'starknet'
    const { networks } = useSettingsState()

    const { connectors } = useConnect();
    const { disconnectAsync } = useDisconnect()

    const starknetWallets = useStarknetStore((state) => state.connectedWallets)
    const addWallet = useStarknetStore((state) => state.connectWallet)
    const removeWallet = useStarknetStore((state) => state.disconnectWallet)
    const addAccount = useStarknetStore((state) => state.addAccount)
    const starknetAccounts = useStarknetStore((state) => state.starknetAccounts) || {};

    const activeWalletAddress = useStarknetStore((state) => state.activeWalletAddress);
    const setActiveWallet = useStarknetStore((state) => state.setActiveWallet);

    const activeWallet = starknetWallets.find(wallet => wallet.address === activeWalletAddress);
    const isMainnet = networks?.some(network => network.name === KnownInternalNames.Networks.StarkNetMainnet)

    const { connect } = useConnectModal()

    const connectWallet = async () => {
        try {
            return await connect(provider)
        }
        catch (e) {
            console.log(e)
        }
    }

    const connectConnector = async ({ connector }) => {
        try {
            const starknetConnector = connectors.find(c => c.id === connector.id)

            const result = await starknetConnector?.connect({})

            const walletChain = `0x${result?.chainId?.toString(16)}`
            const wrongChanin = walletChain == '0x534e5f4d41494e' ? !isMainnet : isMainnet

            if (result?.account && wrongChanin) {
                disconnectWallets()
                const errorMessage = `Please switch the network in your wallet to ${isMainnet ? 'Mainnet' : 'Sepolia'} and click connect again`
                throw new Error(errorMessage)
            }

            if (result?.account && starknetConnector) {
                const starkent = networks.find(n => n.name === KnownInternalNames.Networks.StarkNetMainnet || n.name === KnownInternalNames.Networks.StarkNetSepolia)

                const { RpcProvider, WalletAccount } = await import('starknet')
                const rpcProvider = new RpcProvider({ nodeUrl: starkent?.node_url })
                
                const walletAccount = new WalletAccount(rpcProvider, (starknetConnector as any).wallet, "1", starknetAccounts[result.account.toLowerCase()])
                const accounts = await walletAccount.requestAccounts(true)
        
                const account = accounts?.[0];
        
                if (!account) {
                    const removeAccount = useStarknetStore.getState().removeAccount;
                    removeAccount(connector.id);
                    return 
                }

                const wallet = await resolveStarknetWallet({
                    name,
                    connector: starknetConnector,
                    network: starkent,
                    disconnectWallets,
                    account,
                    walletAccount
                });

                addAccount(starknetConnector.id, result.account);
                if (wallet) {
                    addWallet(wallet);
                    setActiveWallet(wallet.address)
                    return wallet;
                }
            }
        }

        catch (e) {
            console.log(e)
            throw new Error(e)
        }
    }

    const disconnectWallets = async (connectorId?: string) => {
        try {
            await disconnectAsync()
            removeWallet(name, connectorId) 
        }
        catch (e) {
            console.log(e)
        }
    }

    const availableWalletsForConnect: InternalConnector[] = connectors.map(connector => {

        const name = (!connectorsConfigs.some(c => c.id === connector.id) || connector?.["_wallet"]) ? connector.name : `${connectorsConfigs.find(c => c.id === connector.id)?.name}`

        return {
            name: name,
            id: connector.id,
            icon: typeof connector.icon === 'string' ? connector.icon : (connector.icon.light.startsWith('data:') ? connector.icon.light : `data:image/svg+xml;base64,${btoa(connector.icon.light.replaceAll('currentColor', '#FFFFFF'))}`),
            type: connector?.["_wallet"] ? 'injected' : 'other',
            installUrl: connector?.["_wallet"] ? undefined : connectorsConfigs.find(c => c.id === connector.id)?.installLink,
        }
    })

    const switchAccount = async (connector: Wallet, address: string): Promise<void> => {
        setActiveWallet(address);
    };

    const provider: WalletProvider = {
        connectWallet,
        connectConnector,
        switchAccount,
        connectedWallets: starknetWallets,
        activeWallet,
        withdrawalSupportedNetworks,
        autofillSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        availableWalletsForConnect,
        name,
        id,
        providerIcon: networks.find(n => starknetNames.some(name => name === n.name))?.logo
    }

    return provider
}

export async function resolveStarknetWallet({
    name,
    connector,
    network,
    disconnectWallets,
    account,
    walletAccount
}: {
    name: string,
    connector: Connector;
    network: NetworkWithTokens | undefined;
    disconnectWallets: (connectorId?: string) => Promise<void>;
    account: string;
    walletAccount: WalletAccount
}): Promise<Wallet | null> {
    try {
        const walletChain = network?.chain_id;

        const wallet: Wallet = {
            id: connector.name,
            displayName: `${connector.name} - Starknet`,
            address: account,
            addresses: [account],
            chainId: walletChain || '',
            icon: resolveWalletConnectorIcon({ connector: connector.name, address: account }),
            providerName: name,
            metadata: {
                starknetAccount: walletAccount,
            },
            isActive: true,
            disconnect: () => disconnectWallets(connector.id),
            networkIcon: starknetNames.includes(network?.name || '') ? network?.logo : undefined,
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
    }
]
