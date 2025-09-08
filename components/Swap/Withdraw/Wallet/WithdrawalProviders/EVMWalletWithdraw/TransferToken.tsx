import { FC, useCallback, useMemo, useState } from "react";
import {
    useConfig,
} from "wagmi";
import { parseEther } from 'viem'
import WalletIcon from "@/components/icons/WalletIcon";
import { ActionData, TransferProps } from "../../Common/sharedTypes";
import TransactionMessage from "./transactionMessage";
import { SendTransactionButton } from "../../Common/buttons";
import { isMobile } from "@/lib/openLink";
import { sendTransaction } from '@wagmi/core'
import { SwapBasicData } from "@/lib/apiClients/layerSwapApiClient";
import useWallet from "@/hooks/useWallet";

type Props = {
    savedTransactionHash?: string;
    chainId?: number;
    swapData: SwapBasicData,
    refuel: boolean,
    handleClearAmount?: () => void
}
const TransferTokenButton: FC<Props> = ({
    savedTransactionHash,
    chainId,
    swapData,
    refuel,
    handleClearAmount
}) => {
    const [buttonClicked, setButtonClicked] = useState(false)
    const config = useConfig()
    const [error, setError] = useState<any | undefined>()
    const [loading, setLoading] = useState(false)

    const { provider } = useWallet(swapData.source_network, "withdrawal")
    const selectedSourceAccount = useMemo(() => provider?.activeWallet, [provider]);

    const clickHandler = useCallback(async ({ amount, callData, depositAddress, handleClearAmount }: TransferProps) => {
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
                gas: undefined,
                data: callData as `0x${string}`,
                account: selectedSourceAccount.address as `0x${string}`
            }
            if (isMobile() && selectedSourceAccount?.metadata?.deepLink) {
                window.location.href = selectedSourceAccount.metadata?.deepLink
                await new Promise(resolve => setTimeout(resolve, 100))
            }
            const hash = await sendTransaction(config, tx)

            if (hash) {
                handleClearAmount?.()
                return hash
            }

        } catch (e) {
            setLoading(false)
            setError(e)

            throw e
        }
    }, [config, chainId, selectedSourceAccount?.address])

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
                activeAddress={selectedSourceAccount?.address}
                selectedSourceAddress={selectedSourceAccount?.address}
            />
        }
        {
            !loading &&
            <SendTransactionButton
                onClick={(args) => clickHandler({ ...args, handleClearAmount })}
                icon={<WalletIcon className="stroke-2 w-6 h-6" />}
                error={!!error && buttonClicked}
                swapData={swapData}
                refuel={refuel}
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
