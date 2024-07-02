import { FC, useCallback, useEffect, useState } from "react";
import {
    useAccount,
    useSendTransaction
} from "wagmi";
import { createPublicClient, http, parseEther } from 'viem'
import SubmitButton from "../../../../buttons/submitButton";
import { BackendTransactionStatus } from "../../../../../lib/layerSwapApiClient";
import WalletIcon from "../../../../icons/WalletIcon";
import Modal from '../../../../modal/modal';
import MessageComponent from "../../../../MessageComponent";
import { BaseTransferButtonProps } from "./sharedTypes";
import TransactionMessage from "./transactionMessage";
import { ButtonWrapper } from "./buttons";
import { useSwapTransactionStore } from "../../../../../stores/swapTransactionStore";
import { useSwapDataState } from "../../../../../context/swap";
import { datadogRum } from "@datadog/browser-rum";

const TransferTokenButton: FC<BaseTransferButtonProps> = ({
    depositAddress,
    amount,
    savedTransactionHash,
    swapId,
}) => {
    const [applyingTransaction, setApplyingTransaction] = useState<boolean>(!!savedTransactionHash)
    const [buttonClicked, setButtonClicked] = useState(false)
    const [openChangeAmount, setOpenChangeAmount] = useState(false)
    const [estimatedGas, setEstimatedGas] = useState<bigint>()
    const { address, chain } = useAccount();
    const { setSwapTransaction } = useSwapTransactionStore();
    const { depositActionsResponse } = useSwapDataState()

    const callData = depositActionsResponse?.find(da => true)?.call_data as `0x${string}` | undefined

    const transaction = useSendTransaction()

    const publicClient = createPublicClient({
        chain: chain,
        transport: http()
    })

    useEffect(() => {
        (async () => {
            if (address && depositAddress) {
                try {
                    const gasEstimate = await publicClient.estimateGas({
                        account: address,
                        to: depositAddress,
                        data: callData,
                    })
                    setEstimatedGas(gasEstimate)
                }
                catch (e) {
                    const renderingError = new Error("Transaction is taking longer than expected");
                    renderingError.name = `LongTransactionError`;
                    renderingError.cause = renderingError;
                    datadogRum.addError(renderingError);
                    console.error(e)
                }
            }
        })()
    }, [address, callData, depositAddress, amount])

    useEffect(() => {
        try {
            if (transaction?.data) {
                setSwapTransaction(swapId, BackendTransactionStatus.Pending, transaction.data as `0x${string}`)
            }
        }
        catch (e) {
            //TODO log to logger
            console.error(e.message)
        }
    }, [transaction?.data, swapId])

    const clickHandler = useCallback(async () => {
        setButtonClicked(true)
        try {
            if (!depositAddress)
                throw new Error('Missing deposit address')
            if (!amount)
                throw new Error('Missing amount')
            if (!transaction.sendTransaction)
                throw new Error('Missing sendTransaction')

            const tx = {
                to: depositAddress,
                value: parseEther(amount?.toString()),
                gas: estimatedGas,
                data: callData
            }
            transaction?.sendTransaction(tx)
        } catch (e) {
            const error = new Error(e)
            error.name = "TransferTokenError"
            error.cause = e
            datadogRum.addError(error);
        }
    }, [transaction, estimatedGas, depositAddress, amount, callData])

    const isError = transaction.isError
    return <>
        {
            buttonClicked &&
            <TransactionMessage
                transaction={transaction}
                applyingTransaction={applyingTransaction}
            />
        }
        {
            !transaction.isPending && <>
                <ButtonWrapper
                    isDisabled={transaction.isPending}
                    onClick={clickHandler}
                    isSubmitting={isLoading || !depositAddress}
                    isDisabled={isLoading || !depositAddress}
                    icon={<WalletIcon className="stroke-2 w-6 h-6" />}
                >
                    {(isError && buttonClicked) ? <span>Try again</span>
                        : <span>Send from wallet</span>}
                </ButtonWrapper>
            </>
        }
        <Modal
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
                    You have requested swap with {amount}
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
        </Modal>
    </>
}

export default TransferTokenButton