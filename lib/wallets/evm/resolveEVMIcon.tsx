import MetaMaskIcon from "../../../components/icons/Wallets/MetaMask"
import WalletConnectIcon from "../../../components/icons/Wallets/WalletConnect"
import BitKeep from "../../../components/icons/Wallets/BitKeep"
import RainbowIcon from "../../../components/icons/Wallets/Rainbow"

export const ResolveEVMWalletIcon = ({ connector }: { connector: string }) => {
    switch (connector?.toLowerCase()) {
        case KnownKonnectors.MetaMask:
            return MetaMaskIcon
        case KnownKonnectors.WalletConnect:
            return WalletConnectIcon
        case KnownKonnectors.Rainbow:
            return RainbowIcon
        case KnownKonnectors.BitKeep:
            return BitKeep
        default:
            return () => <></>
    }
}

ResolveEVMWalletIcon.displayName = 'EVMIcon'

const KnownKonnectors = {
    MetaMask: 'metamask',
    WalletConnect: 'walletconnect',
    Rainbow: 'rainbow',
    BitKeep: 'bitkeep',
}