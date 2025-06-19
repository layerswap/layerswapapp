import { FC, useCallback, useState } from "react";
import {
    useAccount,
    useConfig,
} from "wagmi";
import { parseEther } from 'viem'
import SubmitButton from "@/components/buttons/submitButton";
import WalletIcon from "@/components/icons/WalletIcon";
import Modal from '@/components/modal/modal';
import MessageComponent from "@/components/MessageComponent";
import { ActionData, TransferProps, WithdrawPageProps } from "../../Common/sharedTypes";
import TransactionMessage from "./transactionMessage";
import { SendTransactionButton } from "../../Common/buttons";
import { useSwapDataState } from "@/context/swap";
import { datadogRum } from "@datadog/browser-rum";
import { isMobile } from "@/lib/openLink";
import { sendTransaction } from '@wagmi/core'

const TransferTokenButton: FC<{ savedTransactionHash?: string, chainId?: number }> = ({
    savedTransactionHash,
    chainId
}) => {
    const [buttonClicked, setButtonClicked] = useState(false)
    const config = useConfig()
    const { selectedSourceAccount } = useSwapDataState()
    const [error, setError] = useState<any | undefined>()
    const [loading, setLoading] = useState(false)

    const { address } = useAccount();

    const clickHandler = useCallback(async ({ amount, callData, depositAddress, swapId }: TransferProps) => {
        setButtonClicked(true)
        setError(undefined)
        setLoading(true)
        try {
            if (!depositAddress)
                throw new Error('Missing deposit address')
            if (amount == undefined)
                throw new Error('Missing amount')
            if (!selectedSourceAccount?.address)
                throw new Error('No selected account')
            const tx = {
                chainId,
                to: depositAddress as `0x${string}`,
                value: parseEther(amount?.toString()),
                data: callData as `0x${string}`,
                account: selectedSourceAccount.address as `0x${string}`
            }
            if (isMobile() && selectedSourceAccount.wallet.metadata?.deepLink) {
                window.location.href = selectedSourceAccount.wallet.metadata?.deepLink
                await new Promise(resolve => setTimeout(resolve, 100))
            }
            const hash = await sendTransaction(config, tx)

            if (hash) {
                return hash
            }

        } catch (e) {
            setError(e)
            const error = new Error(e)
            error.name = "TransferTokenError"
            error.cause = e
            datadogRum.addError(error);
        } finally {
            setLoading(false)
        }
    }, [config, chainId])

    const transaction: ActionData = {
        error: error,
        isError: !!error,
        isPending: loading,
    }

    return <div className="w-full space-y-3 flex flex-col justify-between h-full text-primary-text">
        {
            buttonClicked &&
            <TransactionMessage
                transaction={transaction}
                applyingTransaction={!!savedTransactionHash}
                activeAddress={address}
                selectedSourceAddress={selectedSourceAccount?.address}
            />
        }
        {
            !loading &&
            <SendTransactionButton
                onClick={clickHandler}
                icon={<WalletIcon className="stroke-2 w-6 h-6" />}
                error={!!error && buttonClicked}
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
