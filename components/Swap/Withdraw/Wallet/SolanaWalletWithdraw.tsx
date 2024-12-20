import { FC, useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import { BackendTransactionStatus } from '../../../../lib/layerSwapApiClient';
import { Transaction, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import useWallet from '../../../../hooks/useWallet';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { SignerWalletAdapterProps } from '@solana/wallet-adapter-base';
import { useSwapTransactionStore } from '../../../../stores/swapTransactionStore';
import WalletIcon from '../../../icons/WalletIcon';
import { WithdrawPageProps } from './WalletTransferContent';
import { ButtonWrapper, ConnectWalletButton } from './WalletTransfer/buttons';
import WalletMessage from './WalletTransfer/message';
import useSWRBalance from '../../../../lib/balances/useSWRBalance';
import { useSettingsState } from '../../../../context/settings';

const SolanaWalletWithdrawStep: FC<WithdrawPageProps> = ({ network, callData, swapId, token, amount }) => {
    const [loading, setLoading] = useState(false);
    const [insufficientFunds, setInsufficientFunds] = useState<boolean>(false)
    const [insufficientTokens, setInsufficientTokens] = useState<string[]>([])

    const { provider } = useWallet(network, 'withdrawal');
    const { setSwapTransaction } = useSwapTransactionStore();

    const wallet = provider?.activeWallet
    const { publicKey: walletPublicKey, signTransaction } = useSolanaWallet();
    const solanaNode = network?.node_url
    const networkName = network?.name

    const { networks } = useSettingsState()
    const networkWithTokens = networks.find(n => n.name === networkName)
    const { balance } = useSWRBalance(wallet?.address, networkWithTokens)


    useEffect(() => {
        setInsufficientFunds(false);
    }, [walletPublicKey]);

    const handleTransfer = useCallback(async () => {
        setLoading(true)
        try {

            if (!signTransaction || !callData || !swapId) throw new Error('Missing data')

            const connection = new Connection(
                `${solanaNode}`,
                "confirmed"
            );

            const arrayBufferCallData = Uint8Array.from(atob(callData), c => c.charCodeAt(0))
            const transaction = Transaction.from(arrayBufferCallData)

            const feeInLamports = await transaction.getEstimatedFee(connection)
            const feeInSol = feeInLamports / LAMPORTS_PER_SOL


            const nativeTokenBalance = balance?.find(b => b.token == network?.token?.symbol)
            const tokenbalanceData = balance?.find(b => b.token == token?.symbol)
            const tokenBalanceAmount = tokenbalanceData?.amount
            const nativeTokenBalanceAmount = nativeTokenBalance?.amount

            const insufficientTokensArr: string[] = []

            if (network?.token && Number(nativeTokenBalanceAmount) < feeInSol) insufficientTokensArr.push(network.token?.symbol)
            if (network?.token?.symbol !== token?.symbol && amount && token?.symbol && Number(tokenBalanceAmount) < amount) insufficientTokensArr.push(token?.symbol)
            setInsufficientTokens(insufficientTokensArr)

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
                if (e?.logs?.some(m => m?.includes('insufficient funds')) || e.message.includes('Attempt to debit an account')) setInsufficientFunds(true)
                else toast(e.message)
                return
            }
        }
        finally {
            setLoading(false)
        }
    }, [swapId, callData, walletPublicKey, signTransaction, network])

    if (!wallet) {
        return <ConnectWalletButton />
    }

    return (
        <div className="w-full space-y-5 flex flex-col justify-between h-full text-primary-text">
            {insufficientFunds &&
                <WalletMessage
                    status="error"
                    header='Insufficient funds'
                    details={`The balance of ${insufficientTokens?.join(" and ")} in the connected wallet is not enough`} />
            }
            {
                wallet &&
                <ButtonWrapper isDisabled={!!loading} isSubmitting={!!loading} onClick={handleTransfer} icon={<WalletIcon className="stroke-2 w-6 h-6" aria-hidden="true" />} >
                    Send from wallet
                </ButtonWrapper>
            }
        </div>
    )
}

export default SolanaWalletWithdrawStep;

export const configureAndSendCurrentTransaction = async (
    transaction: Transaction,
    connection: Connection,
    signTransaction: SignerWalletAdapterProps['signTransaction']
) => {
    const blockHash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockHash.blockhash;
    transaction.lastValidBlockHeight = blockHash.lastValidBlockHeight;

    const signed = await signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());
    const res = await connection.confirmTransaction({
        blockhash: transaction.recentBlockhash,
        lastValidBlockHeight: transaction.lastValidBlockHeight,
        signature
    });

    if (res.value.err) {
        throw new Error(res.value.err.toString())
    }

    return signature;
};
