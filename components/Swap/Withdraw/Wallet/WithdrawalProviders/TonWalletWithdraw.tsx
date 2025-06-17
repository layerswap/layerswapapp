import { FC, useCallback, useState } from 'react'
import toast from 'react-hot-toast';
import useWallet from '@/hooks/useWallet';
import { useSwapTransactionStore } from '@/stores/swapTransactionStore';
import WalletIcon from '@/components/icons/WalletIcon';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { Address, JettonMaster, beginCell, toNano } from '@ton/ton'
import { Token } from '@/Models/Network';
import { BackendTransactionStatus } from '@/lib/apiClients/layerSwapApiClient';
import tonClient from '@/lib/wallets/ton/client';
import { datadogRum } from '@datadog/browser-rum';
import { TransferProps, WithdrawPageProps } from '../Common/sharedTypes';
import { ConnectWalletButton, SendTransactionButton } from '../Common/buttons';
import TransactionMessages from '../../messages/TransactionMessages';
import { useConnectModal } from '@/components/WalletModal';

export const TonWalletWithdrawStep: FC<WithdrawPageProps> = ({ network, token }) => {
    const [loading, setLoading] = useState(false);
    const { connect } = useConnectModal()
    const { provider } = useWallet(network, 'withdrawal');
    const { setSwapTransaction } = useSwapTransactionStore();
    const [tonConnectUI] = useTonConnectUI();
    const [transactionErrorMessage, setTransactionErrorMessage] = useState<string | undefined>(undefined)

    const wallet = provider?.activeWallet

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

    const handleTransfer = useCallback(async ({ amount, callData, depositAddress, swapId }: TransferProps) => {
        setLoading(true)
        setTransactionErrorMessage(undefined)
        if (!swapId || !depositAddress || !token || !wallet?.address || !callData || amount === undefined) {
            setLoading(false)
            toast('Something went wrong, please try again.')
            return
        }

        try {

            const transaction = await transactionBuilder(amount, token, depositAddress, wallet?.address, callData)
            const res = await tonConnectUI.sendTransaction(transaction)

            if (res) {
                setSwapTransaction(swapId, BackendTransactionStatus.Pending, res.boc);
            }

        }
        catch (e) {
            setTransactionErrorMessage(e.message)
        }
        finally {
            setLoading(false)
        }
    }, [network, token, tonConnectUI])

    if (!wallet) {
        return <ConnectWalletButton isDisabled={loading} isSubmitting={loading} onClick={handleConnect} />
    }

    return (
        <div className="w-full space-y-3 flex flex-col justify-between h-full text-primary-text">
            {
                transactionErrorMessage &&
                <TransactionMessage isLoading={loading} error={transactionErrorMessage} />
            }
            {
                !loading &&
                <SendTransactionButton isDisabled={!!loading} isSubmitting={!!loading} onClick={handleTransfer} icon={<WalletIcon className="stroke-2 w-6 h-6" aria-hidden="true" />} error={!!transactionErrorMessage} />
            }
        </div>
    )
}

const TransactionMessage: FC<{ isLoading: boolean, error: string | undefined }> = ({ isLoading, error }) => {
    if (isLoading) {
        return <TransactionMessages.ConfirmTransactionMessage />
    }
    else if (error && error.includes('Reject request')) {
        return <TransactionMessages.TransactionRejectedMessage />
    }
    else if (error && error.includes('Transaction was not sent')) {
        return <TransactionMessages.TransactionFailedMessage />
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

const transactionBuilder = async (amount: number, token: Token, depositAddress: string, sourceAddress: string, callData: string) => {
    const parsedCallData = JSON.parse(callData)

    if (token.contract) {
        const destinationAddress = Address.parse(depositAddress);
        const userAddress = Address.parse(sourceAddress)

        const forwardPayload = beginCell()
            .storeUint(0, 32) // 0 opcode means we have a comment
            .storeStringTail(parsedCallData.comment)
            .endCell();

        const body = beginCell()
            .storeUint(0x0f8a7ea5, 32) // opcode for jetton transfer
            .storeUint(0, 64) // query id
            .storeCoins(parsedCallData.amount) // jetton amount
            .storeAddress(destinationAddress) // TON wallet destination address
            .storeAddress(destinationAddress) // response excess destination
            .storeBit(0) // no custom payload
            .storeCoins(toNano('0.00002')) // forward amount (if >0, will send notification message)
            .storeBit(1) // we store forwardPayload as a reference
            .storeRef(forwardPayload)
            .endCell();

        const jettonMasterAddress = Address.parse(token.contract!)
        const jettonMaster = tonClient.open(JettonMaster.create(jettonMasterAddress))
        const jettonAddress = await jettonMaster.getWalletAddress(userAddress)

        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 360,
            messages: [
                {
                    address: jettonAddress.toString(), // sender jetton wallet
                    amount: toNano('0.045').toString(), // for commission fees, excess will be returned
                    payload: body.toBoc().toString("base64") // payload with jetton transfer and comment body
                }
            ]
        }
        return tx
    } else {
        const body = beginCell()
            .storeUint(0, 32) // write 32 zero bits to indicate that a text comment will follow
            .storeStringTail(parsedCallData.comment) // write our text comment
            .endCell();

        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 360,
            messages: [
                {
                    address: depositAddress,
                    amount: toNano(amount).toString(),
                    payload: body.toBoc().toString("base64") // payload with comment in body
                }
            ]
        }
        return tx
    }
}