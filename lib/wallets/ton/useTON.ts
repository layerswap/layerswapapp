import { ConnectedWallet, useTonConnectUI, useTonWallet } from "@tonconnect/ui-react"
import { Address } from "@ton/core";
import KnownInternalNames from "../../knownIds";
import { InternalConnector, Wallet, WalletProvider } from "../../../Models/WalletProvider";
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon";
import { useSettingsState } from "../../../context/settings";

export default function useTON(): WalletProvider {
    const { networks } = useSettingsState()

    const commonSupportedNetworks = [
        KnownInternalNames.Networks.TONMainnet,
        KnownInternalNames.Networks.TONTestnet
    ]

    const name = 'TON'
    const id = 'ton'

    const tonWallet = useTonWallet();
    const [tonConnectUI] = useTonConnectUI();

    const address = tonWallet?.account && Address.parse(tonWallet.account.address).toString({ bounceable: false })
    const iconUrl = tonWallet?.["imageUrl"] as string
    const wallet_id = tonWallet?.["name"] || tonWallet?.device.appName
    const wallet: Wallet | undefined = tonWallet && address ? {
        id: wallet_id,
        displayName: `${wallet_id} - Ton`,
        addresses: [address],
        address,
        providerName: name,
        isActive: true,
        icon: resolveWalletConnectorIcon({ connector: name, address, iconUrl }),
        disconnect: () => disconnectWallets(),
        withdrawalSupportedNetworks: commonSupportedNetworks,
        autofillSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        networkIcon: networks.find(n => commonSupportedNetworks.some(name => name === n.name))?.logo
    } : undefined
    const switchAccount = async (wallet: Wallet, address: string) => {
        // as we do not have multiple accounts management we will leave the method empty
    }
    const getWallet = () => {
        if (wallet) {
            return [wallet]
        }
        return undefined
    }

    const connectWallet = async () => {

        if (tonWallet) {
            await disconnectWallets()
        }

        function connectAndWaitForStatusChange(): Promise<ConnectedWallet> {
            return new Promise((resolve, reject) => {
                try {
                    // Initiate the connection
                    tonConnectUI.openModal();

                    tonConnectUI.onModalStateChange((state) => {
                        if (state.status == 'closed' && state.closeReason == 'action-cancelled') {
                            reject("You've declined the wallet connection request");
                        }
                    })
                    // Listen for the status change
                    tonConnectUI.onStatusChange((status) => {
                        if (status) resolve(status); // Resolve the promise with the status
                    });
                } catch (error) {
                    console.error('Error connecting:', error);
                    reject(error); // Reject the promise if an exception is thrown
                }
            });
        }

        const result: Wallet | undefined = await connectAndWaitForStatusChange()
            .then((status: ConnectedWallet) => {
                const connectedAddress = Address.parse(status.account.address).toString({ bounceable: false })
                const connectedName = status.device.appName
                const wallet: Wallet | undefined = status && connectedAddress ? {
                    id: connectedName,
                    displayName: `${connectedName} - Ton`,
                    addresses: [connectedAddress],
                    address: connectedAddress,
                    providerName: name,
                    isActive: true,
                    icon: resolveWalletConnectorIcon({ connector: connectedName, address: connectedAddress }),
                    disconnect: () => disconnectWallets(),
                    connect: () => connectWallet(),
                    withdrawalSupportedNetworks: commonSupportedNetworks,
                    autofillSupportedNetworks: commonSupportedNetworks,
                    asSourceSupportedNetworks: commonSupportedNetworks,
                    networkIcon: networks.find(n => commonSupportedNetworks.some(name => name === n.name))?.logo
                } : undefined

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
            await tonConnectUI.disconnect()
        }
        catch (e) {
            console.log(e)
        }
    }

    const logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADgAAAA4CAYAAACohjseAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAALSSURBVHgB7ZoxUxNBGIa/YEhITJRRG61ig40wjlJpExttsbWCX0DyC5L8AqCzQxpbMmNlFxtoYIYRGipS6YwjMxkxxkRE7r0Z7vYWyIXdb8NsZp8qN3N3e+++u9+7t7kEvfv+n0aYMRpxnEDbcQJtxwm0HSfQdpxA23ECbWfkBSZJk8l0gp7cSVIhf4M4aR79o8a3v6SLlsC5QppWizlPpJmBAJHljTbVm11SRfnJivfHaf31LWPiAEYF2kBbqig/3dLzHA2LyuxNUkVpiE6mvHl3L7y0ftCl8uavvtesv7odXNP42qOFxlHf80vTGVqczvq/iw/GPTfHvCF7QldFTaA0LD97xSCu8VYvuvUTd76KmItQGqKY/K1u+ACLXm+jmnKCe4btnSgLVp6DK3ud4DeKQelxhrjAnBNjZ22/Q6ooC1z+0om6OJNlcRHC5qfSwTGcW967BoGYU+XNdnCMwlN5ql7tzqg8y0bcq223vY5U37rVCrH3+3+8ihiuNkozGa0Vje/eo4ngGO6hDR20Uxo9LLJazJMqcE/k5ccW6aItEA6uCb2MzFJZecwVUhH34ByqtS4s66zq9u9IwVFZecgro5p3Tw5YBKKnxdiAi/NTEwNfj3MjhWWrzeIeYFspIzbEMF56kRs4Niqz4dzDPapM7gE2gX5sbITrS8TGIOEvh7pctHRhfdepN3uR2IgLfznUdw6PtWNBhv1lTnQgzkU51N98+kncsAuEgyu74Ry6zEU51LliQcbI63h1K4yNy1wUQx2FpcZYWESMCETBEWPDdzEVuljIJyPuwXET7oGEyY8QDt7e9d/E+wH3Hn44JFMY3RddaMQXDe5YkDEqEAVHjA0ZFBbuWJAxvrPdb3PJVGERMS7QX6funhdiKhZkhvLfhBgbwGQsyAxFIGIDQ3Xnx7HvGorPMNwDCfetmuU4gbbjBNqOE2g7TqDtOIG2cwq0XR5LWK5AWAAAAABJRU5ErkJggg=='
    const availableWalletsForConnect: InternalConnector[] = [{
        id: id,
        name: name,
        icon: logo,
        extensionNotFound: false,
        providerName: name
    }]

    const provider: WalletProvider = {
        connectWallet,
        disconnectWallets,
        availableWalletsForConnect,
        connectedWallets: getWallet(),
        activeWallet: wallet,
        withdrawalSupportedNetworks: commonSupportedNetworks,
        autofillSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        name,
        id,
        switchAccount,
        ready: !!tonConnectUI
    }

    return provider
}