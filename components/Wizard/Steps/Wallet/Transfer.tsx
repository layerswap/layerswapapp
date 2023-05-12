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
import { utils } from 'ethers';
import { erc20ABI } from 'wagmi'
import { Wallet } from "lucide-react";
import SubmitButton from "../../../buttons/submitButton";
import FailIcon from "../../../icons/FailIcon";
import { error } from "console";
import LayerSwapApiClient from "../../../../lib/layerSwapApiClient";
import { useSwapDataUpdate } from "../../../../context/swap";

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

    const { chain: activeChain } = useNetwork();

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

    useEffect(() => {
        if (activeChain?.id === chainId)
            networkChange.reset()
    }, [activeChain, chainId])

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
        try {
            const data: SwapTransactions = JSON.parse(localStorage.getItem('swapTransactions') || "{}")
            const hash = data?.[swapId]?.hash
            if (hash)
                setSavedTransactionHash(hash)
        }
        catch (e) {
            //TODO log to logger
            console.error(e.message)
        }
    }, [swapId])

    useEffect(() => {
        try {
            if (contractWrite?.data?.hash || transaction?.data?.hash) {
                const oldData = JSON.parse(localStorage.getItem('swapTransactions') || "{}")
                localStorage.setItem('swapTransactions', JSON.stringify({ ...oldData, [swapId]: { hash: contractWrite?.data?.hash || transaction?.data?.hash } }))
            }
        }
        catch (e) {
            //TODO log to logger
            console.error(e.message)
        }
    }, [contractWrite?.data?.hash, transaction?.data?.hash, swapId])

    const inSuccessfullyTransferred = (transactionHash: string) => {

    }

    if (!isConnected) {
        return <ConnectWalletButton />
    }
    else if (activeChain?.id !== chainId) {
        return <ChangeNetworkButton chainId={chainId} />
    }
    else if (tokenContractAddress) {
        return <TransferErc20Button
            swapId={swapId}
            amount={amount}
            depositAddress={depositAddress}
            savedTransactionHash={savedTransactionHash as `0x${string}`}
            tokenContractAddress={tokenContractAddress}
            tokenDecimals={tokenDecimals}
        />
    }
    else {
        return <TransferEthButton
            swapId={swapId}
            amount={amount}
            depositAddress={depositAddress}
            savedTransactionHash={savedTransactionHash as `0x${string}`}
            chainId={chainId}
        />
    }
}

type TransferWithWalletButtonProps = {
    chainId: number,
    chnageNetwork: () => void,
    transfer: () => void,
    icon?: ReactNode,
    refetchPrepareTransaction: () => void,
    refetchPrepareContractWrite: () => void,
    onButtonClick: () => void,
    activeChainId: number;
    prepareIsError: boolean
}

