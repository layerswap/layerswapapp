import { FC, useCallback, useEffect, useState } from "react";
import {
    useAccount,
    usePrepareSendTransaction,
    useSendTransaction,
    useWaitForTransaction,
    useNetwork,
    erc20ABI
} from "wagmi";
import { parseEther, createPublicClient, http, encodeFunctionData } from 'viem'
import SubmitButton from "../../../../buttons/submitButton";
import { PublishedSwapTransactionStatus } from "../../../../../lib/layerSwapApiClient";
import { useSwapDataUpdate } from "../../../../../context/swap";
import { toast } from "react-hot-toast";
import WalletIcon from "../../../../icons/WalletIcon";
import Modal from '../../../../modal/modal';
import MessageComponent from "../../../../MessageComponent";
import { BaseTransferButtonProps } from "./sharedTypes";
import TransactionMessage from "./transactionMessage";
import { ButtonWrapper } from "./buttons";

type TransferNativeTokenButtonProps = BaseTransferButtonProps & {
    chainId: number,
}

const TransferNativeTokenButton: FC<TransferNativeTokenButtonProps> = ({
    managedDepositAddress,
    chainId,
    amount,
    savedTransactionHash,
    swapId,
    userDestinationAddress,
    sequenceNumber
}) => {
    const [applyingTransaction, setApplyingTransaction] = useState<boolean>(!!savedTransactionHash)
    const { setSwapPublishedTx } = useSwapDataUpdate()
    const [buttonClicked, setButtonClicked] = useState(false)
    const [openChangeAmount, setOpenChangeAmount] = useState(false)
    const [estimatedGas, setEstimatedGas] = useState<bigint>()
    const { address } = useAccount();

    const depositAddress = managedDepositAddress

    const sendTransactionPrepare = usePrepareSendTransaction({
        to: depositAddress,
        value: amount ? parseEther(amount.toString()) : undefined,
        chainId: chainId,
    })

    let encodedData = depositAddress && encodeFunctionData({
        abi: erc20ABI,
        functionName: 'transfer',
        args: [
            depositAddress,
            amount ? parseEther(amount.toString()) : undefined,
        ]
    });

    if (address !== userDestinationAddress) {
        encodedData = encodedData ? `${encodedData}${sequenceNumber}` as `0x${string}` : null;
    }

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
            if (encodedData) {
                const gasEstimate = await publicClient.estimateGas({
                    account: address,
                    to: depositAddress,
                    data: encodedData,
                })
                setEstimatedGas(gasEstimate)
            }
        })()
    }, [address, encodedData, depositAddress, amount])

    useEffect(() => {
        try {
            if (transaction?.data?.hash) {
                setSwapPublishedTx(swapId, PublishedSwapTransactionStatus.Pending, transaction?.data?.hash)
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
            setSwapPublishedTx(swapId, PublishedSwapTransactionStatus.Completed, trxRcpt.transactionHash);
            setApplyingTransaction(false)
        },
        onError: async (err) => {
            setSwapPublishedTx(swapId, PublishedSwapTransactionStatus.Error, "");
            toast.error(err.message)
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
                    <div className='md:text-2xl text-lg font-bold text-white leading-6 text-center'>
                        Insufficient funds for gas
                    </div>
                    <div className="text-base font-medium space-y-6 text-primary-text text-center">
                        This transfer can't be processed because you don't have enough gas.
                    </div>
                </div>
                <div className="text-base">
                    You have requested swap with {amount}
                </div>
                <MessageComponent.Buttons>
                    <div className="flex flex-row text-white text-base space-x-2">
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