import { FC, useCallback, useEffect, useState } from "react";
import {
    useAccount,
    usePrepareSendTransaction,
    useSendTransaction,
    useWaitForTransaction,
    useNetwork,
    erc20ABI
} from "wagmi";
import { parseEther, createPublicClient, http } from 'viem'
import SubmitButton from "../../../../buttons/submitButton";
import { PublishedSwapTransactionStatus } from "../../../../../lib/layerSwapApiClient";
import { toast } from "react-hot-toast";
import WalletIcon from "../../../../icons/WalletIcon";
import Modal from '../../../../modal/modal';
import MessageComponent from "../../../../MessageComponent";
import { BaseTransferButtonProps } from "./sharedTypes";
import TransactionMessage from "./transactionMessage";
import { ButtonWrapper } from "./buttons";
import { useSwapTransactionStore } from "../../../../store/zustandStore";

type TransferNativeTokenButtonProps = BaseTransferButtonProps & {
    chainId: number,
}

const TransferNativeTokenButton: FC<TransferNativeTokenButtonProps> = ({
    depositAddress,
    chainId,
    amount,
    savedTransactionHash,
    swapId,
    userDestinationAddress,
    sequenceNumber
}) => {
    const [applyingTransaction, setApplyingTransaction] = useState<boolean>(!!savedTransactionHash)
    const [buttonClicked, setButtonClicked] = useState(false)
    const [openChangeAmount, setOpenChangeAmount] = useState(false)
    const [estimatedGas, setEstimatedGas] = useState<bigint>()
    const { address } = useAccount();
    const { setSwapTransaction } = useSwapTransactionStore();

    const sendTransactionPrepare = usePrepareSendTransaction({
        to: depositAddress,
        value: amount ? parseEther(amount.toString()) : undefined,
        chainId: chainId,
    })
    const encodedData : `0x${string}` = address !== userDestinationAddress ? `0x${sequenceNumber}` : "0x"

    const tx = {
        to: depositAddress,
        value: amount ? parseEther(amount?.toString()) : undefined,
        gas: estimatedGas,
        data: encodedData
    }

    const transaction = useSendTransaction(tx)

    const { chain } = useNetwork();

    const publicClient = createPublicClient({
        chain: chain,
        transport: http()
    })

    useEffect(() => {
        (async () => {
            const gasEstimate = await publicClient.estimateGas({
                account: address,
                to: depositAddress,
                data: encodedData,
            })
            setEstimatedGas(gasEstimate)
        })()
    }, [address, encodedData, depositAddress, amount])

    useEffect(() => {
        try {
            if (transaction?.data?.hash) {
                setSwapTransaction(swapId, PublishedSwapTransactionStatus.Pending, transaction?.data?.hash)
            }
        }
        catch (e) {
            //TODO log to logger
            console.error(e.message)
        }
    }, [transaction?.data?.hash, swapId])

    const waitForTransaction = useWaitForTransaction({
        hash: transaction?.data?.hash || savedTransactionHash,
        onSuccess: async (trxRcpt) => {
            setApplyingTransaction(true)
            setSwapTransaction(swapId, PublishedSwapTransactionStatus.Completed, trxRcpt.transactionHash);
            setApplyingTransaction(false)
        },
        onError: async (err) => {
            setSwapTransaction(swapId, PublishedSwapTransactionStatus.Error, "", err.message);
        }
    })

    const clickHandler = useCallback(async () => {
        setButtonClicked(true)
        return transaction?.sendTransaction && transaction?.sendTransaction()
    }, [transaction, estimatedGas])

    const isError = [
        sendTransactionPrepare,
        transaction,
        waitForTransaction
    ].find(d => d.isError)

    const isLoading = [
        transaction,
        waitForTransaction
    ].find(d => d.isLoading)

    return <>
        {
            buttonClicked &&
            <TransactionMessage
                prepare={sendTransactionPrepare}
                transaction={transaction}
                wait={waitForTransaction}
                applyingTransaction={applyingTransaction}
            />
        }
        {
            !isLoading &&
            <ButtonWrapper
                clcikHandler={clickHandler}
                disabled={sendTransactionPrepare?.isLoading || sendTransactionPrepare.status === "idle"}
                icon={<WalletIcon className="stroke-2 w-6 h-6" />}
            >
                {(isError && buttonClicked) ? <span>Try again</span>
                    : <span>Send from wallet</span>}
            </ButtonWrapper>
        }
        <Modal
            height="80%"
            show={openChangeAmount}
            setShow={setOpenChangeAmount}
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

export default TransferNativeTokenButton