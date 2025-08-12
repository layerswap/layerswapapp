import { FC, useCallback, useMemo, useState } from 'react'
import toast from 'react-hot-toast';
import useWallet from '@/hooks/useWallet';
import WalletIcon from '@/components/icons/WalletIcon';
import { ConnectWalletButton, SendTransactionButton } from '../../Common/buttons';
import { datadogRum } from '@datadog/browser-rum';
import { useAccount, useConfig } from '@bigmi/react';
import KnownInternalNames from '@/lib/knownIds';
import { JsonRpcClient } from '@/lib/apiClients/jsonRpcClient';
import { sendTransaction } from './sendTransaction';
import { useConnectModal } from '@/components/WalletModal';
import { TransferProps, WithdrawPageProps } from '../../Common/sharedTypes';
import TransactionMessages from '../../../messages/TransactionMessages';

export const BitcoinWalletWithdrawStep: FC<WithdrawPageProps> = ({ swapBasicData, refuel }) => {
    const [loading, setLoading] = useState(false);
    const { connect } = useConnectModal()
    const { source_network, source_token } = swapBasicData;
    const { provider } = useWallet(source_network, 'withdrawal');
    const [transactionErrorMessage, setTransactionErrorMessage] = useState<string | undefined>(undefined)
    const { connector } = useAccount()
    const wallet = provider?.activeWallet
    const dataLoading = !source_network || !source_token
    const isTestnet = source_network?.name === KnownInternalNames.Networks.BitcoinTestnet;

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
        return source_network && new JsonRpcClient(source_network.node_url);
    }, [source_network]);

    const handleTransfer = useCallback(async ({ amount, callData, depositAddress, swapId }: TransferProps) => {
        setTransactionErrorMessage(undefined)

        try {
            setLoading(true)
            if (!amount || !depositAddress || !source_network || !source_token || !callData || !wallet || !connector || !rpcClient) {
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

            return txHash;

        }
        catch (e) {
            setLoading(false)
            setTransactionErrorMessage(e.message)
            throw e
        }
    }, [source_network, source_token, wallet, connector, rpcClient, isTestnet])

    if (!wallet) {
        return <ConnectWalletButton isDisabled={loading} isSubmitting={loading} onClick={handleConnect} />
    }

    return (
        <div className="w-full space-y-3 flex flex-col justify-between h-full text-primary-text">
            {
                transactionErrorMessage &&
                <TransactionMessage isLoading={loading} error={transactionErrorMessage} />
            }
            <SendTransactionButton
                isDisabled={!!loading || dataLoading}
                isSubmitting={!!loading || dataLoading}
                onClick={handleTransfer}
                icon={<WalletIcon className="stroke-2 w-6 h-6" aria-hidden="true" />}
                swapData={swapBasicData}
                refuel={refuel}
            />
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