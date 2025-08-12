import { FC, useCallback, useState } from 'react'
import { BackendTransactionStatus } from '@/lib/apiClients/layerSwapApiClient';
import { Transaction, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import useWallet from '@/hooks/useWallet';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { SignerWalletAdapterProps } from '@solana/wallet-adapter-base';
import { useSwapTransactionStore } from '@/stores/swapTransactionStore';
import WalletIcon from '@/components/icons/WalletIcon';
import useSWRBalance from '@/lib/balances/useSWRBalance';
import { useSettingsState } from '@/context/settings';
import { datadogRum } from '@datadog/browser-rum';
import { transactionSenderAndConfirmationWaiter } from './transactionSender';
import { TransferProps, WithdrawPageProps } from '../../Common/sharedTypes';
import { ConnectWalletButton, SendTransactionButton } from '../../Common/buttons';
import TransactionMessages from '../../../messages/TransactionMessages';
import WalletMessage from '../../../messages/Message';

export const SVMWalletWithdrawStep: FC<WithdrawPageProps> = ({ swapBasicData, refuel }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | undefined>()
    const [insufficientTokens, setInsufficientTokens] = useState<string[]>([])
    const { source_network, source_token } = swapBasicData;

    const { provider } = useWallet(source_network, 'withdrawal');
    const { setSwapTransaction } = useSwapTransactionStore();

    const wallet = provider?.activeWallet
    const { wallet: solanaWallet, signTransaction } = useSolanaWallet();
    const walletPublicKey = solanaWallet?.adapter.publicKey
    const solanaNode = source_network?.node_url
    const networkName = source_network?.name

    const { networks } = useSettingsState()
    const networkWithTokens = networks.find(n => n.name === networkName)
    const { balances } = useSWRBalance(wallet?.address, networkWithTokens)

    const handleTransfer = useCallback(async ({ amount, callData, swapId }: TransferProps) => {
        setLoading(true)
        setError(undefined)
        try {

            if (!signTransaction) throw new Error('Missing signTransaction')
            if (!callData) throw new Error('Missing callData')
            if (!swapId) throw new Error('Missing swapId')

            const connection = new Connection(
                `${solanaNode}`,
                "confirmed"
            );

            const arrayBufferCallData = Uint8Array.from(atob(callData), c => c.charCodeAt(0))
            const transaction = Transaction.from(arrayBufferCallData)

            const feeInLamports = await transaction.getEstimatedFee(connection)
            const feeInSol = feeInLamports / LAMPORTS_PER_SOL

            const nativeTokenBalance = balances?.find(b => b.token == source_network?.token?.symbol)
            const tokenbalanceData = balances?.find(b => b.token == source_token?.symbol)
            const tokenBalanceAmount = tokenbalanceData?.amount
            const nativeTokenBalanceAmount = nativeTokenBalance?.amount

            const insufficientTokensArr: string[] = []

            if (source_network?.token && (Number(nativeTokenBalanceAmount) < feeInSol || isNaN(Number(nativeTokenBalanceAmount)))) {
                insufficientTokensArr.push(source_network.token?.symbol);
            }
            if (source_network?.token?.symbol !== source_token?.symbol && amount && source_token?.symbol && Number(tokenBalanceAmount) < amount) {
                insufficientTokensArr.push(source_token?.symbol);
            }
            setInsufficientTokens(insufficientTokensArr)
            const signature = await configureAndSendCurrentTransaction(
                transaction,
                connection,
                signTransaction
            );

            return signature;

        }
        catch (e) {
            setLoading(false)
            if (e?.message) {
                if (e?.logs?.some(m => m?.includes('insufficient funds')) || e.message.includes('Attempt to debit an account')) setError('insufficientFunds')
                else setError(e.message)
            }
            throw e
        }
    }, [walletPublicKey, signTransaction, source_network, source_token])

    if (!wallet || !walletPublicKey) {
        return <ConnectWalletButton />
    }

    return (
        <div className="w-full space-y-3 flex flex-col justify-between h-full text-primary-text">
            <TransactionMessage
                error={error}
                isLoading={loading}
                insufficientTokens={insufficientTokens}
            />
            {
                wallet && !loading &&
                <SendTransactionButton
                    isDisabled={!!loading}
                    isSubmitting={!!loading}
                    onClick={handleTransfer}
                    icon={<WalletIcon className="stroke-2 w-6 h-6" aria-hidden="true" />}
                    error={!!error}
                    refuel={refuel}
                    swapData={swapBasicData}
                />
            }
        </div>
    )
}

const TransactionMessage: FC<{ isLoading: boolean, error: string | undefined, insufficientTokens: string[] }> = ({ isLoading, error, insufficientTokens }) => {
    if (isLoading) {
        return <TransactionMessages.ConfirmTransactionMessage />
    }
    else if (error === "insufficientFunds") {
        return <WalletMessage
            status="error"
            header='Insufficient funds'
            details={`The balance of ${insufficientTokens?.join(" and ")} in the connected wallet is not enough`} />
    }
    else if (error === "User rejected the request.") {
        return <TransactionMessages.TransactionRejectedMessage />
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

export const configureAndSendCurrentTransaction = async (
    transaction: Transaction,
    connection: Connection,
    signTransaction: SignerWalletAdapterProps['signTransaction']
) => {

    const blockHash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockHash.blockhash;
    transaction.lastValidBlockHeight = blockHash.lastValidBlockHeight;

    const signed = await signTransaction(transaction);

    const res = await transactionSenderAndConfirmationWaiter({
        connection,
        serializedTransaction: signed.serialize(),
        blockhashWithExpiryBlockHeight: blockHash,
    });

    if (res?.meta?.err) {
        throw new Error(res.meta.err.toString())
    }

    return res?.transaction.signatures[0];
};
