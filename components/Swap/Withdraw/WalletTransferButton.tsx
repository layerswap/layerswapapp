import { FC } from 'react';
import { SwapBasicData } from '@/lib/apiClients/layerSwapApiClient';
import { WalletTransferAction } from './Wallet';

type Props = {
    swapBasicData: SwapBasicData,
    swapId: string | undefined,
    refuel: boolean,
    warning?: JSX.Element | null,
    onWalletWithdrawalSuccess?: () => void,
    onCancelWithdrawal?: () => void,
}
const WalletTransferButton: FC<Props> = ({ swapBasicData: swapData, swapId, refuel, warning, onWalletWithdrawalSuccess, onCancelWithdrawal }) => {
    return <>
        <div className='space-y-2.5'>
            {warning}
            <WalletTransferAction swapData={swapData} swapId={swapId} refuel={refuel} onWalletWithdrawalSuccess={onWalletWithdrawalSuccess} onCancelWithdrawal={onCancelWithdrawal} />
        </div>
    </>
}

export default WalletTransferButton
