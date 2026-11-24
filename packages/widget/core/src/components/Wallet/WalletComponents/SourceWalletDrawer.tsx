import type { ReactNode } from 'react';
import type { Network, Token } from '@layerswap/widget-types';
import type { SelectAccountProps } from '@layerswap/wallet-core/types';
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
    snapClassName?: string;
    listClassName?: string;
    children?: ReactNode;
};

export function SourceWalletDrawer({ network, token, show, setShow, onSelect, selectedDepositMethod, snapClassName, listClassName, children }: Props) {
    const { provider } = useWallet(network, 'withdrawal');
    const wallets = provider?.connectedWallets?.filter(wallet => !wallet.isNotAvailable) ?? [];

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
                    />
                </div>
                {children}
            </VaulDrawer.Snap>
        </VaulDrawer>
    );
}
