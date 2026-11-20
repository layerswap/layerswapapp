import { WalletTransferView } from './Presentation/Page2Sections';
import { FC } from 'react';
import type { JSX } from 'react';
import { SwapBasicData } from '@/lib/apiClients/layerSwapApiClient';
import { WalletTransferAction } from './Wallet';

type Props = {
    swapBasicData: SwapBasicData;
    swapId: string | undefined;
    refuel: boolean;
    warning?: JSX.Element | null;
    onWalletWithdrawalSuccess?: () => void;
    onCancelWithdrawal?: () => void;
    showProgress?: boolean;
};
const WalletTransferButton: FC<Props> = ({
    swapBasicData: swapData,
    swapId,
    refuel,
    warning,
    onWalletWithdrawalSuccess,
    onCancelWithdrawal,
    showProgress,
}) => {
    return (
        <>
            <WalletTransferView warning={warning}>
                <WalletTransferAction
                    swapData={swapData}
                    swapId={swapId}
                    refuel={refuel}
                    onWalletWithdrawalSuccess={onWalletWithdrawalSuccess}
                    onCancelWithdrawal={onCancelWithdrawal}
                    showProgress={showProgress}
                />
            </WalletTransferView>
        </>
    );
};

export default WalletTransferButton;
