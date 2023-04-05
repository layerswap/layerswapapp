import { AuthenticationStatus, ConnectButton } from "@rainbow-me/rainbowkit";
import { FC, useCallback, useEffect, useState } from "react";
import { useAccount, useContractWrite, usePrepareContractWrite, usePrepareSendTransaction, useSendTransaction, useSwitchNetwork, useWaitForTransaction } from "wagmi";
import SubmitButton from "../../../buttons/submitButton";
import { BigNumber, utils } from 'ethers';
import { erc20ABI } from 'wagmi'

type Props = {
    chainId: number,
    depositAddress: `0x${string}`,
    tokenContractAddress: `0x${string}`,
    amount: number,
    tokenDecimals: number,
    onTransferComplete: (transactionHash: string) => Promise<void>
}

const TransferFromWallet: FC<Props> = ({ chainId, depositAddress, amount, tokenContractAddress, tokenDecimals, onTransferComplete }) => {
    const { isConnected, isDisconnected, connector, address } = useAccount();
    const { switchNetwork, error: changeNetworkError, isError: changeNetworkHasError, status } = useSwitchNetwork({
        chainId: chainId,
    });
    const [startTransfer, setStartTransfer] = useState(false)

    const [lodingOnComplete, setLoadingOnComplete] = useState<boolean>()

    const { config: transactionConfig,
        error: transactionPrepareError,
        isLoading: prepareSendIsLoading,
        isError: transactionPrepareHasError,
        isSuccess: prepareTransactionISuccess
    } = usePrepareSendTransaction({
        enabled: isConnected && !!!tokenContractAddress,
        request: {
            to: depositAddress,
            value: amount ? utils.parseEther(amount.toString()) : undefined,
            gasLimit: BigNumber.from(1500000)
        },
        chainId: chainId,
    })
    const { data: transactionData, sendTransaction, error: transactionError, isError: transactionHasError, isLoading: transactionLoading } = useSendTransaction(transactionConfig)

    const {
        config,
        error: prepareError,
        isError: isPrepareError,
        isLoading: prepareContractisLoading,
        isSuccess: prepareContractISuccess
    } = usePrepareContractWrite({
        address: tokenContractAddress,
        abi: erc20ABI,
        functionName: 'transfer',
        enabled: isConnected && !!tokenContractAddress,
        args: [depositAddress, utils.parseUnits(amount.toString(), tokenDecimals)],
    });
    const { data: writeData, write, error: writeError, isError: isWriteError, isLoading: isWriteLoading } = useContractWrite(config)

    const { isLoading: isTransactionPending, isSuccess } = useWaitForTransaction({
        hash: writeData?.hash || transactionData?.hash,
        onSuccess: async (trxRcpt) => {
            setLoadingOnComplete(true)
            await onTransferComplete(trxRcpt.transactionHash)
            setLoadingOnComplete(false)
        }
    })
    const { address:wagmiAddress } = useAccount()
    // useEffect(() => {
    //     if (isTransactionPending)
    //         return
    //     if(startTransfer && ())
    //     if (typeof write === 'function')
    //         return write()
    //     if (typeof sendTransaction === 'function')
    //         return sendTransaction()
    // }, [write, sendTransaction, startTransfer, prepareTransactionISuccess, prepareContractISuccess, isTransactionPending])

    const handleTransfer = useCallback(() => {
        if (typeof write === 'function')
            return write()
        if (typeof sendTransaction === 'function')
            return sendTransaction()
    }, [write, sendTransaction])

    const loading = isTransactionPending || transactionLoading || lodingOnComplete || prepareSendIsLoading || prepareContractisLoading;
    const hasError = isPrepareError || isWriteError || transactionPrepareHasError || transactionHasError || changeNetworkHasError
    const error = prepareError || writeError || transactionPrepareError || transactionError || changeNetworkError
    const message = error?.["reason"] || getWalletMessage({ isWriteLoading, isTransactionPending, transactionLoading })
    const buttonText = transactionHasError || changeNetworkHasError ? 'Try again' : 'Transfer with wallet'

    return <>
        {message && (
            <p className="first-letter:capitalize p-2">{message}</p>
        )}
        <ConnectButton.Custom>
            {(props) => {
                return <TransferWithWalletButton
                    {...props}
                    loading={loading}
                    chainId={chainId}
                    chnageNetwork={switchNetwork}
                    transfer={handleTransfer}>
                    {buttonText}
                </TransferWithWalletButton>
            }}
        </ConnectButton.Custom>
    </>
}

type TransferWithWalletButtonProps = {
    loading: boolean,
    chainId: number,
    chnageNetwork: () => void,
    transfer: () => void,
} & ConnectButtonChildRendererProps

const TransferWithWalletButton: FC<TransferWithWalletButtonProps> = ({ account, mounted, chain, chainId, loading, openConnectModal, chnageNetwork, transfer, children }) => {

    const connected = !!(mounted && account && chain)
    const handlerType = getTransferWithWalletButtonHandlerType({ connected, connectedChainId: chain.id, chainId: chainId })

    const clcikHandler = () => {
        switch (handlerType) {
            case ButtonHandler.Connect:
                return openConnectModal()
            case ButtonHandler.ChangeNetwork:
                return chnageNetwork()
            case ButtonHandler.Transfer:
                return transfer()
        }
    }

    return <div
        {...(!mounted && {
            'aria-hidden': true,
            'style': {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
            },
        })}
    >
        <div className="flex flex-row text-white text-base space-x-2">
            <SubmitButton text_align='center' isDisabled={loading} isSubmitting={loading} onClick={clcikHandler} buttonStyle='filled' size="medium">
                {children}
            </SubmitButton>
        </div>
    </div>
}

const getWalletMessage = ({ isWriteLoading, transactionLoading, isTransactionPending }: { isWriteLoading: boolean, transactionLoading: boolean, isTransactionPending: boolean }): string => {
    if (isWriteLoading || transactionLoading)
        return 'Confirm transaction with your wallet'
    else if (isTransactionPending)
        return 'Transaction in progress'
}

enum ButtonHandler {
    Connect,
    ChangeNetwork,
    Transfer
}

const getTransferWithWalletButtonHandlerType = ({ connected, connectedChainId, chainId }: { connected: boolean, connectedChainId: number, chainId: number }): ButtonHandler => {
    if (!connected)
        return ButtonHandler.Connect
    else if (connectedChainId !== chainId)
        return ButtonHandler.ChangeNetwork
    else
        return ButtonHandler.Transfer
}

type ConnectButtonChildRendererProps = {
    account?: {
        address: string;
        balanceDecimals?: number;
        balanceFormatted?: string;
        balanceSymbol?: string;
        displayBalance?: string;
        displayName: string;
        ensAvatar?: string;
        ensName?: string;
        hasPendingTransactions: boolean;
    };
    chain?: {
        hasIcon: boolean;
        iconUrl?: string;
        iconBackground?: string;
        id: number;
        name?: string;
        unsupported?: boolean;
    };
    mounted: boolean;
    authenticationStatus?: AuthenticationStatus;
    openAccountModal: () => void;
    openChainModal: () => void;
    openConnectModal: () => void;
    accountModalOpen: boolean;
    chainModalOpen: boolean;
    connectModalOpen: boolean;
}

export default TransferFromWallet