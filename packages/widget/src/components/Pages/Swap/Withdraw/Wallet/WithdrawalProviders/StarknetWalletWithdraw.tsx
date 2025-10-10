import { FC, useCallback, useState } from 'react'
import WalletIcon from '@/components/Icons/WalletIcon';
import { ConnectWalletButton, SendTransactionButton } from '../Common/buttons';
import TransactionMessages from '../../messages/TransactionMessages';
import { WithdrawPageProps } from '../Common/sharedTypes';
import { TransferProps } from '@/types';
import { useSelectedAccount } from '@/context/balanceAccounts';
import useWallet from '@/hooks/useWallet';

export const StarknetWalletWithdrawStep: FC<WithdrawPageProps> = ({ swapBasicData, refuel }) => {
    const [error, setError] = useState<string | undefined>()
    const [loading, setLoading] = useState(false)
    const [transferDone, setTransferDone] = useState<boolean>()
    const { source_network, source_token } = swapBasicData
    const selectedSourceAccount = useSelectedAccount("from", source_network?.name);
    const { wallets } = useWallet(source_network, 'withdrawal')
    const wallet = wallets.find(w => w.id === selectedSourceAccount?.id)

    const handleTransfer = useCallback(async ({ callData, swapId }: TransferProps) => {
        if (!swapId || !source_token) {
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
            setLoading(false)
            setError(e.message)
            throw e
        }
    }, [wallet, source_network, source_token])

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
                    refuel={refuel}
                    swapData={swapBasicData}
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
        return <TransactionMessages.UexpectedErrorMessage message={error} />
    }
    else return <></>
}