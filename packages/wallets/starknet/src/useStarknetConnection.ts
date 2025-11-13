import { Connector, useConnect, useDisconnect } from "@starknet-react/core";
import { InternalConnector, Wallet, WalletConnectionProvider, TransactionMessageType, WalletConnectionProviderProps, NetworkWithTokens } from "@layerswap/widget/types";
import { KnownInternalNames } from "@layerswap/widget/internal";
import { resolveStarknetWalletConnectorIcon } from "./utils";
import { useStarknetStore } from "./starknetWalletStore";

const starknetNames = [KnownInternalNames.Networks.StarkNetGoerli, KnownInternalNames.Networks.StarkNetMainnet, KnownInternalNames.Networks.StarkNetSepolia]
export default function useStarknetConnection({ networks }: WalletConnectionProviderProps): WalletConnectionProvider {
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

            const result = await starknetConnector?.connect({})

            const walletChain = `0x${result?.chainId?.toString(16)}`
            const wrongChanin = walletChain == '0x534e5f4d41494e' ? !isMainnet : isMainnet
            const starkent = networks.find(n => n.name === KnownInternalNames.Networks.StarkNetMainnet || n.name === KnownInternalNames.Networks.StarkNetSepolia)

            if (result?.account && wrongChanin) {
                disconnectWallets(connector?.name, result?.account)
                const errorMessage = `Please switch the network in your wallet to ${isMainnet ? 'Mainnet' : 'Sepolia'} and click connect again`
                throw new Error(errorMessage)
            }

            if (result?.account && starknetConnector) {
                const wallet = await resolveStarknetWallet({
                    name,
                    connector: starknetConnector,
                    network: starkent,
                    disconnectWallets: () => disconnectWallets(starknetConnector.id, result?.account),
                    address: result?.account,
                    withdrawalSupportedNetworks,
                    autofillSupportedNetworks: commonSupportedNetworks,
                    asSourceSupportedNetworks: commonSupportedNetworks,
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

    const disconnectWallets = async (connectorName?: string, address?: string) => {
        try {
            await disconnectAsync()
            if (address) removeAccount(address)
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

    const transfer: WalletConnectionProvider['transfer'] = async (params, wallet) => {
        const { callData } = params

        try {
            const { transaction_hash: transferTxHash } = (await wallet?.metadata?.starknetAccount?.execute(JSON.parse(callData || "")) || {});

            if (transferTxHash) {
                return transferTxHash
            }
        } catch (error) {
            const e = new Error()
            e.message = error
            if (error === "An error occurred (USER_REFUSED_OP)" || error === "Execute failed") {
                e.name = TransactionMessageType.TransactionRejected
                throw e
            }
            else if (error === "failedTransfer") {
                e.name = TransactionMessageType.TransactionFailed
                throw e
            }
            else {
                e.name = TransactionMessageType.UnexpectedErrorMessage
                throw e
            }
        }
    }

    const provider: WalletConnectionProvider = {
        connectWallet,
        switchAccount,

        transfer,

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

        const walletAccount = new WalletAccount(rpcProvider, (connector as any).wallet, address)

        const accounts = await walletAccount.requestAccounts(true)
        const account = accounts?.[0];

        const wallet: Wallet = {
            id: connector.name,
            displayName: `${connector.name} - Starknet`,
            address: account,
            addresses: [account],
            chainId: walletChain || '',
            icon: resolveStarknetWalletConnectorIcon({ connector: connector.name, address: account }),
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
    }
]
