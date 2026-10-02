'use client'
import { ReactNode } from "react";
import { useWallet } from "@layerswap/wallet-core";
import { useWalletListAdapters } from "@/lib/adapters";

const ConnectButton = ({
    children,
    className,
    disabled,
}: {
    children: ReactNode;
    className?: string;
    disabled?: boolean;
}) => {
    const adapters = useWalletListAdapters()
    const { providers } = useWallet(adapters.networks, undefined, undefined, { getNetworkId: adapters.getNetworkId })
    const filteredProviders = providers.filter(p => !!p.autofillSupportedNetworks)

    return (
        <button
            onClick={async () => { await adapters.connect() }}
            data-attr="connect-wallet"
            type="button"
            aria-label="Connect wallet"
            disabled={disabled ?? filteredProviders.length == 0}
            className={`${className} disabled:opacity-50 disabled:cursor-not-allowed enabled:active:animate-press-down`}
        >
            {children}
        </button>
    )
};

export default ConnectButton;
