import { FC, useCallback, useState } from 'react'
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
import { BackendTransactionStatus } from '../../../../../lib/layerSwapApiClient';
import { transactionBuilder } from './transactionBuilder';
import { Psbt } from 'bitcoinjs-lib';
import { UTXOWalletProvider } from '@bigmi/client/dist/esm/connectors/types';
import KnownInternalNames from '../../../../../lib/knownIds';
import { sendUTXOTransaction } from './sendTransaction';

const BitcoinWalletWithdrawStep: FC<WithdrawPageProps> = ({ amount, depositAddress, network, token, swapId, callData }) => {
    const [loading, setLoading] = useState(false);
    const { connect } = useConnectModal()
    const { provider } = useWallet(network, 'withdrawal');
    const { setSwapTransaction } = useSwapTransactionStore();
    const [transactionErrorMessage, setTransactionErrorMessage] = useState<string | undefined>(undefined)
    const { connector } = useAccount()
    const wallet = provider?.activeWallet
    const dataLoading = !amount || !depositAddress || !network || !token || !swapId || !callData

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


    const handleTransfer = useCallback(async () => {
        setTransactionErrorMessage(undefined)

        try {
            setLoading(true)
            if (!amount || !depositAddress || !network || !token || !swapId || !callData || !wallet || !connector) {
                throw new Error('Missing required parameters for transfer');
            }
            const isTestnet = network.name === KnownInternalNames.Networks.BitcoinTestnet;

            amount = Math.floor(amount * 1e8); // Convert to satoshis
            const hexMemo = Number(callData).toString(16);

            const { psbt, inputsToSign, utxos } = await transactionBuilder({
                amount,
                depositAddress,
                userAddress: wallet?.address,
                memo: hexMemo,
                version: isTestnet ? 'testnet' : 'mainnet',
                publicClient
            });

            const balance = utxos.reduce((sum, u) => sum + u.value, 0)

            if (utxos.length === 0) {
                throw new Error(`Insufficient balance.`);
            } else if (balance < amount) {
                throw new Error(`Insufficient balance. Available: ${balance}, Required: ${amount}`);
            }

            const psbtHex = psbt.toHex();

            const provider = (await connector?.getProvider()) as UTXOWalletProvider;

            if (!provider) {
                throw new Error('Provider not found');
            }

            const signature = await provider.request({
                method: 'signPsbt',
                params: {
                    psbt: psbtHex,
                    inputsToSign,
                    finalize: false
                }
            })

            const signedPsbt = Psbt.fromHex(signature).finalizeAllInputs()
            const tx = signedPsbt.extractTransaction()
            const txHex = tx.toHex();

            const fee = signedPsbt.getFee();
            const vsize = tx.virtualSize();
            debugger
            // const txHash = await sendUTXOTransaction(network.node_url, txHex);

            // if (txHash) {
            //     setSwapTransaction(swapId, BackendTransactionStatus.Pending, txHash);
            // }

        }
        catch (e) {
            setTransactionErrorMessage(e.message)
        }
        finally {
            setLoading(false)
        }
    }, [swapId, depositAddress, network, token, amount, callData])

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