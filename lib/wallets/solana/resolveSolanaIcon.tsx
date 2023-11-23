import Phantom from "../../../components/icons/Wallets/Phantom"
import Solflare from "../../../components/icons/Wallets/Solflare"
import Torus from "../../../components/icons/Wallets/Torus"

export const ResolveSolanaWalletIcon = ({ connector }: { connector: string }) => {
    switch (connector?.toLowerCase()) {
        case KnownKonnectors.Torus:
            return Torus
        case KnownKonnectors.Solflare:
            return Solflare
        case KnownKonnectors.Phantom:
            return Phantom
        default:
            return () => <></>
    }
}


const KnownKonnectors = {
    Torus: 'torus',
    Solflare: 'solflare',
    Phantom: 'phantom',
}