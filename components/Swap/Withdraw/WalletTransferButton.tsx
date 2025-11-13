import { FC } from 'react';
import { SwapBasicData } from '@/lib/apiClients/layerSwapApiClient';
import { WalletTransferAction } from './Wallet';

type Props = {
    swapBasicData: SwapBasicData,
    swapId: string | undefined,
    refuel: boolean,
    balanceWarning?: JSX.Element | null,
    onWalletWithdrawalSuccess?: () => void,
    onCancelWithdrawal?: () => void,
}
const WalletTransferButton: FC<Props> = ({ swapBasicData: swapData, swapId, refuel, balanceWarning, onWalletWithdrawalSuccess, onCancelWithdrawal }) => {
    return <>
        <div className='rounded-2xl bg-secondary-500 divide-y divide-secondary-300 p-3'>
            <div className='space-y-2.5'>
                {balanceWarning}
                <WalletTransferAction swapData={swapData} swapId={swapId} refuel={refuel} onWalletWithdrawalSuccess={onWalletWithdrawalSuccess} onCancelWithdrawal={onCancelWithdrawal} />
            </div>
        </div>
    </>
}

export default WalletTransferButton
