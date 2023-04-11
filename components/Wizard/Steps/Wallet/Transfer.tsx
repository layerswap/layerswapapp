import { useConnectModal } from "@rainbow-me/rainbowkit";
import { FC, ReactNode, useCallback, useEffect, useState } from "react";
import {
    useAccount,
    useContractWrite,
    usePrepareContractWrite,
    usePrepareSendTransaction,
    useSendTransaction,
    useSwitchNetwork,
    useWaitForTransaction,
    useNetwork
} from "wagmi";
import { BigNumber, utils } from 'ethers';
import { erc20ABI } from 'wagmi'
import { ArrowUpDown, Wallet, RefreshCw } from "lucide-react";
import SubmitButton from "../../../buttons/submitButton";
import FailIcon from "../../../icons/FailIcon";

type Props = {
    chainId: number,
    depositAddress: `0x${string}`,
    tokenContractAddress: `0x${string}`,
    amount: number,
    tokenDecimals: number,
    onTransferComplete: (transactionHash: string) => Promise<void>,
    networkDisplayName: string,
    swapId: string;
}

const TransferFromWallet: FC<Props> = ({ networkDisplayName,
    chainId,
    depositAddress,
    amount,
    tokenContractAddress,
    tokenDecimals,
    swapId,
    onTransferComplete
}) => {

    const { isConnected, isDisconnected, connector, address } = useAccount();
    const networkChange = useSwitchNetwork({
        chainId: chainId,
    });

    const [transactionDetected, setTransactionDetected] = useState<boolean>()
    const [savedTransactionHash, setSavedTransactionHash] = useState<string>()
    const [buttonClicked, setButtonClicked] = useState<boolean>()
    const transactionPrepareEnabled = isConnected && !!!tokenContractAddress
    const sendTransactionPrepare = usePrepareSendTransaction({
        enabled: transactionPrepareEnabled,
        request: {
            to: depositAddress,
            value: amount ? utils.parseEther(amount.toString()) : undefined,
        },
        chainId: chainId,
    })

    const transaction = useSendTransaction(sendTransactionPrepare?.config)
    const contractPrepareEnabled = isConnected && !!tokenContractAddress
    const contractWritePrepare = usePrepareContractWrite({
        address: tokenContractAddress,
        abi: erc20ABI,
        functionName: 'transfer',
        enabled: contractPrepareEnabled,
        args: [depositAddress, utils.parseUnits(amount.toString(), tokenDecimals)]
    });
    const contractWrite = useContractWrite(contractWritePrepare?.config)

    const waitForTransaction = useWaitForTransaction({
        hash: contractWrite?.data?.hash || transaction?.data?.hash || savedTransactionHash as `0x${string}`,
        onSuccess: async (trxRcpt) => {
            setTransactionDetected(false)
            await onTransferComplete(trxRcpt.transactionHash)
            setTransactionDetected(true)
        }
    })

    useEffect(() => {
        const data: SwapTransactions = JSON.parse(localStorage.getItem('swapTransactions') || "{}")
        const hash = data?.[swapId]?.hash
        if (hash)
            setSavedTransactionHash(hash)
    }, [swapId])

    useEffect(() => {
        if (contractWrite?.data?.hash || transaction?.data?.hash) {
            const oldData = JSON.parse(localStorage.getItem('swapTransactions') || "{}")
            localStorage.setItem('swapTransactions', { ...oldData, [swapId]: { hash: contractWrite?.data?.hash || transaction?.data?.hash } })
        }
    }, [contractWrite?.data?.hash, transaction?.data?.hash, swapId])

    const handleTransfer = useCallback(() => {
        if (typeof contractWrite?.write === 'function')
            return contractWrite.write()
        if (typeof transaction?.sendTransaction === 'function')
            return transaction.sendTransaction()
    }, [transaction, contractWrite])

    const handleButtonClick = () => {
        setButtonClicked(true)
    }
    const actionMessage = getActionsMessages({
        networkChange,
        sendTransactionPrepare: transactionPrepareEnabled ? sendTransactionPrepare : null,
        transaction,
        contractWritePrepare: contractPrepareEnabled ? contractWritePrepare : null,
        contractWrite,
        ButtonClicked: buttonClicked,
        waitForTransaction,
        Network: networkDisplayName,
        transactionDetected
    })

    return <>
        {
            actionMessage?.Message &&
            <div>
                <WalletMessage
                    status={actionMessage.Status}
                    header={actionMessage.Message.Header}
                    details={actionMessage.Message.Details} />
            </div>
        }
        {
            actionMessage?.ButtonText &&
            <TransferWithWalletButton
                chainId={chainId}
                chnageNetwork={networkChange?.switchNetwork}
                transfer={handleTransfer}
                icon={actionMessage?.ButtonIcon}
                onButtonClick={handleButtonClick}
                refetchPrepareTransaction={sendTransactionPrepare?.refetch}
                refetchPrepareContractWrite={contractWritePrepare?.refetch}
                prepareIsError={(sendTransactionPrepare?.isError && transactionPrepareEnabled)
                    || (contractWritePrepare?.isError && contractPrepareEnabled)}
            >
                {actionMessage?.ButtonText}
            </TransferWithWalletButton>
        }
    </>
}


