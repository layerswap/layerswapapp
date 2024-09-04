import { ReactNode } from "react";
import useWallet from "../../../hooks/useWallet";
import { useWalletModalState } from "../../../stores/walletModalStateStore";

const ConnectButton = ({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) => {
    const { providers } = useWallet();
    const filteredProviders = providers.filter(p => !!p.autofillSupportedNetworks)
    const setWalletModalIsOpen = useWalletModalState((state) => state.setOpen)

    return (
        <button
            onClick={() => setWalletModalIsOpen(true)}
            type="button"
            aria-label="Connect wallet"
            disabled={filteredProviders.length == 0}
            className={`${className} disabled:opacity-50 disabled:cursor-not-allowed `}
        >
            {children}
        </button>
    )
};

export default ConnectButton;