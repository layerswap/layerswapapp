import MetaMaskIcon from "../../../components/icons/Wallets/MetaMask"
import WalletConnectIcon from "../../../components/icons/Wallets/WalletConnect"
import BitKeep from "../../../components/icons/Wallets/BitKeep"
import RainbowIcon from "../../../components/icons/Wallets/Rainbow"
import CoinbaseIcon from "../../../components/icons/Wallets/Coinbase"
import { Coins } from "lucide-react"

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
        case KnownKonnectors.CoinbaseWallet:
            return CoinbaseIcon
        default:
            return CoinsIcon
    }
}

const KnownKonnectors = {
    MetaMask: 'metamask',
    WalletConnect: 'walletconnect',
    Rainbow: 'rainbow',
    BitKeep: 'bitkeep',
    CoinbaseWallet: 'coinbasewallet'
}

const CoinsIcon = (props) => {
    return <Coins {...props} strokeWidth={2} />
}