type TransferWithWalletButtonProps = {
    chainId: number,
    chnageNetwork: () => void,
    transfer: () => void,
    icon?: ReactNode,
    refetchPrepareTransaction: () => void,
    refetchPrepareContractWrite: () => void,
    onButtonClick: () => void,
    prepareIsError: boolean
}
const TransferWithWalletButton: FC<TransferWithWalletButtonProps> = ({
    refetchPrepareTransaction,
    refetchPrepareContractWrite,
    onButtonClick, icon,
    chnageNetwork,
    transfer,
    prepareIsError,
    chainId,
    children }) => {

    const { isConnected, connector } = useAccount();
    const { chain: activeChain } = useNetwork();

    const handlerType = getTransferWithWalletButtonHandlerType({
        prepareIsError,
        connected: isConnected,
        connectedChainId: activeChain?.id,
        chainId: chainId
    })

    const { openConnectModal } = useConnectModal();

    const clcikHandler = useCallback(() => {
        onButtonClick()
        switch (handlerType) {
            case ButtonHandler.Connect:
                return openConnectModal()
            case ButtonHandler.ChangeNetwork:
                return chnageNetwork()
            case ButtonHandler.RefetchPrepare:
                return (() => { refetchPrepareTransaction(); refetchPrepareContractWrite() })()
            case ButtonHandler.Transfer:
                return transfer()
        }
    }, [handlerType, openConnectModal, chnageNetwork, transfer, onButtonClick])

    return <div>
        <div className="flex flex-row text-white text-base space-x-2">
            <SubmitButton icon={icon}
                text_align='center'
                isDisabled={false}
                isSubmitting={false}
                onClick={clcikHandler}
                buttonStyle='filled'
                size="medium">
                {children}
            </SubmitButton>
        </div>
    </div>
}

type SwapTransactions = {
    [key: string]: {
        hash: string
    }
}

type ActionData = {
    error: Error | null;
    isError: boolean;
    isLoading: boolean;
}
type GetActionsMessageProps = {
    networkChange?: ActionData,
    sendTransactionPrepare?: ActionData,
    transaction?: ActionData,
    contractWritePrepare?: ActionData,
    contractWrite?: ActionData,
    waitForTransaction?: ActionData,
    transactionDetected: boolean,
    Network?: string,
    ButtonClicked?: boolean
}
type GetActionsMessageRes = {
    ButtonText?: string;
    Message?: {
        Header?: string;
        Details?: string;
    }
    ButtonIcon?: ReactNode,
    Status?: 'error' | 'pending'
}

