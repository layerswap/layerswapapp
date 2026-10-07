import { truncateDecimals } from '@/components/utils/RoundDecimals';
import { Widget } from '@/components/Widget/Index';
import { useSettingsState } from '@/context/settings';
import { useSwapDataState, useSwapDataUpdate } from '@/context/swap';
import { useSelectedAccount } from '@/context/swapAccounts';
import { isDepositAddressSwap } from '@/helpers/swapFlow';
import { transformSwapDataToQuoteArgs, useQuoteData } from '@/hooks/useFee';
import { useBalance } from '@/lib/balances/useBalance';
import useOutOfGas from '@/lib/gases/useOutOfGas';
import useSWRGas from '@/lib/gases/useSWRGas';
import { NetworkRoute } from '@layerswap/widget-types';
import { useFormikContext } from 'formik';
import type { JSX } from 'react';
import { FC, useCallback, useMemo } from 'react';
import { AdjustAmountButton } from '../Form/SecondaryComponents/validationError/AdjustAmountButton';
import { RefreshBalanceButton } from '../Form/SecondaryComponents/validationError/RefreshBalanceButton';
import { SwapFormValues } from '../Form/SwapFormValues';
import {
    BalanceWarningView,
    GasWarningView,
} from './Presentation/BalanceWarningView';
import WalletTransferButton from './WalletTransferButton';
import { WalletActionTransition } from './Presentation/WalletActionTransition';
import { lifecycleContextFromSwap } from '@/lib/swapLifecycle';
import { useTransferBlocked } from '@/hooks/useTransferBlocked';
import { type ObservedLifecycleEvent, useLifecycleObservation } from '@/hooks/useLifecycleObservation';

// "Transfer screen shown": reported once while the screen is visible, before any swap exists.
const AWAITING_WALLET_ACTION: ObservedLifecycleEvent = {
    step: 'awaiting_wallet_action',
    stage: 'wallet_action',
    outcome: 'pending',
    path: 'Withdraw',
    action: 'send_from_wallet',
}

