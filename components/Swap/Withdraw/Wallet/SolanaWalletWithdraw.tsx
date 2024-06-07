import { FC, useCallback, useState } from 'react'
import SubmitButton from '../../../buttons/submitButton';
import toast from 'react-hot-toast';
import { BackendTransactionStatus } from '../../../../lib/layerSwapApiClient';
import { Transaction, Connection } from '@solana/web3.js';
import useWallet from '../../../../hooks/useWallet';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { SignerWalletAdapterProps } from '@solana/wallet-adapter-base';
import { useSwapTransactionStore } from '../../../../stores/swapTransactionStore';
import WalletIcon from '../../../icons/WalletIcon';
import { WithdrawPageProps } from './WalletTransferContent';
import ManualTransferNote from './WalletTransfer/manualTransferNote';

const SolanaWalletWithdrawStep: FC<WithdrawPageProps> = ({ network, swapId, callData }) => {
    const [loading, setLoading] = useState(false);
    const { getWithdrawalProvider } = useWallet()
    const { setSwapTransaction } = useSwapTransactionStore();

    const provider = getWithdrawalProvider(network!);
    const wallet = provider?.getConnectedWallet();
    const { publicKey: walletPublicKey, signTransaction } = useSolanaWallet();
    const solanaNode = network?.node_url

    const handleConnect = useCallback(async () => {
        setLoading(true)
        try {
            await provider?.connectWallet()
        }
        catch (e) {
            toast(e.message)
        }
        finally {
            setLoading(false)
        }
    }, [provider])

    const handleTransfer = useCallback(async () => {

        if (!signTransaction || !callData || !swapId) return

        setLoading(true)
        try {
            const connection = new Connection(
                `${solanaNode}`,
                "confirmed"
            );

            const arrayBufferCallData = Uint8Array.from(atob(callData), c => c.charCodeAt(0))

            const transaction = Transaction.from(arrayBufferCallData)
            const signature = await configureAndSendCurrentTransaction(
                transaction,
                connection,
                signTransaction
            );

            if (signature) {
                setSwapTransaction(swapId, BackendTransactionStatus.Pending, signature);
            }

        }
        catch (e) {
            if (e?.message) {
                toast(e.message)
                return
            }
        }
        finally {
            setLoading(false)
        }
    }, [swapId, callData, walletPublicKey, signTransaction])

    return (
        <>
            <div className="w-full space-y-5 flex flex-col justify-between h-full text-primary-text">
                <div className='space-y-4'>
                    {
                        !wallet &&
                        <SubmitButton isDisabled={loading} isSubmitting={loading} onClick={handleConnect} icon={<WalletIcon className="stroke-2 w-6 h-6" aria-hidden="true" />} >
                            Connect a wallet
                        </SubmitButton>
                    }
                    {
                        wallet &&
                        <SubmitButton isDisabled={!!loading} isSubmitting={!!loading} onClick={handleTransfer} icon={<WalletIcon className="stroke-2 w-6 h-6" aria-hidden="true" />} >
                            Send from wallet
                        </SubmitButton>
                    }
                    {
                        network?.deposit_methods.some(m => m === 'deposit_address') &&
                        <ManualTransferNote />
                    }
                </div>
            </div>
        </>
    )
}

export default SolanaWalletWithdrawStep;

export const configureAndSendCurrentTransaction = async (
    transaction: Transaction,
    connection: Connection,
    signTransaction: SignerWalletAdapterProps['signTransaction']
) => {
    const signed = await signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());

    return signature;
};