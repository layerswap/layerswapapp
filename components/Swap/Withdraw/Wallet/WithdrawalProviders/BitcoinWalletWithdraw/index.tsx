import { FC, useCallback, useMemo, useState } from 'react'
import toast from 'react-hot-toast';
import useWallet from '@/hooks/useWallet';
import WalletIcon from '@/components/icons/WalletIcon';
import { ConnectWalletButton, SendTransactionButton } from '../../Common/buttons';
import { useAccount, useConfig } from '@bigmi/react';
import KnownInternalNames from '@/lib/knownIds';
import { JsonRpcClient } from '@/lib/apiClients/jsonRpcClient';
import { sendTransaction } from './sendTransaction';
import { useConnectModal } from '@/components/WalletModal';
import { TransferProps, WithdrawPageProps } from '../../Common/sharedTypes';
import ActionMessages from '../../../messages/TransactionMessages';
import { posthog } from 'posthog-js';
import { useSelectedAccount } from '@/context/swapAccounts';

export const BitcoinWalletWithdrawStep: FC<WithdrawPageProps> = ({ swapBasicData, refuel }) => {
    const [loading, setLoading] = useState(false);
    const { connect } = useConnectModal()
    const { source_network, source_token } = swapBasicData;
    const { provider } = useWallet(source_network, 'withdrawal');
    const [transactionErrorMessage, setTransactionErrorMessage] = useState<string | undefined>(undefined)
    const { connector } = useAccount()
    const selectedSourceAccount = useSelectedAccount("from", source_network?.name);
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
            if (!amount || !depositAddress || !source_network || !source_token || !callData || !selectedSourceAccount || !connector || !rpcClient) {
                throw new Error('Missing required parameters for transfer');
            }

            const txHash = await sendTransaction({
                amount,
                depositAddress,
                userAddress: selectedSourceAccount.address,
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
    }, [source_network, source_token, selectedSourceAccount, connector, rpcClient, isTestnet])

    if (!selectedSourceAccount) {
        return <ConnectWalletButton isDisabled={loading} isSubmitting={loading} onClick={handleConnect} />
    }

    return (
        <div className="w-full space-y-3 flex flex-col justify-between h-full text-primary-text">
            {
                transactionErrorMessage &&
                <TransactionMessage isLoading={loading} error={transactionErrorMessage} sourceAddress={selectedSourceAccount?.address} destAddress={swapBasicData?.destination_address} />
            }
            <SendTransactionButton
                isDisabled={!!loading || dataLoading}
                isSubmitting={!!loading || dataLoading}
                onClick={handleTransfer}
                clearError={() => setTransactionErrorMessage(undefined)}
                swapData={swapBasicData}
                refuel={refuel}
            />
        </div>
    )
}

const TransactionMessage: FC<{ isLoading: boolean, error: string | undefined, sourceAddress: string | undefined, destAddress: string | undefined }> = ({ isLoading, error, sourceAddress, destAddress }) => {
    if (isLoading) {
        return <ActionMessages.ConfirmTransactionMessage />
    }
    else if (error && error.includes('User rejected the request.')) {
        return <ActionMessages.TransactionRejectedMessage />
    }
    else if (error && error.includes('Insufficient balance.')) {
        return <ActionMessages.InsufficientFundsMessage />
    }
    else if (error) {
        const swapWithdrawalError = new Error(error);
        swapWithdrawalError.name = `SwapWithdrawalError`;
        swapWithdrawalError.cause = error;
        posthog.captureException('$exception', {
            name: swapWithdrawalError.name,
            message: swapWithdrawalError.message,
            $layerswap_exception_type: "Swap Withdrawal Error",
            $fromAddress: sourceAddress,
            $toAddress: destAddress,
            stack: swapWithdrawalError.stack,
            cause: swapWithdrawalError.cause,
            where: 'swapWithdrawalError',
            severity: 'error',
        });

        return <ActionMessages.UexpectedErrorMessage message={error} />
    }
    else return <></>
}