import { FC, useCallback, useState } from 'react'
import SubmitButton from '../../../buttons/submitButton';
import toast from 'react-hot-toast';
import { BackendTransactionStatus } from '../../../../lib/layerSwapApiClient';
import { Transaction, Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import useWallet from '../../../../hooks/useWallet';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import { SignerWalletAdapterProps } from '@solana/wallet-adapter-base';
import { useSwapTransactionStore } from '../../../../stores/swapTransactionStore';
import WalletIcon from '../../../icons/WalletIcon';
import { WithdrawPageProps } from './WalletTransferContent';
import { ButtonWrapper } from './WalletTransfer/buttons';

const SolanaWalletWithdrawStep: FC<WithdrawPageProps> = ({ amount, depositAddress, network, token, swapId }) => {
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

        if (!swapId || !walletPublicKey || !signTransaction || !depositAddress || !amount) return

        setLoading(true)
        try {
            const connection = new Connection(
                `${solanaNode}`,
                "confirmed"
            );

            const sourceToken = new PublicKey(token?.contract!);
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
                    amount * Math.pow(10, Number(token?.decimals))
                )
            );

            const transaction = new Transaction().add(...transactionInstructions);
            const signature = await configureAndSendCurrentTransaction(
                transaction,
                connection,
                walletPublicKey,
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
    }, [swapId, depositAddress, network, token, walletPublicKey, amount, signTransaction])

    return (
        <>
            <div className="w-full space-y-5 flex flex-col justify-between h-full text-primary-text">
                <div className='space-y-4'>
                    {
                        !wallet &&
                        <ButtonWrapper isDisabled={loading} isSubmitting={loading} onClick={handleConnect} icon={<WalletIcon className="stroke-2 w-6 h-6" aria-hidden="true" />} >
                            Connect a wallet
                        </ButtonWrapper>
                    }
                    {
                        wallet &&
                        <ButtonWrapper isDisabled={!!loading} isSubmitting={!!loading} onClick={handleTransfer} icon={<WalletIcon className="stroke-2 w-6 h-6" aria-hidden="true" />} >
                            Send from wallet
                        </ButtonWrapper>
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