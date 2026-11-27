import type { ReactNode } from 'react';
import type { LoginWallet, Network, Token } from '@layerswap/widget-types';
import type { SelectAccountProps } from '@layerswap/wallet-core/types';
import { restrictToLoginAccount } from '@layerswap/wallet-core';
import useWallet from '@/hooks/useWallet';
import VaulDrawer from '@/components/Modal/vaulModal';
import WalletsList from '@/components/Wallet/WalletComponents/WalletsList';

type Props = {
    network: Network | undefined;
    token: Token | undefined;
    show: boolean;
    setShow: (show: boolean) => void;
    onSelect: (account: SelectAccountProps) => void;
    selectedDepositMethod?: 'wallet' | 'deposit_address';
    /** Bind the login wallet's family to its configured account. */
    loginWallet?: LoginWallet;
    snapClassName?: string;
    listClassName?: string;
    children?: ReactNode;
};

export function SourceWalletDrawer({ network, token, show, setShow, onSelect, selectedDepositMethod, loginWallet, snapClassName, listClassName, children }: Props) {
    const { provider } = useWallet(network, 'withdrawal');
    // Selecting another account switches the wallet's active account, which a
    // shared host connection would follow.
    const wallets = restrictToLoginAccount(provider?.connectedWallets?.filter(wallet => !wallet.isNotAvailable) ?? [], provider?.id, loginWallet);
    const isLoginFamily = !!loginWallet && provider?.id === loginWallet.providerId;

    return (
        <VaulDrawer show={show} setShow={setShow} header="Send from" modalId="connectedWallets">
            <VaulDrawer.Snap id="item-1" className={snapClassName}>
                <div className={listClassName}>
                    <WalletsList
                        provider={provider}
                        wallets={wallets}
                        onSelect={onSelect}
                        token={token}
                        network={network}
                        selectedDepositMethod={selectedDepositMethod}
                        selectable
                        hideConnect={isLoginFamily}
                    />
                </div>
                {children}
            </VaulDrawer.Snap>
        </VaulDrawer>
    );
}