const TransferWithWalletButton: FC<TransferWithWalletButtonProps> = ({
    refetchPrepareTransaction,
    refetchPrepareContractWrite,
    onButtonClick, icon,
    chnageNetwork,
    transfer,
    activeChainId,
    prepareIsError,
    chainId,
    children }) => {

    const { isConnected, connector } = useAccount();
    const handlerType = getTransferWithWalletButtonHandlerType({
        prepareIsError,
        connected: isConnected,
        connectedChainId: activeChainId,
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

type BaseTransferButtonProps = {
    swapId: string,
    depositAddress: `0x${string}`,
    amount: number,
    savedTransactionHash: `0x${string}`,
}

type TransferETHButtonProps = BaseTransferButtonProps & {
    chainId: number,
}

const TransferEthButton: FC<TransferETHButtonProps> = ({
    chainId,
    depositAddress,
    amount,
    savedTransactionHash,
    swapId,
}) => {
    const [applyingTransaction, setApplyingTransaction] = useState<boolean>(!!savedTransactionHash)
    const { mutateSwap } = useSwapDataUpdate()

    const sendTransactionPrepare = usePrepareSendTransaction({
        enabled: true,
        request: {
            to: depositAddress,
            value: amount ? utils.parseEther(amount.toString()) : undefined,
        },
        chainId: chainId,
    })
    const transaction = useSendTransaction(sendTransactionPrepare?.config)

    useEffect(() => {
        try {
            if (transaction?.data?.hash) {
                const oldData = JSON.parse(localStorage.getItem('swapTransactions') || "{}")
                localStorage.setItem('swapTransactions', JSON.stringify({ ...oldData, [swapId]: { hash: transaction?.data?.hash } }))
            }
        }
        catch (e) {
            //TODO log to logger
            console.error(e.message)
        }
    }, [transaction?.data?.hash, swapId])

    const clickHandler = useCallback(() => {
        return transaction?.sendTransaction()
    }, [transaction])

    const waitForTransaction = useWaitForTransaction({
        hash: transaction?.data?.hash || savedTransactionHash,
        onSuccess: async (trxRcpt) => {
            setApplyingTransaction(true)
            await applyTransaction(swapId, trxRcpt.transactionHash)
            await mutateSwap()
            setApplyingTransaction(false)
        }
    })

    const isError = [
        sendTransactionPrepare,
        transaction,
        waitForTransaction
    ].find(d => d.isError)

    return <>
        {
            <TransactionMessage
                prepare={sendTransactionPrepare}
                transaction={transaction}
                wait={waitForTransaction}
                applyingTransaction={applyingTransaction}
            />
        }
        {
            <ButtonWrapper
                clcikHandler={clickHandler}
                icon={<Wallet />}
            >
                {isError ? <span>Try again</span>
                    : <span>Send from wallet</span>}
            </ButtonWrapper>
        }
    </>
}

type TransferERC20ButtonProps = BaseTransferButtonProps & {
    tokenContractAddress: `0x${string}`,
    tokenDecimals: number,
}

const TransferErc20Button: FC<TransferERC20ButtonProps> = ({
    depositAddress,
    amount,
    tokenContractAddress,
    tokenDecimals,
    savedTransactionHash,
    swapId
}) => {
    const [applyingTransaction, setApplyingTransaction] = useState<boolean>(!!savedTransactionHash)
    const { mutateSwap } = useSwapDataUpdate()

    const contractWritePrepare = usePrepareContractWrite({
        address: tokenContractAddress,
        abi: erc20ABI,
        functionName: 'transfer',
        enabled: true,
        args: [depositAddress, utils.parseUnits(amount.toString(), tokenDecimals)]
    });
    const contractWrite = useContractWrite(contractWritePrepare?.config)

    const clickHandler = useCallback(() => {
        return contractWrite?.write()
    }, [contractWrite])

    const waitForTransaction = useWaitForTransaction({
        hash: contractWrite?.data?.hash || savedTransactionHash,
        onSuccess: async (trxRcpt) => {
            setApplyingTransaction(true)
            await applyTransaction(swapId, trxRcpt.transactionHash)
            await mutateSwap()
            setApplyingTransaction(false)
        }
    })

    const isError = [
        contractWritePrepare,
        waitForTransaction,
        contractWrite
    ].find(d => d.isError)

    return <>
        {
            <TransactionMessage
                prepare={contractWritePrepare}
                transaction={contractWrite}
                wait={waitForTransaction}
                applyingTransaction={applyingTransaction}
            />
        }
        {
            <ButtonWrapper
                clcikHandler={clickHandler}
                icon={<Wallet />}
            >
                {isError ? <span>Try again</span>
                    : <span>Send from wallet</span>}
            </ButtonWrapper>
        }
    </>
}

type TransactionMessageProps = {
    prepare: ActionData,
    wait: ActionData,
    transaction: ActionData,
    applyingTransaction: boolean,
}

const TransactionMessage: FC<TransactionMessageProps> = ({
    prepare, wait, transaction, applyingTransaction
}) => {
    const prepareErrorCode = prepare?.error?.['code'] || prepare?.error?.["name"]
    const prepareResolvedError = resolveError(prepareErrorCode)

    const transactionResolvedError = resolveError(transaction?.['code'])

    const hasEror = prepare?.isError || transaction?.isError || wait?.isError

    if (wait?.isLoading || applyingTransaction) {
        return <TransactionInProgressMessage />
    }
    else if (prepare?.isLoading) {
        return <PreparingTransactionMessage />
    }
    else if (prepare?.isError && prepareResolvedError === "insufficient_funds") {
        return <InsufficientFundsMessage />
    }
    else if (transaction?.isError && transactionResolvedError) {
        return <TransactionRejectedMessage />
    } else if (hasEror) {
        const unexpectedError = prepare?.error || transaction?.error || wait?.error
        return <UexpectedErrorMessage message={unexpectedError?.message} />
    }
    else return <></>
}
const applyTransaction = async (swapId: string, trxId: string) => {
    const layerSwapApiClient = new LayerSwapApiClient()
    await layerSwapApiClient.ApplyNetworkInput(swapId, trxId)
}
type ResolvedError = "insufficient_funds" | "transaction_rejected"

const resolveError = (errorCode: string | number): ResolvedError => {
    if (errorCode === 'INSUFFICIENT_FUNDS'
        || errorCode === 'UNPREDICTABLE_GAS_LIMIT'
        || (errorCode === -32603 && errorCode?.['data']?.['code'] === -32000))
        return "insufficient_funds"
    else if (errorCode === 4001) {
        return "transaction_rejected"
    }
}

const PreparingTransactionMessage: FC = () => {
    return <WalletMessage
        status="pending"
        header='Preparing the transaction'
        details='Will be ready to sign in a couple of seconds' />
}

const TransactionInProgressMessage: FC = () => {
    return <WalletMessage
        status="pending"
        header='Transaction in progress'
        details='Waiting for your transaction to be published' />
}

const InsufficientFundsMessage: FC = () => {
    return <WalletMessage
        status="error"
        header='Insufficient funds'
        details='The balance of the connected wallet is not enough' />
}

const TransactionRejectedMessage: FC = () => {
    return <WalletMessage
        status="error"
        header='Transaction rejected'
        details={`You've rejected the transaction in your wallet. Click “Try again” to open the prompt again.`} />
}

const UexpectedErrorMessage: FC<{ message: string }> = ({ message }) => {
    return <WalletMessage
        status="error"
        header='Unexpected error'
        details={message} />
}

const ConnectWalletButton: FC = ({ children }) => {
    const { openConnectModal } = useConnectModal();

    const clickHandler = useCallback(() => {
        return openConnectModal()
    }, [openConnectModal])

    return <ButtonWrapper
        clcikHandler={clickHandler}
        icon={<Wallet />}
    >
        Send from wallet
    </ButtonWrapper>
}

const ChangeNetworkButton: FC<{ chainId: number }> = ({ chainId, children }) => {

    const networkChange = useSwitchNetwork({
        chainId: chainId,
    });

    const clickHandler = useCallback(() => {
        return networkChange?.switchNetwork()
    }, [networkChange])

    return <ButtonWrapper
        clcikHandler={clickHandler}
        icon={<Wallet />}
    >
        Send from wallet
    </ButtonWrapper>
}

type ButtonWrapperProps = {
    icon?: ReactNode,
    clcikHandler: () => void,
}
const ButtonWrapper: FC<ButtonWrapperProps> = ({
    icon,
    clcikHandler,
    children
}) => {
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
    ButtonClicked?: boolean,
    chainIsCorrect?: boolean
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
    chainIsCorrect,
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
                Details: 'Please confirm the transaction in your wallet'
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
        const error_code = error?.['code'] || error?.["name"]
        if (error_code === 'INSUFFICIENT_FUNDS'
            || error_code === 'UNPREDICTABLE_GAS_LIMIT'
            || (error_code === -32603 && error?.['data']?.['code'] === -32000)) {
            return {
                ButtonText: "Try again",
                Status: "error",
                Message: {
                    Header: 'Insufficient funds',
                    Details: 'The balance of the connected wallet is not enough'
                }
            }
        }
        if (error_code === 'NETWORK_ERROR' || error_code === "ChainMismatchError") {
            return {
                ButtonText: `Switch to ${Network}`,
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
                    Details: `You've rejected the transaction in your wallet. Click “Try again” to open the prompt again.`
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
        <div className="text-left space-y-1">
            <p className="text-md font-semibold self-center text-white">
                {header}
            </p>
            <p className="text-sm text-primary-text">
                {details}
            </p>
        </div>
    </div>
}

export default TransferFromWallet