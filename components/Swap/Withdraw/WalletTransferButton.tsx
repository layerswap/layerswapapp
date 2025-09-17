import SwitchIcon from '@/components/icons/SwitchIcon';
import WalletTransferContent from './WalletTransferContent';
import { FC, useState } from 'react';
import { SwapBasicData } from '@/lib/apiClients/layerSwapApiClient';
import { WalletTransferAction } from './Wallet';

type Props = {
    swapBasicData: SwapBasicData,
    swapId: string | undefined,
    refuel: boolean,
    balanceWarning?: JSX.Element | null,
    onWalletWithdrawalSuccess?: () => void,
}
const WalletTransferButton: FC<Props> = ({ swapBasicData: swapData, swapId, refuel, balanceWarning, onWalletWithdrawalSuccess }) => {
    const [openModal, setOpenModal] = useState(false);

    return <>
        <div className='rounded-2xl bg-secondary-500 divide-y divide-secondary-300 p-3'>
            <div className="flex justify-between pb-3">
                <p className="text-base  text-secondary-text font-normal">
                    Sending from wallet
                </p>
                <button
                    type='button'
                    onClick={() => setOpenModal(true)}
                    className='inline-flex items-center gap-1 px-2 bg-secondary-300 hover:bg-secondary-400 rounded-lg text-xs active:animate-press-down'>
                    <SwitchIcon />
                    <p>Switch</p>
                </button>
            </div>
            <div>
                <WalletTransferContent openModal={openModal} setOpenModal={setOpenModal} swapData={swapData} />
                {balanceWarning}
                <WalletTransferAction swapData={swapData} swapId={swapId} refuel={refuel} onWalletWithdrawalSuccess={onWalletWithdrawalSuccess} />
            </div>
        </div>
    </>
}

export default WalletTransferButton
