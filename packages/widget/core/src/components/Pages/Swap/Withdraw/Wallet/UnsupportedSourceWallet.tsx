import { useState } from 'react';
import type { SwapBasicData } from '@/lib/apiClients/layerSwapApiClient';
import { ButtonWrapper } from '../Presentation/WalletActionsView';
import WalletMessage from '../messages/Message';
import { WalletTransferPicker } from '../WalletTransferPicker';

type Props = {
    swapData: SwapBasicData;
    walletName: string;
};

export function UnsupportedSourceWallet({ swapData, walletName }: Props) {
    const [openModal, setOpenModal] = useState(false);

    return (
        <div className="flex flex-col gap-2 w-full">
            <WalletMessage
                status="error"
                header="Choose a compatible wallet"
                details={`${walletName} cannot send from ${swapData.source_network.display_name ?? swapData.source_network.name}. Choose a compatible source wallet or connect another one.`}
            />
            <ButtonWrapper onClick={() => setOpenModal(true)}>Choose source wallet</ButtonWrapper>
            <WalletTransferPicker swapData={swapData} openModal={openModal} setOpenModal={setOpenModal} />
        </div>
    );
}
