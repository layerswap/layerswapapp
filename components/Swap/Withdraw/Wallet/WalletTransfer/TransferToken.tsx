import { FC, useCallback, useEffect, useState } from "react";
import {
    useAccount,
    useSendTransaction,
    useWaitForTransaction,
    useNetwork,
} from "wagmi";
import { createPublicClient, http } from 'viem'
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
    const { address } = useAccount();
    const { setSwapTransaction } = useSwapTransactionStore();
    const { swapPrepareData } = useSwapDataState()

    const callData = swapPrepareData?.deposit_actions?.find(da => da.type == 'transfer')?.call_data

    const tx = {
        to: depositAddress,
        gas: estimatedGas,
        data: callData
    }

    const transaction = useSendTransaction(tx)

    const { chain } = useNetwork();

    const publicClient = createPublicClient({
        chain: chain,
        transport: http()
    })

    useEffect(() => {
        (async () => {
            if (address && depositAddress) {
                const gasEstimate = await publicClient.estimateGas({
                    account: address,
                    to: depositAddress,
                    data: callData,
                })
                setEstimatedGas(gasEstimate)
            }
        })()
    }, [address, callData, depositAddress, amount])

    useEffect(() => {
        try {
            if (transaction?.data?.hash && transaction?.data?.hash as `0x${string}`) {
                setSwapTransaction(swapId, BackendTransactionStatus.Pending, transaction?.data?.hash)
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
            setSwapTransaction(swapId, BackendTransactionStatus.Completed, trxRcpt.transactionHash);
            setApplyingTransaction(false)
        },
        onError: async (err) => {
            if (transaction?.data?.hash)
                setSwapTransaction(swapId, BackendTransactionStatus.Failed, transaction?.data?.hash, err.message);
        }
    })

    const clickHandler = useCallback(async () => {
        setButtonClicked(true)

        return transaction?.sendTransaction && transaction?.sendTransaction()
    }, [transaction, estimatedGas])

    const isError = [
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
                transaction={transaction}
                wait={waitForTransaction}
                applyingTransaction={applyingTransaction}
            />
        }
        {
            !isLoading &&
            <>
                <ButtonWrapper
                    clcikHandler={clickHandler}
                    // disabled={sendTransactionPrepare?.isLoading || !isContractWallet?.ready}
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