import { FC, useCallback, useState } from 'react'
import { BackendTransactionStatus } from '../../../../lib/layerSwapApiClient';
import useWallet from '../../../../hooks/useWallet';
import { useWallet as useTronWallet } from '@tronweb3/tronwallet-adapter-react-hooks';
import { useSwapTransactionStore } from '../../../../stores/swapTransactionStore';
import WalletIcon from '../../../icons/WalletIcon';
import { WithdrawPageProps } from './WalletTransferContent';
import { ButtonWrapper, ConnectWalletButton } from './WalletTransfer/buttons';
import { useSettingsState } from '../../../../context/settings';
import TransactionMessages from '../messages/TransactionMessages';
import { datadogRum } from '@datadog/browser-rum';
import { TronWeb } from 'tronweb'
import useSWRGas from '../../../../lib/gases/useSWRGas';

const TronWalletWithdraw: FC<WithdrawPageProps> = ({ network, callData, swapId, token, amount, depositAddress }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | undefined>()

    const { provider } = useWallet(network, 'withdrawal');
    const { setSwapTransaction } = useSwapTransactionStore();

    const wallet = provider?.activeWallet
    const { wallet: tronWallet, signTransaction } = useTronWallet();
    const walletAddress = tronWallet?.adapter.address
    const tronNode = network?.node_url
    const networkName = network?.name

    const { networks } = useSettingsState()
    const networkWithTokens = networks.find(n => n.name === networkName)

    const { gas, isGasLoading } = useSWRGas(walletAddress, networkWithTokens, token)

    const handleTransfer = useCallback(async () => {
        setError(undefined)
        setLoading(true)
        try {

            if (!signTransaction || !swapId || !depositAddress || !amount || !token) throw new Error('Missing data')
            if (!tronWallet?.adapter.address) throw new Error('Tron wallet not connected')

            const tronWeb = new TronWeb({ fullNode: tronNode, solidityNode: tronNode });

            const amountInWei = Math.pow(10, token?.decimals) * amount

            let transaction

            if (token.contract) {

                const estimatedFee = (gas && network?.token) && Number((gas * Math.pow(10, network?.token?.decimals)).toFixed())
                console.log(estimatedFee)
                transaction = (await tronWeb.transactionBuilder.triggerSmartContract(
                    token.contract,
                    "transfer(address,uint256)",
                    {
                        feeLimit: estimatedFee || 100000000
                    },
                    [{ type: 'address', value: depositAddress }, { type: 'uint256', value: amountInWei }],
                    wallet?.address
                )).transaction;

            } else {
                transaction = await tronWeb.transactionBuilder.sendTrx(depositAddress, amountInWei, tronWallet?.adapter.address)
            }

            const signature = await signTransaction(transaction)

            const res = await tronWeb.trx.sendRawTransaction(signature)

            if (signature && res.result) {
                setSwapTransaction(swapId, BackendTransactionStatus.Pending, signature.txID);
            } else {
                throw new Error(res.code.toString())
            }

        }
        catch (e) {
            if (e?.message) {
                if (e?.logs?.some(m => m?.includes('insufficient funds')) || e.message.includes('Attempt to debit an account')) setError('insufficientFunds')
                else setError(e.message)
                return
            }
        }
        finally {
            setLoading(false)
        }
    }, [swapId, callData, walletAddress, signTransaction, network, gas])

    if (!wallet || !walletAddress) {
        return <ConnectWalletButton />
    }

    return (
        <div className="w-full space-y-3 flex flex-col justify-between h-full text-primary-text">
            <TransactionMessage
                error={error}
                isLoading={loading}
            />
            {
                wallet && !loading &&
                <ButtonWrapper isDisabled={!!loading || isGasLoading} isSubmitting={!!loading || isGasLoading} onClick={handleTransfer} icon={<WalletIcon className="stroke-2 w-6 h-6" aria-hidden="true" />} >
                    {error ? 'Try again' : 'Send from wallet'}
                </ButtonWrapper>
            }
        </div>
    )
}

const TransactionMessage: FC<{ isLoading: boolean, error: string | undefined }> = ({ isLoading, error }) => {
    if (isLoading) {
        return <TransactionMessages.ConfirmTransactionMessage />
    }
    else if (error === "BANDWITH_ERROR") {
        return <TransactionMessages.InsufficientFundsMessage />
    }
    else if (error === "user reject this request") {
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

export default TronWalletWithdraw;