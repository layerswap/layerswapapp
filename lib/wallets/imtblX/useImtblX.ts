import { useWalletStore } from "../../../stores/walletStore"
import ImtblClient from "../../imtbl"
import KnownInternalNames from "../../knownIds"
import IMX from "../../../components/icons/Wallets/IMX"
import { InternalConnector, Wallet, WalletProvider } from "../../../Models/WalletProvider"
import { useSettingsState } from "../../../context/settings"

const supportedNetworks = [
    KnownInternalNames.Networks.ImmutableXMainnet,
    KnownInternalNames.Networks.ImmutableXGoerli,
    KnownInternalNames.Networks.ImmutableXSepolia,
]

export default function useImtblX(): WalletProvider {


    const { networks } = useSettingsState()

    const name = 'ImmutableX'
    const id = 'imx'
    const wallets = useWalletStore((state) => state.connectedWallets)
    const addWallet = useWalletStore((state) => state.connectWallet)
    const removeWallet = useWalletStore((state) => state.disconnectWallet)
    const wallet = wallets.find(wallet => wallet.providerName === name)

    const getWallet = () => {
        if (wallet) {
            return [wallet]
        }
        return undefined
    }

    const connectWallet = async () => {
        const isMainnet = networks?.some(network => network.name === KnownInternalNames.Networks.ImmutableXMainnet)
        const chain = (isMainnet ? KnownInternalNames.Networks.ImmutableXMainnet : KnownInternalNames.Networks.ImmutableXGoerli)

        if (!chain) throw new Error('No chain id for imx connect wallet')
        const networkName = chain == 'testnet' ? KnownInternalNames.Networks.ImmutableXGoerli : KnownInternalNames.Networks.ImmutableXMainnet

        try {
            const imtblClient = new ImtblClient(networkName)
            const res = await imtblClient.ConnectWallet();

            const wallet: Wallet = {
                id: 'immutablex',
                displayName: name,
                address: res.address,
                providerName: name,
                icon: IMX,
                disconnect: () => disconnectWallet(),
                isActive: true,
                addresses: [res.address],
                withdrawalSupportedNetworks: supportedNetworks,
                asSourceSupportedNetworks: supportedNetworks,
                autofillSupportedNetworks: supportedNetworks,
            }

            addWallet(wallet);
            return wallet
        }
        catch (e) {
            console.log(e)
            throw new Error(e)
        }
    }

    const disconnectWallet = () => {
        return removeWallet(id)
    }

    const logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAMAAADVRocKAAAAOVBMVEUAAAAeHh7f39/Ly8v5+fkPDw9OTk7///8EBAT8/PyJiYmbm5tgYGDv7+9ycnIvLy89PT23t7erq6tpkv1uAAAACXBIWXMAAAsTAAALEwEAmpwYAAADCklEQVR4nO2Y2Y6kMAxFQwjYAQoI//+xI9vZoKhqthm1RrlPiMVOzPECShUVFRUVFRUV/TUha3v4ruzat9v+vZp+6fu+bxSqig6WQe0urunoYqcUqpmeWMajHkawYGGhww4sAOx7WOianWkdGsCCng7vYQRjDXRktgdjwJCVtVB1YIy1rULV1HTT67h9epj2MCpUuIC1oKu3W8Z4i3J0yK6Oi58BvzxroW429lu+oVOItEmwH8L4UWQWJDSVJg/L2v708ifDVjieZyRmdSXGthbkak2gDWDBQH/Wflhj3cRwcLjT/rz32bzt76iH1jKsGKOQ3uICBuCV4rd5Q0c9jGHzQhVxKB66DQFvjB310DEeHJoEax4xdHQ6Oj6vhU0NK1jZbwSUUDuXAN9hdfRGJrMC9GQCrFXpGAOhit/IADV6QFdwnRfmsM42psM4RUBPJ8DWQ2vIrMtXLBd8zO5YF0PDGlaKOR3vlqhrHrpVWbMUf6mGPpfve+gjLOiA2wSfu5UAaxcu4t7UCdC9NnRRTZ1gdaGC3kyAj7VbCaBXOsBnoc8BJ/Yn/UACbD04hpWDIgFbnh2zmjp1BBdz+zEhk0qAyuFDCZDZH8Mkxmnngaqmx+wPbD8CCjwCYf2qHrI/M5VZi+cK3cMTlUj5ih0aMjegF7mqqJs+glKjs5GCHQCVCDr9SLKhDJGcAdTvU7S4Fd3qZ6yeJwtaKaYJyY9j5OFeQUI/uQigXKelOzxUUgOgvsXLammUyZvCxakrb8jaAyr4+KoRnN1om2GkeKWhhVGi2u2TTeoeF9krEkvQrmdc5gdCudBgaSK4pCwWGFq8yobTAOvl3hPfpvIzaOBlA6u9BOuKx27zERbKd4L15BfgZpHDzgwqc3fIjNMTTPi80VVkddOC/Qv68qF7ElCHe4h9+dD9rhx1vfv0G6ynPgTp14CvlOhoHN1pwcKPSZWVW/ZB+1KhGdDlY0HbVtY42f+sqmWRzWZoh3aY9+9DutYO3PtnfkT91l9q6uB9v+efWlFRUVFRUdH/pz+L+y4G9IRLzwAAAABJRU5ErkJggg=='
    const availableWalletsForConnect: InternalConnector[] = [{
        id: id,
        name: name,
        icon: logo,
        extensionNotFound: false,
        providerName: name
    }]

    const provider: WalletProvider = {
        connectedWallets: getWallet(),
        activeWallet: wallet,
        connectWallet,
        disconnectWallets: disconnectWallet,
        withdrawalSupportedNetworks: supportedNetworks,
        asSourceSupportedNetworks: supportedNetworks,
        autofillSupportedNetworks: supportedNetworks,
        name,
        id,
        hideFromList: true,
        availableWalletsForConnect,
        ready: true
    }

    return provider
}