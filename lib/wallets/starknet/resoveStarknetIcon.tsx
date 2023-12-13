import { Coins } from "lucide-react"
import Argent from "../../../components/icons/Wallets/Argent"
import ArgentX from "../../../components/icons/Wallets/ArgentX"
import Braavos from "../../../components/icons/Wallets/Braavos"

export const ResolveStarknetWalletIcon = ({ connector }: { connector: string }) => {
    switch (connector?.toLowerCase()) {
        case KnownKonnectors.ArgentX:
            return ArgentX
        case KnownKonnectors.ArgentMobile:
            return Argent
        case KnownKonnectors.Braavos:
            return Braavos
        default:
            return CoinsIcon
    }
}


const KnownKonnectors = {
    ArgentX: 'argent x',
    ArgentMobile: 'argent mobile',
    Braavos: 'braavos',
}

const CoinsIcon = (props) => {
    return <Coins {...props} strokeWidth={2} />
}