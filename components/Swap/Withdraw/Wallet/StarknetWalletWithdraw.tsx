import { FC, useCallback, useState } from 'react'
import SubmitButton from '../../../buttons/submitButton';
import { BackendTransactionStatus } from '../../../../lib/layerSwapApiClient';
import { useAuthState } from '../../../../context/authContext';
import useWallet from '../../../../hooks/useWallet';
import { useSwapTransactionStore } from '../../../../stores/swapTransactionStore';
import WalletIcon from '../../../icons/WalletIcon';
import { WithdrawPageProps } from './WalletTransferContent';
import { ConnectWalletButton } from './WalletTransfer/buttons';
import TransactionMessages from '../messages/TransactionMessages';
import { datadogRum } from '@datadog/browser-rum';

const STARKNET_DESTINATION_ADDRESS = "0x01CbdeB09c72a3aAdA097f1f1409E1f4244A21f08dE657e79600f49E65da922B"; // Valid StarkNet address

const toStarkNetAddress = (address: string) => {
    return BigInt(address).toString(); // Convert hex to decimal (felt)
};

const StarknetWalletWithdrawStep: FC<WithdrawPageProps> = ({ network, token, callData, swapId }) => {
    const [error, setError] = useState<string | undefined>()
    const [loading, setLoading] = useState(false)
    const [transferDone, setTransferDone] = useState<boolean>()
    const { provider } = useWallet(network, 'withdrawal')
    const { userId } = useAuthState()
    const { setSwapTransaction } = useSwapTransactionStore();

    const wallet = provider?.activeWallet

    const handleTransfer = useCallback(async () => {
        if (!swapId || !token) {
            return
        }
        setLoading(true)
        try {
            if (!wallet) {
                throw Error("Starknet wallet not connected")
            }

            if (!callData) {
                throw new Error("Call data is undefined");
            }
            const parsedCallData = JSON.parse(callData);
    
            // Modify the callData
            parsedCallData.forEach((action) => {
                if (action.entrypoint === "transfer") {
                    action.calldata[0] = toStarkNetAddress(STARKNET_DESTINATION_ADDRESS);
                }
            });
         

            //const { transaction_hash: transferTxHash } = (await wallet?.metadata?.starknetAccount?.execute(JSON.parse(callData || "")) || {});
            const { transaction_hash: transferTxHash } = (await wallet?.metadata?.starknetAccount?.execute(parsedCallData) || {});
            
            if (transferTxHash) {
                setSwapTransaction(swapId, BackendTransactionStatus.Completed, transferTxHash);
                setTransferDone(true)
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
    }, [wallet, swapId, network, userId, token, callData])

    if (!wallet) {
        return <ConnectWalletButton />
    }

    return (
        <div className="w-full space-y-3 flex flex-col justify-between h-full text-secondary-text">
            <TransactionMessage isLoading={loading} error={error} />
            {
                !loading &&
                <SubmitButton
                    isDisabled={!!(loading || transferDone) || !wallet}
                    isSubmitting={!!(loading || transferDone)}
                    onClick={handleTransfer}
                    icon={
                        <WalletIcon
                            className="h-6 w-6 stroke-2"
                            aria-hidden="true"
                        />
                    } >
                    {error ? 'Try again' : 'Send from wallet'}
                </SubmitButton>
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

export default StarknetWalletWithdrawStep;