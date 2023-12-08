import CoinbaseIcon from "../../../components/icons/Wallets/Coinbase"
import GlowIcon from "../../../components/icons/Wallets/Glow"
import Phantom from "../../../components/icons/Wallets/Phantom"
import Solflare from "../../../components/icons/Wallets/Solflare"
import WalletConnectIcon from "../../../components/icons/Wallets/WalletConnect"

export const ResolveSolanaWalletIcon = ({ connector }: { connector: string }) => {
    switch (connector?.toLowerCase()) {
        case KnownKonnectors.Solflare:
            return Solflare
        case KnownKonnectors.Phantom:
            return Phantom
        case KnownKonnectors.WalletConnect:
            return WalletConnectIcon
        case KnownKonnectors.Coinbase:
            return CoinbaseIcon
        default:
            return () => <></>
    }
}

const KnownKonnectors = {
    Solflare: 'solflare',
    Phantom: 'phantom',
    WalletConnect: "walletConnect",
    Coinbase: "coinbase"
}