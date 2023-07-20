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
import { parseEther, parseUnits, BaseError, InsufficientFundsError, EstimateGasExecutionError, UserRejectedRequestError } from 'viem'
import { erc20ABI } from 'wagmi'
import SubmitButton from "../../../buttons/submitButton";
import FailIcon from "../../../icons/FailIcon";
import { PublishedSwapTransactionStatus, PublishedSwapTransactions } from "../../../../lib/layerSwapApiClient";
import { useSwapDataUpdate } from "../../../../context/swap";
import { toast } from "react-hot-toast";
import WalletIcon from "../../../icons/WalletIcon";
import usdtAbi from "../../../../lib/abis/usdt.json"

type Props = {
    chainId: number,
    generatedDepositAddress: `0x${string}`,
    managedDepositAddress: `0x${string}`,
    tokenContractAddress: `0x${string}`,
    userDestinationAddress: `0x${string}`,
    amount: number,
    tokenDecimals: number,
    networkDisplayName: string,
    swapId: string;
    asset: string;
}

const TransferFromWallet: FC<Props> = ({ networkDisplayName,
    chainId,
    generatedDepositAddress,
    managedDepositAddress,
    userDestinationAddress,
    amount,
    tokenContractAddress,
    tokenDecimals,
    swapId,
    asset
}) => {

    const { isConnected } = useAccount();
    const networkChange = useSwitchNetwork({
        chainId: chainId,
    });

    const { chain: activeChain } = useNetwork();

    const [savedTransactionHash, setSavedTransactionHash] = useState<string>()

    useEffect(() => {
        if (activeChain?.id === chainId)
            networkChange.reset()
    }, [activeChain, chainId])

    useEffect(() => {
        try {
            const data: PublishedSwapTransactions = JSON.parse(localStorage.getItem('swapTransactions') || "{}")
            const hash = data?.[swapId]?.hash
            if (hash)
                setSavedTransactionHash(hash)
        }
        catch (e) {
            //TODO log to logger
            console.error(e.message)
        }
    }, [swapId])

    if (!isConnected) {
        return <ConnectWalletButton />
    }
    else if (activeChain?.id !== chainId) {
        return <ChangeNetworkButton
            chainId={chainId}
            network={networkDisplayName}
        />
    }
    else if (tokenContractAddress) {
        return <TransferErc20Button
            asset={asset}
            swapId={swapId}
            amount={amount}
            generatedDepositAddress={generatedDepositAddress}
            managedDepositAddress={managedDepositAddress}
            userDestinationAddress={userDestinationAddress}
            savedTransactionHash={savedTransactionHash as `0x${string}`}
            tokenContractAddress={tokenContractAddress}
            tokenDecimals={tokenDecimals}
        />
    }
    else {
        return <TransferEthButton
            swapId={swapId}
            amount={amount}
            generatedDepositAddress={generatedDepositAddress}
            managedDepositAddress={managedDepositAddress}
            userDestinationAddress={userDestinationAddress}
            savedTransactionHash={savedTransactionHash as `0x${string}`}
            chainId={chainId}
        />
    }
}

type BaseTransferButtonProps = {
    swapId: string,
    generatedDepositAddress: `0x${string}`,
    managedDepositAddress: `0x${string}`,
    userDestinationAddress: `0x${string}`,
    amount: number,
    savedTransactionHash: `0x${string}`,
}

type TransferETHButtonProps = BaseTransferButtonProps & {
    chainId: number,
}

const TransferEthButton: FC<TransferETHButtonProps> = ({
    generatedDepositAddress,
    managedDepositAddress,
    userDestinationAddress,
    chainId,
    amount,
    savedTransactionHash,
    swapId,
}) => {
    const [applyingTransaction, setApplyingTransaction] = useState<boolean>(!!savedTransactionHash)
    const { mutateSwap, setSwapPublishedTx } = useSwapDataUpdate()
    const [buttonClicked, setButtonClicked] = useState(false)

    const { address } = useAccount();

    const depositAddress = userDestinationAddress === address ?
        managedDepositAddress : generatedDepositAddress

    const sendTransactionPrepare = usePrepareSendTransaction({
        to: depositAddress,
        value: amount ? parseEther(amount.toString()) : undefined,
        chainId: chainId,
    })
    const transaction = useSendTransaction(sendTransactionPrepare?.config)

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
    }, [transaction])

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
    </>
}

