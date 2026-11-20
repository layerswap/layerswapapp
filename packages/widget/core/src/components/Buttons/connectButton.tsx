import { ConnectButtonView } from '../Widget/WidgetNavigationView';
import { ReactNode } from "react";
import useWallet from "../../hooks/useWallet";
import { useConnectModal } from "../Wallet/WalletModal";

const ConnectButton = ({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) => {
    const { providers } = useWallet();
    const filteredProviders = providers.filter(p => !!p.autofillSupportedNetworks)
    const { connect } = useConnectModal()

    return (
        <ConnectButtonView onClick={async () => { await connect() }} disabled={filteredProviders.length == 0} className={className}>{children}</ConnectButtonView>
    )
};

export default ConnectButton;