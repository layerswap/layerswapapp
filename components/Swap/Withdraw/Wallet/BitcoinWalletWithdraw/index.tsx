import { FC, useCallback, useMemo, useState } from 'react'
import toast from 'react-hot-toast';
import useWallet from '../../../../../hooks/useWallet';
import { useSwapTransactionStore } from '../.././../../../stores/swapTransactionStore';
import WalletIcon from '../../../../icons/WalletIcon';
import { WithdrawPageProps } from '../WalletTransferContent';
import { ConnectWalletButton, SendTransactionButton } from '../WalletTransfer/buttons';
import TransactionMessages from '../../messages/TransactionMessages';
import { datadogRum } from '@datadog/browser-rum';
import { useConnectModal } from '../../../../WalletModal';
import { useAccount, useConfig } from '@bigmi/react';
import { BackendTransactionStatus } from '../../../../../lib/apiClients/layerSwapApiClient';
import KnownInternalNames from '../../../../../lib/knownIds';
import { JsonRpcClient } from '../../../../../lib/apiClients/jsonRpcClient';
import { sendTransaction } from './sendTransaction';

const BitcoinWalletWithdrawStep: FC<WithdrawPageProps> = ({ amount, depositAddress, network, token, swapId, callData }) => {
    const [loading, setLoading] = useState(false);
    const { connect } = useConnectModal()
    const { provider } = useWallet(network, 'withdrawal');
    const { setSwapTransaction } = useSwapTransactionStore();
    const [transactionErrorMessage, setTransactionErrorMessage] = useState<string | undefined>(undefined)
    const { connector } = useAccount()
    const wallet = provider?.activeWallet
    const dataLoading = !amount || !depositAddress || !network || !token || !swapId || !callData
    const isTestnet = network?.name === KnownInternalNames.Networks.BitcoinTestnet;

    const config = useConfig()
    const publicClient = config.getClient()

    const handleConnect = useCallback(async () => {
        setLoading(true)
        setTransactionErrorMessage(undefined)
        try {
            await connect(provider)
        }
        catch (e) {
            toast(e.message)
        }
        finally {
            setLoading(false)
        }
    }, [provider])

    const rpcClient = useMemo(() => {
        return network && new JsonRpcClient(isTestnet ? 'https://bitcoin-testnet-rpc.publicnode.com' : network.node_url);
    }, [network]);

    const handleTransfer = useCallback(async () => {
        setTransactionErrorMessage(undefined)

        try {
            setLoading(true)
            if (!amount || !depositAddress || !network || !token || !swapId || !callData || !wallet || !connector || !rpcClient) {
                throw new Error('Missing required parameters for transfer');
            }

            const txHash = await sendTransaction({
                amount,
                depositAddress,
                userAddress: wallet.address,
                isTestnet,
                rpcClient,
                callData,
                connector,
                publicClient
            });

            if (txHash) {
                setSwapTransaction(swapId, BackendTransactionStatus.Pending, txHash);
            }

        }
        catch (e) {
            setTransactionErrorMessage(e.message)
        }
        finally {
            setLoading(false)
        }
    }, [swapId, depositAddress, network, token, amount, callData, wallet, connector, rpcClient, isTestnet])

    if (!wallet) {
        return <ConnectWalletButton isDisabled={loading} isSubmitting={loading} onClick={handleConnect} />
    }

    return (
        <div className="w-full space-y-3 flex flex-col justify-between h-full text-primary-text">
            {
                transactionErrorMessage &&
                <TransactionMessage isLoading={loading} error={transactionErrorMessage} />
            }
            <SendTransactionButton isDisabled={!!loading || dataLoading} isSubmitting={!!loading || dataLoading} onClick={handleTransfer} icon={<WalletIcon className="stroke-2 w-6 h-6" aria-hidden="true" />} />
        </div>
    )
}

const TransactionMessage: FC<{ isLoading: boolean, error: string | undefined }> = ({ isLoading, error }) => {
    if (isLoading) {
        return <TransactionMessages.ConfirmTransactionMessage />
    }
    else if (error && error.includes('User rejected the request.')) {
        return <TransactionMessages.TransactionRejectedMessage />
    }
    else if (error && error.includes('Insufficient balance.')) {
        return <TransactionMessages.InsufficientFundsMessage />
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

export default BitcoinWalletWithdrawStep;