type TransferERC20ButtonProps = BaseTransferButtonProps & {
    tokenContractAddress: `0x${string}`,
    tokenDecimals: number,
    asset: string,
}
const TransferErc20Button: FC<TransferERC20ButtonProps> = ({
    generatedDepositAddress,
    managedDepositAddress,
    userDestinationAddress,
    amount,
    tokenContractAddress,
    tokenDecimals,
    savedTransactionHash,
    swapId,
    asset
}) => {
    const [applyingTransaction, setApplyingTransaction] = useState<boolean>(!!savedTransactionHash)
    const { mutateSwap, setSwapPublishedTx } = useSwapDataUpdate()
    const { address } = useAccount();
    const [buttonClicked, setButtonClicked] = useState(false)

    const depositAddress = userDestinationAddress === address ?
        managedDepositAddress : generatedDepositAddress

    const contractWritePrepare = usePrepareContractWrite({
        address: tokenContractAddress,
        abi: asset?.toUpperCase() == 'USDT' ? usdtAbi : erc20ABI,
        functionName: 'transfer',
        args: [depositAddress, parseUnits(amount.toString(), tokenDecimals)]
    });

    const contractWrite = useContractWrite(contractWritePrepare?.config)

    useEffect(() => {
        try {
            if (contractWrite?.data?.hash) {
                setSwapPublishedTx(swapId, PublishedSwapTransactionStatus.Pending, contractWrite?.data?.hash);
            }
        }
        catch (e) {
            //TODO log to logger
            console.error(e.message)
        }
    }, [contractWrite?.data?.hash, swapId])

    const clickHandler = useCallback(() => {
        setButtonClicked(true)
        return contractWrite?.write && contractWrite?.write()
    }, [contractWrite])

    const waitForTransaction = useWaitForTransaction({
        hash: contractWrite?.data?.hash || savedTransactionHash,
        onSuccess: async (trxRcpt) => {
            setApplyingTransaction(true)
            setSwapPublishedTx(swapId, PublishedSwapTransactionStatus.Completed, trxRcpt.transactionHash);
            setApplyingTransaction(false)
        }
    })

    const isError = [
        contractWritePrepare,
        waitForTransaction,
        contractWrite
    ].find(d => d.isError)

    const isLoading = [
        waitForTransaction,
        contractWrite
    ].find(d => d.isLoading)

    return <>
        {
            buttonClicked &&
            <TransactionMessage
                prepare={contractWritePrepare}
                transaction={contractWrite}
                wait={waitForTransaction}
                applyingTransaction={applyingTransaction}
            />
        }
        {
            !isLoading &&
            <ButtonWrapper
                clcikHandler={clickHandler}
                disabled={contractWritePrepare?.isLoading || contractWritePrepare.status === "idle"}
                icon={<WalletIcon className="stroke-2 w-6 h-6" />}
            >
                {(isError && buttonClicked) ? <span>Try again</span>
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
    const prepareResolvedError = resolveError(prepare?.error as BaseError)
    const transactionResolvedError = resolveError(transaction?.error as BaseError)
    const hasEror = prepare?.isError || transaction?.isError || wait?.isError

    if (wait?.isLoading || applyingTransaction) {
        return <TransactionInProgressMessage />
    }
    else if (transaction?.isLoading || applyingTransaction) {
        return <ConfirmTransactionMessage />
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
        const unexpectedError = prepare?.error
            || transaction?.error?.['data']?.message || transaction?.error
            || wait?.error
        return <UexpectedErrorMessage message={unexpectedError?.message} />
    }
    else return <></>
}

const PreparingTransactionMessage: FC = () => {
    return <WalletMessage
        status="pending"
        header='Preparing the transaction'
        details='Will be ready to sign in a couple of seconds' />
}

const ConfirmTransactionMessage: FC = () => {
    return <WalletMessage
        status="pending"
        header='Confirm in wallet'
        details='Please confirm the transaction in your wallet' />
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
        icon={<WalletIcon className="stroke-2 w-6 h-6" />}
    >
        Connect wallet
    </ButtonWrapper>
}

const ChangeNetworkMessage: FC<{ data: ActionData, network: string }> = ({ data, network }) => {
    if (data.isLoading) {
        return <WalletMessage
            status="pending"
            header='Network switch required'
            details="Confirm switching the network with your wallet"
        />
    }
    else if (data.isError) {
        return <WalletMessage
            status="error"
            header='Network switch failed'
            details={`Please try again or switch your wallet network manually to ${network}`}
        />
    }
}

const ChangeNetworkButton: FC<{ chainId: number, network: string }> = ({ chainId, network }) => {

    const networkChange = useSwitchNetwork({
        chainId: chainId,
    });

    const clickHandler = useCallback(() => {
        return networkChange?.switchNetwork()
    }, [networkChange])

    return <>
        {
            <ChangeNetworkMessage
                data={networkChange}
                network={network}
            />
        }
        {
            !networkChange.isLoading &&
            <ButtonWrapper
                clcikHandler={clickHandler}
                icon={<WalletIcon className="stroke-2 w-6 h-6" />}
            >
                {
                    networkChange.isError ? <span>Try again</span>
                        : <span>Send from wallet</span>
                }
            </ButtonWrapper>
        }
    </>
}

type ButtonWrapperProps = {
    icon?: ReactNode,
    clcikHandler: () => void,
    disabled?: boolean
}
const ButtonWrapper: FC<ButtonWrapperProps> = ({
    icon,
    clcikHandler,
    disabled,
    children
}) => {
    return <div>
        <div className="flex flex-row text-white text-base space-x-2">
            <SubmitButton icon={icon}
                text_align='center'
                isDisabled={disabled}
                isSubmitting={false}
                onClick={clcikHandler}
                buttonStyle='filled'
                size="medium">
                {children}
            </SubmitButton>
        </div>
    </div>
}

type ActionData = {
    error: Error | null;
    isError: boolean;
    isLoading: boolean;
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

const applyTransaction = async (swapId: string, trxId: string, setSwapPublishedTx: (swapId: string, status: PublishedSwapTransactionStatus, txHash: string) => void) => {
    setSwapPublishedTx(swapId, PublishedSwapTransactionStatus.Completed, trxId);
}
type ResolvedError = "insufficient_funds" | "transaction_rejected"

const resolveError = (error: BaseError): ResolvedError => {

    const isInsufficientFundsError = error?.walk((e: BaseError) => (e instanceof InsufficientFundsError)
        || (e instanceof EstimateGasExecutionError) || e?.['data']?.args?.some((a: string) => a?.includes("amount exceeds")))

    if (isInsufficientFundsError)
        return "insufficient_funds"

    const isUserRejectedRequestError = error?.walk((e: BaseError) => e instanceof UserRejectedRequestError) instanceof UserRejectedRequestError

    if (isUserRejectedRequestError)
        return "transaction_rejected"

    const code_name = error?.['code']
        || error?.["name"]
    const inner_code = error?.['data']?.['code']
        || error?.['cause']?.['code']
        || error?.["cause"]?.["cause"]?.["cause"]?.["code"]

    if (code_name === 'INSUFFICIENT_FUNDS'
        || code_name === 'UNPREDICTABLE_GAS_LIMIT'
        || (code_name === -32603 && inner_code === 3)
        || inner_code === -32000
        || code_name === 'EstimateGasExecutionError')
        return "insufficient_funds"
    else if (code_name === 4001) {
        return "transaction_rejected"
    }
}

export default TransferFromWallet
