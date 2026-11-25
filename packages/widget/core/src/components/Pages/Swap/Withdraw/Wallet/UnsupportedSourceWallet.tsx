import { useState } from 'react';
import type { SwapBasicData } from '@/lib/apiClients/layerSwapApiClient';
import type { SelectAccountProps } from '@layerswap/wallet-core/types';
import { useSelectSwapAccount } from '@/context/swapAccounts';
import { useDepositSettings } from '@/context/depositSettings';
import { useLoginWallet } from '@layerswap/wallet-core';
import { SourceWalletDrawer } from '@/components/Wallet/WalletComponents/SourceWalletDrawer';
import { ButtonWrapper } from '../Presentation/WalletActionsView';
import WalletMessage from '../messages/Message';

type Props = {
    swapData: SwapBasicData;
    walletName: string;
};

export function UnsupportedSourceWallet({ swapData, walletName }: Props) {
    const [openModal, setOpenModal] = useState(false);
    const selectSourceAccount = useSelectSwapAccount('from');
    const { isDepositFlow } = useDepositSettings();
    const loginWallet = useLoginWallet();

    const selectWallet = (account: SelectAccountProps) => {
        selectSourceAccount({
            id: account.walletId,
            address: account.address,
            providerName: account.providerName,
        });
        setOpenModal(false);
    };

    return (
        <div className="flex flex-col gap-2 w-full">
            <WalletMessage
                status="error"
                header="Choose a compatible wallet"
                details={`${walletName} cannot send from ${swapData.source_network.display_name ?? swapData.source_network.name}. Choose a compatible source wallet or connect another one.`}
            />
            <ButtonWrapper onClick={() => setOpenModal(true)}>Choose source wallet</ButtonWrapper>
            <SourceWalletDrawer
                network={swapData.source_network}
                token={swapData.source_token}
                show={openModal}
                setShow={setOpenModal}
                onSelect={selectWallet}
                loginWallet={isDepositFlow ? loginWallet : undefined}
            />
        </div>
    );
}