const getActionsMessages = ({ networkChange,
    contractWrite,
    transaction,
    Network,
    ButtonClicked,
    waitForTransaction,
    transactionDetected,
    sendTransactionPrepare,
    contractWritePrepare }: GetActionsMessageProps): GetActionsMessageRes => {

    if (waitForTransaction?.isLoading || transactionDetected) {
        return {
            Status: "pending",
            Message: {
                Header: 'Transaction in progress',
                Details: 'Waiting for your transaction to be published'
            }
        }
    }

    if (!ButtonClicked)
        return {
            ButtonText: "Send from wallet",
            ButtonIcon: <Wallet />
        }

    if (networkChange?.isLoading) {
        return {
            Status: "pending",
            Message: {
                Header: 'Network switch required',
                Details: 'Confirm switching the network with your wallet'
            }
        }
    }

    if (transaction?.isLoading || contractWrite?.isLoading) {
        return {
            Status: "pending",
            Message: {
                Header: 'Confirm in wallet',
                Details: 'Please sign the transction with your wallet'
            }
        }
    }

    if (networkChange?.isError) {
        return {
            ButtonText: 'Try again',
            Status: "error",
            Message: {
                Header: 'Network switch failed',
                Details: `Please try again or switch your wallet network manually to ${Network}`
            }
        }
    }



    if (contractWritePrepare?.isLoading || sendTransactionPrepare?.isLoading) {
        return {
            Status: "pending",
            Message: {
                Header: 'Preparing the transaction',
                Details: 'Will be ready to sign in a couple of seconds'
            }
        }
    }

    if (contractWritePrepare?.isError || sendTransactionPrepare?.isError) {
        const error = contractWritePrepare?.error || sendTransactionPrepare?.error
        const error_code = error?.['code']
        if (error_code === 'INSUFFICIENT_FUNDS' || error_code === 'UNPREDICTABLE_GAS_LIMIT') {
            return {
                ButtonText: "Try again",
                Status: "error",
                Message: {
                    Header: 'Insufficient funds',
                    Details: 'The balance of the connected wallet is not enough'
                }
            }
        }
    }

    if (transaction?.isError || contractWrite?.isError) {
        const error = transaction?.error || contractWrite?.error
        const error_code = error?.['code']
        if (error_code === 4001)
            return {
                ButtonText: "Try again",
                Status: "error",
                Message: {
                    Header: 'Transaction rejected',
                    Details: 'You’ve rejected signing the transaction in your wallet. Hit Try again to open the prompt again'
                }
            }
    }

    const isError = contractWritePrepare?.isError
        || sendTransactionPrepare?.isError
        || waitForTransaction?.isError
        || transaction?.isError
        || contractWrite?.isError

    if (isError) {
        const error = contractWritePrepare?.error
            || sendTransactionPrepare?.error
            || waitForTransaction?.error
            || transaction?.error
            || contractWrite?.error
        return {
            ButtonIcon: <RefreshCw />,
            ButtonText: "Try again",
            Status: "error",
            Message: {
                Header: 'Unexpected error',
                Details: error.message
            }
        }
    }
    return {
        ButtonText: "Send from wallet",
        ButtonIcon: <Wallet />
    }
}


enum ButtonHandler {
    Connect,
    ChangeNetwork,
    RefetchPrepare,
    Transfer
}

const getTransferWithWalletButtonHandlerType = ({ prepareIsError, connected, connectedChainId, chainId }:
    { prepareIsError: boolean, connected: boolean, connectedChainId: number, chainId: number }): ButtonHandler => {

    if (!connected)
        return ButtonHandler.Connect
    else if (connectedChainId !== chainId)
        return ButtonHandler.ChangeNetwork
    else if (prepareIsError)
        return ButtonHandler.RefetchPrepare
    else
        return ButtonHandler.Transfer
}
type WalletMessageProps = {
    header: string;
    details?: string;
    status: 'pending' | 'error'
}
const WalletMessage: FC<WalletMessageProps> = ({ header, details, status }) => {
    return <div className="flex text-center mb-2 space-x-2">
        <div className='relative'>
            {
                status === "error" ?
                    <FailIcon className="relative top-0 left-0 w-6 h-6 md:w-7 md:h-7" />
                    :
                    <>
                        <div className='absolute top-1 left-1 w-4 h-4 md:w-5 md:h-5 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                        <div className='absolute top-2 left-2 w-2 h-2 md:w-3 md:h-3 opacity-40 bg bg-primary rounded-full animate-ping'></div>
                        <div className='relative top-0 left-0 w-6 h-6 md:w-7 md:h-7 scale-50 bg bg-primary rounded-full '></div>
                    </>
            }
        </div>
        <p className="text-left space-y-1">
            <h3 className="text-md font-semibold self-center text-white">
                {header}
            </h3>
            <p className="text-sm text-primary-text">
                {details}
            </p>
        </p>
    </div>
}

export default TransferFromWallet