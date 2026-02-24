import { FC, useCallback } from 'react'
import { useSwapDataState, useSwapDataUpdate } from '@/context/swap';
import KnownInternalNames from '@/lib/knownIds';
import SwapSummary from '../Summary';
import { Widget } from '../../Widget/Index';
import { SwapQuoteDetails } from './SwapQuoteDetails';
import WalletTransferButton from './WalletTransferButton';
import { useBalance } from '@/lib/balances/useBalance';
import { useSettingsState } from '@/context/settings';
import { useSelectedAccount } from '@/context/swapAccounts';
import { ErrorDisplay } from '@/components/validationError/ErrorDisplay';
import { RefreshBalanceButton } from '@/components/validationError/RefreshBalanceButton';
import { AdjustAmountButton } from '@/components/validationError/AdjustAmountButton';
import { ICON_CLASSES_WARNING } from '@/components/validationError/constants';
import InfoIcon from '@/components/icons/InfoIcon';
import { Partner } from '@/Models/Partner';
import useOutOfGas from '@/lib/gases/useOutOfGas';
import { transformSwapDataToQuoteArgs, useQuoteData } from '@/hooks/useFee';
import { truncateDecimals } from '@/components/utils/RoundDecimals';
import { AnimatePresence, motion } from 'framer-motion';
import useSWRGas from '@/lib/gases/useSWRGas';
import { useFormikContext } from 'formik';
import { SwapFormValues } from '@/components/DTOs/SwapFormValues';
import { NetworkRoute } from '@/Models/Network';

