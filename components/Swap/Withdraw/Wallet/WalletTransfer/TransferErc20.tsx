import { FC, useCallback, useEffect, useState } from "react";
import {
    useAccount,
    useContractWrite,
    usePrepareContractWrite,
    useWaitForTransaction,
    useNetwork,
    erc20ABI,
} from "wagmi";
import { PublishedSwapTransactionStatus } from "../../../../../lib/layerSwapApiClient";
import WalletIcon from "../../../../icons/WalletIcon";
import { encodeFunctionData, http, parseUnits, createWalletClient, publicActions } from 'viem'
import TransactionMessage from "./transactionMessage";
import { BaseTransferButtonProps } from "./sharedTypes";
import { ButtonWrapper } from "./buttons";
import { useSwapTransactionStore } from "../../../../../stores/swapTransactionStore";
import useWalletTransferOptions from "../../../../../hooks/useWalletTransferOptions";
import { SendTransactionData } from "../../../../../lib/telegram";

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
    swapId,
    sequenceNumber,
    userDestinationAddress,
}) => {
    const [applyingTransaction, setApplyingTransaction] = useState<boolean>(!!savedTransactionHash)
    const { address } = useAccount();
    const [buttonClicked, setButtonClicked] = useState(false)
    const [estimatedGas, setEstimatedGas] = useState<bigint>()
    const { setSwapTransaction } = useSwapTransactionStore();
    const { canDoSweepless, isContractWallet } = useWalletTransferOptions()

    const contractWritePrepare = usePrepareContractWrite({
        enabled: !!depositAddress && isContractWallet?.ready,
        address: tokenContractAddress,
        abi: erc20ABI,
        functionName: 'transfer',
        gas: estimatedGas,
        args: depositAddress ? [depositAddress, parseUnits(amount.toString(), tokenDecimals)] : undefined,
    });

    let encodedData = depositAddress && contractWritePrepare?.config?.request
        && encodeFunctionData({
            ...contractWritePrepare?.config?.request,
        });

    if (encodedData && canDoSweepless && address !== userDestinationAddress) {
        encodedData = encodedData ? `${encodedData}${sequenceNumber}` as `0x${string}` : encodedData;
    }

    const tx = {
        ...contractWritePrepare?.config,
        request: {
            ...contractWritePrepare?.config?.request,
            data: encodedData
        }
    }
    const { chain } = useNetwork();
    const publicClient = createWalletClient({
        account: address,
        chain: chain,
        transport: http(),
    }).extend(publicActions);

    useEffect(() => {
        (async () => {
            if (encodedData && address) {
                const estimate = await publicClient.estimateGas({
                    data: encodedData,
                    to: tokenContractAddress,
                    account: address,
                })
                setEstimatedGas(estimate)
            }
        })()
    }, [address, encodedData, depositAddress, amount, tokenDecimals, tx])

    const contractWrite = useContractWrite(tx)
    useEffect(() => {
        try {
            if (contractWrite?.data?.hash) {
                setSwapTransaction(swapId, PublishedSwapTransactionStatus.Pending, contractWrite?.data?.hash);
                if (!!isContractWallet?.isContract)
                    SendTransactionData(swapId, contractWrite?.data?.hash)
            }
        }
        catch (e) {
            //TODO log to logger
            console.error(e.message)
        }
    }, [contractWrite?.data?.hash, swapId, isContractWallet?.isContract])

    const clickHandler = useCallback(async () => {
        setButtonClicked(true)
        if (contractWritePrepare?.status == "idle") {
            await contractWritePrepare.refetch();
        }
        contractWrite?.write && contractWrite?.write()
    }, [contractWrite])

    const waitForTransaction = useWaitForTransaction({
        hash: contractWrite?.data?.hash || savedTransactionHash,
        onSuccess: async (trxRcpt) => {
            setApplyingTransaction(true)
            setSwapTransaction(swapId, PublishedSwapTransactionStatus.Completed, trxRcpt.transactionHash);
            setApplyingTransaction(false)
        },
        onError: async (err) => {
            if (contractWrite?.data?.hash)
                setSwapTransaction(swapId, PublishedSwapTransactionStatus.Error, contractWrite.data.hash, err.message);
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
                disabled={contractWritePrepare?.isLoading}
                icon={<WalletIcon className="stroke-2 w-6 h-6" />}
            >
                {(isError && buttonClicked) ? <span>Try again</span>
                    : <span>Send from wallet</span>}
            </ButtonWrapper>
        }
    </>
}

export default TransferErc20Button