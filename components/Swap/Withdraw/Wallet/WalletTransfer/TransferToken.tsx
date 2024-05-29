import { FC, useCallback, useEffect, useState } from "react";
import {
    useAccount,
    useSendTransaction,
    useTransaction
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
    const { swapResponse } = useSwapDataState()
    const { deposit_actions } = swapResponse || {}

    const callData = deposit_actions?.find(da => true)?.call_data as `0x${string}` | undefined

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

    const waitForTransaction = useTransaction({
        hash: transaction?.data || savedTransactionHash,
    })

    const clickHandler = useCallback(async () => {
        setButtonClicked(true)
        if (!depositAddress || !amount || !transaction?.sendTransaction) return
        const tx = {
            to: depositAddress,
            value: parseEther(amount?.toString()),
            gas: estimatedGas,
            data: callData
        }
        transaction?.sendTransaction(tx)
    }, [transaction, estimatedGas, depositAddress, amount, callData])

    const isError = [
        transaction,
        waitForTransaction
    ].some(d => d.isError)

    const isLoading = [
        transaction,
        waitForTransaction
    ].some(d => d.isPending)
    console.log('isLoading', isLoading)
    return <>
        {
            buttonClicked &&
            <TransactionMessage
                transaction={waitForTransaction}
                wait={waitForTransaction}
                applyingTransaction={applyingTransaction}
            />
        }
        <>
            <ButtonWrapper
                isDisabled={isLoading}
                onClick={clickHandler}
                icon={<WalletIcon className="stroke-2 w-6 h-6" />}
            >
                {(isError && buttonClicked) ? <span>Try again</span>
                    : <span>Send from wallet</span>}
            </ButtonWrapper>
        </>
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