const Withdraw: FC<{ type: 'widget' | 'contained', onWalletWithdrawalSuccess?: () => void, onCancelWithdrawal?: () => void, partner?: Partner }> = ({ type, onWalletWithdrawalSuccess, onCancelWithdrawal, partner }) => {
    const { swapBasicData, swapDetails, quote, refuel, quoteIsLoading, quoteError } = useSwapDataState()
    const { setSubmitedFormValues } = useSwapDataUpdate()

    const { networks } = useSettingsState()
    const source_network = swapBasicData?.source_network && networks.find(n => n.name === swapBasicData?.source_network?.name)
    const selectedSourceAccount = useSelectedAccount("from", source_network?.name);

    const { balances, mutate, isLoading } = useBalance(selectedSourceAccount?.address, source_network)
    const walletBalance = source_network && balances?.find(b => b?.network === source_network?.name && b?.token === swapBasicData?.source_token?.symbol)
    const walletBalanceAmount = walletBalance?.amount
    const { gasData } = useSWRGas(selectedSourceAccount?.address, source_network, swapBasicData?.source_token, swapBasicData?.requested_amount)
    const { setFieldValue } = useFormikContext<SwapFormValues>()

    const handleEditAmount = useCallback(() => {
        if (walletBalanceAmount == null || !gasData?.gas || !swapBasicData) return
        const maxAmount = walletBalanceAmount - gasData.gas
        if (maxAmount <= 0) return

        const newAmount = truncateDecimals(maxAmount, swapBasicData.source_token?.precision)
        setFieldValue('amount', newAmount, true)
        setSubmitedFormValues({
            amount: newAmount,
            from: swapBasicData.source_network as NetworkRoute,
            to: swapBasicData.destination_network as NetworkRoute,
            fromAsset: swapBasicData.source_token,
            toAsset: swapBasicData.destination_token,
            destination_address: swapBasicData.destination_address,
            refuel: !!refuel,
            depositMethod: swapBasicData.use_deposit_address ? 'deposit_address' : 'wallet',
        })
    }, [walletBalanceAmount, gasData?.gas, swapBasicData, refuel, setFieldValue, setSubmitedFormValues])

    let withdraw: {
        content?: JSX.Element | JSX.Element[],
        footer?: JSX.Element | JSX.Element[],
        footerKey?: string,
    } = {}

    const showInsufficientBalanceWarning = swapBasicData?.use_deposit_address === false
        && swapBasicData?.requested_amount
        && Number(swapBasicData?.requested_amount)
        && Number(walletBalanceAmount) < Number(swapBasicData?.requested_amount)

    const quoteArgs = transformSwapDataToQuoteArgs(swapBasicData, !!refuel);
    const { minAllowedAmount, maxAllowedAmount } = useQuoteData(quoteArgs);
    const { outOfGas } = useOutOfGas({
        address: selectedSourceAccount?.address,
        network: source_network,
        token: swapBasicData?.source_token,
        amount: swapBasicData?.requested_amount,
        balances,
        minAllowedAmount,
        maxAllowedAmount
    })

    if (swapBasicData?.use_deposit_address === false && showInsufficientBalanceWarning) {
        const balanceAmount = walletBalanceAmount !== undefined ? truncateDecimals(walletBalanceAmount, swapBasicData?.source_token?.precision) : undefined;
        const showSpinner = isLoading;
        withdraw = {
            footerKey: 'insufficient',
            footer: <ErrorDisplay
                icon={<InfoIcon className={ICON_CLASSES_WARNING} />}
                title={<>
                    <span>{"Insufficient balance"}</span>
                    {balanceAmount && swapBasicData?.source_token?.symbol && (
                        <span
                            className={`font-normal text-sm ${showSpinner ? 'animate-shine bg-[linear-gradient(90deg,var(--color-secondary-text)_40%,white_50%,var(--color-secondary-text)_60%)] bg-size-[200%_100%] bg-clip-text text-transparent' : 'text-secondary-text'}`}
                        > ({balanceAmount} {swapBasicData.source_token.symbol})</span>
                    )}
                </>}
                message="If you recently added funds, refresh the balance or check your connected wallet"
                footer={<RefreshBalanceButton onRefresh={mutate} isLoading={isLoading} />}
            />
        }
    } else if (swapBasicData?.use_deposit_address === false && outOfGas) {
        withdraw = {
            footerKey: 'outOfGas',
            footer: <WalletTransferButton
                swapBasicData={swapBasicData}
                swapId={swapDetails?.id}
                refuel={!!refuel}
                onWalletWithdrawalSuccess={onWalletWithdrawalSuccess}
                warning={<ErrorDisplay
                    icon={<InfoIcon className="w-5 h-5 text-secondary-text" />}
                    title="Insufficient balance for gas"
                    message="You need a small balance remaining to pay for gas."
                    action={<AdjustAmountButton onEditAmount={handleEditAmount} isLoading={quoteIsLoading} />}
                />}
                onCancelWithdrawal={onCancelWithdrawal}
            />
        }
    }
    else if (swapBasicData?.use_deposit_address === false) {
        withdraw = {
            footerKey: 'transfer',
            footer: <WalletTransferButton
                swapBasicData={swapBasicData}
                swapId={swapDetails?.id}
                refuel={!!refuel}
                onWalletWithdrawalSuccess={onWalletWithdrawalSuccess}
                onCancelWithdrawal={onCancelWithdrawal}
            />
        }
    }

    return (
        <>
            <Widget.Content>
                <div className="w-full flex flex-col justify-between  text-secondary-text">
                    <div className='grid grid-cols-1 gap-3 '>
                        <SwapSummary />
                        <SwapQuoteDetails swapBasicData={swapBasicData} quote={quote} refuel={refuel} quoteIsLoading={quoteIsLoading} quoteError={quoteError} partner={partner} />
                        {withdraw?.content}
                    </div>
                </div>
            </Widget.Content>
            {withdraw?.footer && (
                <Widget.Footer sticky={type == 'widget'}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={withdraw.footerKey}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {withdraw.footer}
                        </motion.div>
                    </AnimatePresence>
                </Widget.Footer>
            )}
        </>
    )
}


export default Withdraw