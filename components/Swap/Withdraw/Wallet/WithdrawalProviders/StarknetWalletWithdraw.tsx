import { FC, useCallback, useState } from 'react'
import { useAuthState } from '@/context/authContext';
import useWallet from '@/hooks/useWallet';
import WalletIcon from '@/components/icons/WalletIcon';
import { ConnectWalletButton, SendTransactionButton } from '../Common/buttons';
import TransactionMessages from '../../messages/TransactionMessages';
import { datadogRum } from '@datadog/browser-rum';
import { TransferProps, WithdrawPageProps } from '../Common/sharedTypes';

export const StarknetWalletWithdrawStep: FC<WithdrawPageProps> = ({ network, token, }) => {
    const [error, setError] = useState<string | undefined>()
    const [loading, setLoading] = useState(false)
    const [transferDone, setTransferDone] = useState<boolean>()
    const { provider } = useWallet(network, 'withdrawal')
    const { userId } = useAuthState()

    const wallet = provider?.activeWallet

    const handleTransfer = useCallback(async ({ callData, swapId }: TransferProps) => {
        if (!swapId || !token) {
            return
        }
        setLoading(true)
        try {
            if (!wallet) {
                throw Error("Starknet wallet not connected")
            }

            const { transaction_hash: transferTxHash } = (await wallet?.metadata?.starknetAccount?.execute(JSON.parse(callData || "")) || {});

            if (transferTxHash) {
                setTransferDone(true)
                return transferTxHash
            }
            else {
                setError('failedTransfer')
            }

        }
        catch (e) {
            setError(e.message)
        }
        finally {
            setLoading(false)
        }
    }, [wallet, network, userId, token])

    if (!wallet) {
        return <ConnectWalletButton />
    }

    return (
        <div className="w-full space-y-3 flex flex-col justify-between h-full text-secondary-text">
            <TransactionMessage isLoading={loading} error={error} />
            {
                !loading &&
                <SendTransactionButton
                    isDisabled={!!(loading || transferDone) || !wallet}
                    isSubmitting={!!(loading || transferDone)}
                    onClick={handleTransfer}
                    icon={
                        <WalletIcon
                            className="h-6 w-6 stroke-2"
                            aria-hidden="true"
                        />
                    }
                    error={!!error}
                />
            }
        </div >
    )
}

const TransactionMessage: FC<{ isLoading: boolean, error: string | undefined }> = ({ isLoading, error }) => {
    if (isLoading) {
        return <TransactionMessages.ConfirmTransactionMessage />
    }
    else if (error === "An error occurred (USER_REFUSED_OP)" || error === "Execute failed") {
        return <TransactionMessages.TransactionRejectedMessage />
    }
    else if (error === "failedTransfer") {
        return <TransactionMessages.TransactionFailedMessage />
    }
    else if (error) {
        const swapWithdrawalError = new Error(error);
        swapWithdrawalError.name = `SwapWithdrawalError`;
        swapWithdrawalError.cause = error;
        datadogRum.addError(swapWithdrawalError);

        return <TransactionMessages.UexpectedErrorMessage message={error} />
    }
    else return <></>
}