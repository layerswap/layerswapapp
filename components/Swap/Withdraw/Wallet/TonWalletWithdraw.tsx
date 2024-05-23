import { FC, useCallback, useState } from 'react'
import SubmitButton from '../../../buttons/submitButton';
import toast from 'react-hot-toast';
import useWallet from '../../../../hooks/useWallet';
import { useSwapTransactionStore } from '../../../../stores/swapTransactionStore';
import WalletIcon from '../../../icons/WalletIcon';
import { WithdrawPageProps } from './WalletTransferContent';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { Address, JettonMaster, TonClient, beginCell, toNano } from '@ton/ton'
import { Token } from '../../../../Models/Network';
import { BackendTransactionStatus } from '../../../../lib/layerSwapApiClient';

const TonWalletWithdrawStep: FC<WithdrawPageProps> = ({ amount, depositAddress, network, token, swapId, callData }) => {
    const [loading, setLoading] = useState(false);
    const { getWithdrawalProvider } = useWallet()
    const { setSwapTransaction } = useSwapTransactionStore();
    const [tonConnectUI] = useTonConnectUI();

    const provider = getWithdrawalProvider(network!);
    const wallet = provider?.getConnectedWallet();

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
        setLoading(true)

        if (!swapId || !depositAddress || !token || !wallet || !callData || amount === undefined) return toast('Something went wrong, please try again.')

        try {

            const transaction = await transactionBuilder(amount, token, depositAddress, wallet?.address, callData)
            const res = await tonConnectUI.sendTransaction(transaction)

            if (res) {
                setSwapTransaction(swapId, BackendTransactionStatus.Pending, res.boc);
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
    }, [swapId, depositAddress, network, token, amount])

    return (
        <>
            <div className="w-full space-y-5 flex flex-col justify-between h-full text-primary-text">
                <div className='space-y-4'>
                    {
                        !wallet &&
                        <SubmitButton isDisabled={loading} isSubmitting={loading} onClick={handleConnect} icon={<WalletIcon className="stroke-2 w-6 h-6" aria-hidden="true" />} >
                            Connect a wallet
                        </SubmitButton>
                    }
                    {
                        wallet &&
                        <SubmitButton isDisabled={!!loading} isSubmitting={!!loading} onClick={handleTransfer} icon={<WalletIcon className="stroke-2 w-6 h-6" aria-hidden="true" />} >
                            Send from wallet
                        </SubmitButton>
                    }
                </div>
            </div>
        </>
    )
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

        const client = new TonClient({
            endpoint: 'https://toncenter.com/api/v2/jsonRPC',
            apiKey: '9a591e2fc2d679b8ac31c76427d132bc566d0d217c61256ca9cc7ae1e9280806'
        });

        const jettonMasterAddress = Address.parse(token.contract!)
        const jettonMaster = client.open(JettonMaster.create(jettonMasterAddress))
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


export default TonWalletWithdrawStep;