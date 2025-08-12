import SwitchIcon from '@/components/icons/SwitchIcon';
import WalletTransfer from './Wallet';
import WalletTransferContent from './WalletTransferContent';
import { FC, useState } from 'react';
import ManualTransferNote from './Wallet/Common/manualTransferNote';
import { SwapBasicData } from '@/lib/apiClients/layerSwapApiClient';

type Props = {
    swapBasicData: SwapBasicData,
    swapId: string | undefined,
    refuel: boolean,
    warning?: JSX.Element | null
}
const WalletTransferButton: FC<Props> = ({ swapBasicData: swapData, swapId, refuel, warning }) => {
    const [openModal, setOpenModal] = useState(false);

    return <>
        <div className='rounded-xl bg-secondary-500 divide-y divide-secondary-300 px-3'>
            <div className="py-3 flex justify-between">
                <p className="text-base  text-secondary-text font-normal">
                    Sending from wallet
                </p>
                <button
                    type='button'
                    onClick={() => setOpenModal(true)}
                    className='inline-flex items-center gap-1 px-2 bg-secondary-300 hover:bg-secondary-400 rounded-lg text-xs'>
                    <SwitchIcon />
                    <p>Switch</p>
                </button>
            </div>
            <div>
                <WalletTransferContent openModal={openModal} setOpenModal={setOpenModal} swapData={swapData}/>
                {warning && warning}
                <WalletTransfer swapData={swapData} swapId={swapId} refuel={refuel} />
            </div>
        </div>
        <div className="flex justify-center">
            <ManualTransferNote />
        </div>
    </>
}

export default WalletTransferButton
