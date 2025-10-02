import { FC, useCallback, useMemo, useState } from "react";
import {
    useConfig,
} from "wagmi";
import { parseEther } from 'viem'
import WalletIcon from "@/components/Icons/WalletIcon";
import { ActionData, TransferProps } from "../../Common/sharedTypes";
import TransactionMessage from "./transactionMessage";
import { SendTransactionButton } from "../../Common/buttons";
import { sendTransaction } from '@wagmi/core'
import { SwapBasicData } from "@/lib/apiClients/layerSwapApiClient";
import { useSelectedAccount } from "@/context/balanceAccounts";
import { isMobile } from "@/lib/isMobile";

type Props = {
    savedTransactionHash?: string;
    chainId?: number;
    swapData: SwapBasicData,
    refuel: boolean,
}
const TransferTokenButton: FC<Props> = ({
    savedTransactionHash,
    chainId,
    swapData,
    refuel
}) => {
    const [buttonClicked, setButtonClicked] = useState(false)
    const config = useConfig()
    const [error, setError] = useState<any | undefined>()
    const [loading, setLoading] = useState(false)

    const selectedSourceAccount = useSelectedAccount("from", swapData.source_network.name);

    const clickHandler = useCallback(async ({ amount, callData, depositAddress }: TransferProps) => {
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
            if (isMobile() && selectedSourceAccount.wallet?.metadata?.deepLink) {
                window.location.href = selectedSourceAccount.wallet.metadata?.deepLink
                await new Promise(resolve => setTimeout(resolve, 100))
            }
            const hash = await sendTransaction(config, tx)

            if (hash) {
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
                onClick={clickHandler}
                icon={<WalletIcon className="stroke-2 w-6 h-6" />}
                error={!!error && buttonClicked}
                swapData={swapData}
                refuel={refuel}
            />
        }
    </div>
}

export default TransferTokenButton
