import { FC, useCallback, useEffect, useState } from "react";
import {
    useAccount,
    useSendTransaction
} from "wagmi";
import { parseEther } from 'viem'
import SubmitButton from "@/components/buttons/submitButton";
import { BackendTransactionStatus } from "@/lib/apiClients/layerSwapApiClient";
import WalletIcon from "@/components/icons/WalletIcon";
import Modal from '@/components/modal/modal';
import MessageComponent from "@/components/MessageComponent";
import { TransferProps, WithdrawPageProps } from "../../Common/sharedTypes";
import TransactionMessage from "../../Common/transactionMessage";
import { SendTransactionButton } from "../../Common/buttons";
import { useSwapTransactionStore } from "@/stores/swapTransactionStore";
import { useSwapDataState } from "@/context/swap";
import { datadogRum } from "@datadog/browser-rum";
import { isMobile } from "@/lib/openLink";

const TransferTokenButton: FC<{ savedTransactionHash?: string, swapId?: string, chainId?: number }> = ({
    savedTransactionHash,
    swapId,
    chainId
}) => {
    const [applyingTransaction, setApplyingTransaction] = useState<boolean>(!!savedTransactionHash)
    const [buttonClicked, setButtonClicked] = useState(false)
    const [openChangeAmount, setOpenChangeAmount] = useState(false)
    const [estimatedGas, setEstimatedGas] = useState<bigint>()

    const { selectedSourceAccount } = useSwapDataState()

    const { address } = useAccount();
    const { setSwapTransaction } = useSwapTransactionStore();

    const transaction = useSendTransaction()

    useEffect(() => {
        try {
            if (transaction?.data && swapId) {
                setSwapTransaction(swapId, BackendTransactionStatus.Pending, transaction.data as `0x${string}`)
            }
        }
        catch (e) {
            //TODO log to logger
            console.error(e.message)
        }
    }, [transaction?.data, swapId])

    const clickHandler = useCallback(async ({ amount, callData, depositAddress, sequenceNumber, swapId, userDestinationAddress }: TransferProps) => {
        setButtonClicked(true)
        try {
            if (!depositAddress)
                throw new Error('Missing deposit address')
            if (amount == undefined)
                throw new Error('Missing amount')
            if (!transaction.sendTransaction)
                throw new Error('Missing sendTransaction')
            if (!selectedSourceAccount?.address)
                throw new Error('No selected account')
            const tx = {
                chainId,
                to: depositAddress as `0x${string}`,
                value: parseEther(amount?.toString()),
                gas: estimatedGas,
                data: callData as `0x${string}`,
                account: selectedSourceAccount.address as `0x${string}`
            }
            if (isMobile() && selectedSourceAccount.wallet.metadata?.deepLink) {
                window.location.href = selectedSourceAccount.wallet.metadata?.deepLink
                await new Promise(resolve => setTimeout(resolve, 100))
            }
            transaction?.sendTransaction(tx)
        } catch (e) {
            const error = new Error(e)
            error.name = "TransferTokenError"
            error.cause = e
            datadogRum.addError(error);
        }
    }, [transaction, estimatedGas, chainId])

    const isError = transaction.isError
    return <div className="w-full space-y-3 flex flex-col justify-between h-full text-primary-text">
        {
            buttonClicked &&
            <TransactionMessage
                transaction={transaction}
                applyingTransaction={applyingTransaction}
                activeAddress={address}
                selectedSourceAddress={selectedSourceAccount?.address}
            />
        }
        {
            !transaction.isPending &&
            <SendTransactionButton
                onClick={clickHandler}
                icon={<WalletIcon className="stroke-2 w-6 h-6" />}
                error={isError && buttonClicked}
            />
        }
        {/* <Modal
            height="80%"
            show={openChangeAmount}
            setShow={setOpenChangeAmount}
            modalId="transferNative"
        >
            <MessageComponent>
                <div className="space-y-4">
                    <div className='md:text-2xl text-lg font-bold text-primary-text leading-6 text-center'>
                        Insufficient funds for gas
                    </div>
                    <div className="text-base font-medium space-y-6 text-primary-text text-center">
                        This transfer can&apos;t be processed because you don&apos;t have enough gas.
                    </div>
                </div>
                <div className="text-base">
                    <span>You have requested swap with</span> <span>{amount}</span>
                </div>
                <MessageComponent.Buttons>
                    <div className="flex flex-row text-primary-text text-base space-x-2">
                        <div className='basis-1/3'>
                            <SubmitButton onClick={() => { setOpenChangeAmount(false); clickHandler() }} text_align='left' isDisabled={false} isSubmitting={false} buttonStyle='filled' >
                                Transfer
                            </SubmitButton>
                        </div>
                        <div className='basis-2/3'>
                            <SubmitButton onClick={() => setOpenChangeAmount(false)} button_align='right' text_align='left' isDisabled={false} isSubmitting={false} buttonStyle='outline' >
                                Cancel
                            </SubmitButton>
                        </div>
                    </div>
                </MessageComponent.Buttons>
            </MessageComponent>
        </Modal> */}
    </div>
}

export default TransferTokenButton