const Withdraw: FC<{
    type: 'widget' | 'contained';
    onWalletWithdrawalSuccess?: () => void;
    onCancelWithdrawal?: () => void;
}> = ({ type, onWalletWithdrawalSuccess, onCancelWithdrawal }) => {
    const { swapBasicData, swapDetails, refuel, quoteIsLoading } =
        useSwapDataState();
    const { setSubmitedFormValues, startFreshSwapAttempt } = useSwapDataUpdate();

    const { networks } = useSettingsState();
    const source_network =
        swapBasicData?.source_network &&
        networks.find((n) => n.name === swapBasicData?.source_network?.name);
    const selectedSourceAccount = useSelectedAccount(
        'from',
        source_network?.name,
    );

    const { balances, mutate, isLoading } = useBalance(
        selectedSourceAccount?.address,
        source_network,
    );
    const walletBalance =
        source_network &&
        balances?.find(
            (b) =>
                b?.network === source_network?.name &&
                b?.token === swapBasicData?.source_token?.symbol,
        );
    const walletBalanceAmount = walletBalance?.amount;
    const { gasData } = useSWRGas(
        selectedSourceAccount?.address,
        source_network,
        swapBasicData?.source_token,
        swapBasicData?.requested_amount,
    );
    const { setFieldValue } = useFormikContext<SwapFormValues>();

    const lifecycleContext = useMemo(
        () => swapBasicData ? lifecycleContextFromSwap(swapBasicData, swapDetails) : undefined,
        [
            swapBasicData?.destination_address,
            swapBasicData?.destination_network?.name,
            swapBasicData?.destination_token?.symbol,
            swapBasicData?.requested_amount,
            swapBasicData?.source_network?.name,
            swapBasicData?.source_token?.symbol,
            swapBasicData?.use_deposit_address,
            swapDetails?.id,
            swapDetails?.source_address,
        ],
    )

    // The swap id and source address arrive after creation; they enrich the report but never repeat it.
    useLifecycleObservation(swapBasicData && !swapBasicData.use_deposit_address ? AWAITING_WALLET_ACTION : undefined, lifecycleContext)

    const handleEditAmount = useCallback(() => {
        if (walletBalanceAmount == null || !gasData?.gas || !swapBasicData)
            return;
        const maxAmount = walletBalanceAmount - gasData.gas * 1.02;
        if (maxAmount <= 0) return;

        const newAmount = truncateDecimals(
            maxAmount,
            swapBasicData.source_token?.precision,
        );
        startFreshSwapAttempt();
        setFieldValue('amount', newAmount, true);
        setSubmitedFormValues({
            amount: newAmount,
            from: swapBasicData.source_network as NetworkRoute,
            to: swapBasicData.destination_network as NetworkRoute,
            fromAsset: swapBasicData.source_token,
            toAsset: swapBasicData.destination_token,
            destination_address: swapBasicData.destination_address,
            refuel: !!refuel,
            depositMethod: swapBasicData.use_deposit_address
                ? 'deposit_address'
                : 'wallet',
        });
    }, [
        walletBalanceAmount,
        gasData?.gas,
        swapBasicData,
        refuel,
        setFieldValue,
        setSubmitedFormValues,
        startFreshSwapAttempt,
    ]);

    let withdraw: {
        footer?: JSX.Element | JSX.Element[];
        footerKey?: string;
    } = {};

    const showInsufficientBalanceWarning =
        swapBasicData?.use_deposit_address === false &&
        swapBasicData?.requested_amount &&
        Number(swapBasicData?.requested_amount) &&
        Number(walletBalanceAmount) < Number(swapBasicData?.requested_amount);

    const quoteArgs = transformSwapDataToQuoteArgs(swapBasicData, !!refuel);
    // Limits feed useOutOfGas, which only matters for wallet withdrawals — skip them in deposit address flow
    const { minAllowedAmount, maxAllowedAmount } = useQuoteData(quoteArgs, {
        skipLimits: isDepositAddressSwap(swapBasicData),
    });
    const { outOfGas } = useOutOfGas({
        address: selectedSourceAccount?.address,
        network: source_network,
        token: swapBasicData?.source_token,
        amount: swapBasicData?.requested_amount,
        balances,
        minAllowedAmount,
        maxAllowedAmount,
    });

    useTransferBlocked(
        swapBasicData?.use_deposit_address === false && showInsufficientBalanceWarning ? 'insufficient_balance'
        : swapBasicData?.use_deposit_address === false && outOfGas ? 'insufficient_gas'
        : undefined,
        lifecycleContext, 'Withdraw')

    if (
        swapBasicData?.use_deposit_address === false &&
        showInsufficientBalanceWarning
    ) {
        const balanceAmount =
            walletBalanceAmount !== undefined
                ? truncateDecimals(
                      walletBalanceAmount,
                      swapBasicData?.source_token?.precision,
                  )
                : undefined;
        const showSpinner = isLoading;
        withdraw = {
            footerKey: 'insufficient',
            footer: (
                <BalanceWarningView
                    amount={balanceAmount}
                    asset={swapBasicData?.source_token?.asset}
                    refreshing={showSpinner}
                    refreshButton={
                        <RefreshBalanceButton
                            onRefresh={mutate}
                            isLoading={isLoading}
                        />
                    }
                />
            ),
        };
    } else if (swapBasicData?.use_deposit_address === false && outOfGas) {
        withdraw = {
            footerKey: 'outOfGas',
            footer: (
                <WalletTransferButton
                    swapBasicData={swapBasicData}
                    swapId={swapDetails?.id}
                    refuel={!!refuel}
                    onWalletWithdrawalSuccess={onWalletWithdrawalSuccess}
                    warning={
                        <GasWarningView
                            adjustButton={
                                <AdjustAmountButton
                                    onEditAmount={handleEditAmount}
                                    isLoading={quoteIsLoading}
                                />
                            }
                        />
                    }
                    onCancelWithdrawal={onCancelWithdrawal}
                />
            ),
        };
    } else if (swapBasicData?.use_deposit_address === false) {
        withdraw = {
            footerKey: 'transfer',
            footer: (
                <WalletTransferButton
                    swapBasicData={swapBasicData}
                    swapId={swapDetails?.id}
                    refuel={!!refuel}
                    onWalletWithdrawalSuccess={onWalletWithdrawalSuccess}
                    onCancelWithdrawal={onCancelWithdrawal}
                />
            ),
        };
    }

    return (
        <>
            {withdraw?.footer && (
                <Widget.Footer sticky={type == 'widget'}>
                    <WalletActionTransition actionKey={withdraw.footerKey}>
                        {withdraw.footer}
                    </WalletActionTransition>
                </Widget.Footer>
            )}
        </>
    );
};

export default Withdraw;
