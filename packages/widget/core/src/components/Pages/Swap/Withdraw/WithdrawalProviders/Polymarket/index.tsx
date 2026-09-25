import { Address } from '@/lib/address/Address';
import { FC } from 'react';
import { SpecializedWithdrawalView } from '../../Presentation/SpecializedWithdrawalView';
import { ConnectWalletButton } from '../../Wallet/Common/buttons';
import { WithdrawPageProps } from '../../Wallet/Common/sharedTypes';
import { usePolymarketWithdrawal } from './usePolymarketWithdrawal';

export const PolymarketWalletWithdraw: FC<WithdrawPageProps> = (props) => {
    const { source_network } = props.swapBasicData;
    const {
        handleWithdraw,
        loading,
        progress,
        error,
        rejected,
        isConnected,
        wallet,
        activeAddress,
        sourceAddress,
    } = usePolymarketWithdrawal(props);

    return (
        <SpecializedWithdrawalView
            provider="Polymarket"
            network={source_network}
            isConnected={isConnected && !!wallet}
            accountMismatch={
                !!(
                    sourceAddress &&
                    activeAddress &&
                    !Address.equals(
                        activeAddress,
                        sourceAddress,
                        source_network,
                    )
                )
            }
            sourceAddress={sourceAddress}
            loading={loading}
            progress={progress}
            error={error}
            rejected={rejected}
            connectButton={<ConnectWalletButton />}
            handleWithdraw={handleWithdraw}
        />
    );
};
