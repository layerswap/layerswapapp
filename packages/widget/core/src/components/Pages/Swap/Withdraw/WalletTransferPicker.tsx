import useWallet from '@/hooks/useWallet';
import { useSelectSwapAccount } from '@/context/swapAccounts';
import VaulDrawer from '@/components/Modal/vaulModal';
import WalletsList from '@/components/Wallet/WalletComponents/WalletsList';
import type { SelectAccountProps } from '@layerswap/wallet-core/types';
import type { SwapBasicData } from '@/lib/apiClients/layerSwapApiClient';

type Props = {
    swapData: SwapBasicData;
    openModal: boolean;
    setOpenModal: (show: boolean) => void;
};

/** Shared by the source account row and unsupported-wallet recovery. */
export function WalletTransferPicker({ swapData, openModal, setOpenModal }: Props) {
    const { source_network, source_token } = swapData;
    const { provider } = useWallet(source_network, 'withdrawal');
    const selectSourceAccount = useSelectSwapAccount('from');
    const availableWallets = provider?.connectedWallets?.filter(wallet => !wallet.isNotAvailable) ?? [];

    const changeWallet = (account: SelectAccountProps) => {
        selectSourceAccount({
            id: account.walletId,
            address: account.address,
            providerName: account.providerName,
        });
        setOpenModal(false);
    };

    if (!provider) return null;

    return (
        <VaulDrawer show={openModal} setShow={setOpenModal} header="Send from" modalId="connectedWallets">
            <VaulDrawer.Snap id="item-1">
                <WalletsList
                    network={source_network}
                    token={source_token}
                    provider={provider}
                    wallets={availableWallets}
                    onSelect={changeWallet}
                    selectable
                />
            </VaulDrawer.Snap>
        </VaulDrawer>
    );
}
