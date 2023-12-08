import { Link, ArrowLeftRight } from 'lucide-react';
import { FC, useCallback, useState } from 'react'
import SubmitButton from '../../../buttons/submitButton';
import toast from 'react-hot-toast';
import { useSwapTransactionStore } from '../../../store/zustandStore';
import { PublishedSwapTransactionStatus } from '../../../../lib/layerSwapApiClient';
import { useSwapDataState } from '../../../../context/swap';
import { useSettingsState } from '../../../../context/settings';
import { Transaction, Connection, PublicKey, TransactionInstruction, TransactionResponse } from '@solana/web3.js';
import useWallet from '../../../../hooks/useWallet';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import { SignerWalletAdapterProps } from '@solana/wallet-adapter-base';

type Props = {
    depositAddress: string,
    amount: number
}

const SolanaWalletWithdrawStep: FC<Props> = ({ depositAddress, amount }) => {
    const [loading, setLoading] = useState(false);
    const [transferDone, setTransferDone] = useState<boolean>();
    const { getWithdrawalProvider } = useWallet()

    const { setSwapTransaction } = useSwapTransactionStore();
    const { swap } = useSwapDataState();

    const { networks, layers } = useSettingsState();
    const { source_network: source_network_internal_name } = swap || {};
    const source_network = networks.find(n => n.internal_name === source_network_internal_name);
    const source_layer = layers.find(l => l.internal_name === source_network_internal_name)
    const source_currency = source_network?.currencies?.find(c => c.asset.toLocaleUpperCase() === swap?.source_network_asset.toLocaleUpperCase());

    const provider = getWithdrawalProvider(source_layer!);
    const wallet = provider?.getConnectedWallet();
    const { publicKey: walletPublicKey, signTransaction } = useSolanaWallet();
    const solanaNode = source_network?.nodes[0].url;

    const handleTransaction = async (swapId: string, publishedTransaction: TransactionResponse, txHash: string) => {
        if (publishedTransaction?.meta?.err) {
            txHash && setSwapTransaction(swapId, PublishedSwapTransactionStatus.Error, txHash, String(publishedTransaction.meta.err));
            toast(String(publishedTransaction.meta.err))
            setLoading(false)
        }
        else {
            txHash && setSwapTransaction(swapId, PublishedSwapTransactionStatus.Completed, txHash, '');
            setTransferDone(true)
        }
    };

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

        if (!swap || !walletPublicKey || !signTransaction) return

        setLoading(true)
        try {
            const connection = new Connection(
                `${solanaNode}`,
                "confirmed"
            );

            const sourceToken = new PublicKey(source_currency?.contract_address!);
            const recipientAddress = new PublicKey(depositAddress);

            const transactionInstructions: TransactionInstruction[] = [];
            const associatedTokenFrom = await getAssociatedTokenAddress(
                sourceToken,
                walletPublicKey
            );
            const fromAccount = await getAccount(connection, associatedTokenFrom);
            const associatedTokenTo = await getAssociatedTokenAddress(
                sourceToken,
                recipientAddress
            );

            if (!(await connection.getAccountInfo(associatedTokenTo))) {
                transactionInstructions.push(
                    createAssociatedTokenAccountInstruction(
                        walletPublicKey,
                        associatedTokenTo,
                        recipientAddress,
                        sourceToken
                    )
                );
            }
            transactionInstructions.push(
                createTransferInstruction(
                    fromAccount.address,
                    associatedTokenTo,
                    walletPublicKey,
                    amount * Math.pow(10, Number(source_currency?.decimals))
                )
            );

            const transaction = new Transaction().add(...transactionInstructions);
            const signature = await configureAndSendCurrentTransaction(
                transaction,
                connection,
                walletPublicKey,
                signTransaction
            );
            const txReceipt = await connection.getTransaction(signature);

            if (signature) {
                if (!txReceipt?.meta?.err)
                    setSwapTransaction(swap?.id, PublishedSwapTransactionStatus.Pending, signature);
                else
                    handleTransaction(swap?.id, txReceipt, signature)
            }

        }
        catch (e) {
            if (e?.message) {
                toast(e.message)
                setLoading(false)
                return
            }
        }
        setLoading(false)

    }, [swap, depositAddress, source_currency, walletPublicKey,  amount, signTransaction])

    return (
        <>
            <div className="w-full space-y-5 flex flex-col justify-between h-full text-primary-text">
                <div className='space-y-4'>
                    {
                        !wallet &&
                        <SubmitButton isDisabled={loading} isSubmitting={loading} onClick={handleConnect} icon={<Link className="h-5 w-5 ml-2" aria-hidden="true" />} >
                            Authorize to Send on Solana
                        </SubmitButton>
                    }
                    {
                        wallet &&
                        <SubmitButton isDisabled={!!(loading || transferDone)} isSubmitting={!!(loading || transferDone)} onClick={handleTransfer} icon={<ArrowLeftRight className="h-5 w-5 ml-2" aria-hidden="true" />} >
                            Transfer
                        </SubmitButton>
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
    feePayer: PublicKey,
    signTransaction: SignerWalletAdapterProps['signTransaction']
) => {
    const blockHash = await connection.getLatestBlockhash();
    transaction.feePayer = feePayer;
    transaction.recentBlockhash = blockHash.blockhash;
    const signed = await signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction({
        blockhash: blockHash.blockhash,
        lastValidBlockHeight: blockHash.lastValidBlockHeight,
        signature
    });
    return signature;
};