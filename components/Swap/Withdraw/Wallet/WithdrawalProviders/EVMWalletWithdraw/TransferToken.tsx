import { FC, useCallback, useState } from "react";
import { useConfig } from "wagmi";
import { parseEther } from 'viem'
import { ActionData, TransferProps } from "../../Common/sharedTypes";
import TransactionMessage from "./transactionMessage";
import { SendTransactionButton } from "../../Common/buttons";
import { isMobile } from "@/lib/openLink";
import { sendTransaction } from '@wagmi/core'
import { SwapBasicData } from "@/lib/apiClients/layerSwapApiClient";
import { useSelectedAccount } from "@/context/swapAccounts";
import useWallet from "@/hooks/useWallet";
import { useSwapDataState } from "@/context/swap";
import useSWRGas from "@/lib/gases/useSWRGas";
import { useWalletRpcHealth } from "@/hooks/useWalletRpcHealth";
import RPCUnhealthyMessage from "./RPCUnhealthyMessage";

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
    const { swapError } = useSwapDataState()

    const selectedSourceAccount = useSelectedAccount("from", swapData.source_network.name);
    const { wallets } = useWallet(swapData.source_network, 'withdrawal')
    const wallet = wallets.find(w => w.id === selectedSourceAccount?.id)
    const { gasData } = useSWRGas(selectedSourceAccount?.address, swapData?.source_network)
    const { health, suggestRpcForCurrentChain, isSuggestingRpc, checkManually } = useWalletRpcHealth()
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
                gas: gasData?.gas ? BigInt(gasData.gas) : undefined,
                data: callData as `0x${string}`,
                account: selectedSourceAccount.address as `0x${string}`
            }

            if (isMobile() && wallet?.metadata?.deepLink) {
                window.location.href = wallet.metadata?.deepLink
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
    }, [config, chainId, selectedSourceAccount?.address, gasData?.gas])

    const transaction: ActionData = {
        error: error,
        isError: !!error,
        isPending: loading,
    }

    if (health.status === 'unhealthy') {
        return <RPCUnhealthyMessage
            network={swapData.source_network}
            suggestRpcForCurrentChain={suggestRpcForCurrentChain}
            isSuggestingRpc={isSuggestingRpc}
            checkManually={checkManually}
        />
    }

    return <div className="w-full space-y-3 h-fit text-primary-text">
        {
            (buttonClicked || swapError) ? (
                <TransactionMessage
                    transaction={transaction}
                    applyingTransaction={!!savedTransactionHash}
                    activeAddress={selectedSourceAccount?.address}
                    selectedSourceAddress={selectedSourceAccount?.address}
                    swapError={swapError}
                    sourceNetwork={swapData.source_network}
                />
            ) : null
        }
        {
            !loading &&
            <SendTransactionButton
                onClick={clickHandler}
                error={!!error && buttonClicked}
                clearError={() => setError(undefined)}
                swapData={swapData}
                refuel={refuel}
            />
        }
    </div>
}

export default TransferTokenButton
