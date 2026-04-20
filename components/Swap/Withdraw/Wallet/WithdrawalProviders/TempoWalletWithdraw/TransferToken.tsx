import { FC, useCallback, useState } from "react";
import { useConfig } from "wagmi";
import { numberToHex, parseUnits } from 'viem'
import { Actions } from 'wagmi/tempo'
import { ActionData, TransferProps } from "../../Common/sharedTypes";
import TransactionMessage from "../EVMWalletWithdraw/transactionMessage";
import { SendTransactionButton } from "../../Common/buttons";
import { isMobile } from "@/lib/openLink";
import { SwapBasicData } from "@/lib/apiClients/layerSwapApiClient";
import { useSelectedAccount } from "@/context/swapAccounts";
import useWallet from "@/hooks/useWallet";
import { useSwapDataState } from "@/context/swap";
import useSWRGas from "@/lib/gases/useSWRGas";
import { useWalletRpcHealth } from "@/hooks/useWalletRpcHealth";
import RPCUnhealthyMessage from "../EVMWalletWithdraw/RPCUnhealthyMessage";

type Props = {
    savedTransactionHash?: string;
    chainId?: number;
    swapData: SwapBasicData,
    refuel: boolean,
}
const TempoTransferTokenButton: FC<Props> = ({
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

    const clickHandler = useCallback(async ({ amount, sequenceNumber, depositAddress }: TransferProps) => {
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


            const tokenContract = swapData.source_token?.contract
            if (!tokenContract)
                throw new Error('Missing token contract for TIP20 transfer')

            if (isMobile() && wallet?.metadata?.deepLink) {
                window.location.href = wallet.metadata?.deepLink
                await new Promise(resolve => setTimeout(resolve, 100))
            }

            const hash = await Actions.token.transfer(config, {
                token: tokenContract as `0x${string}`,
                to: depositAddress as `0x${string}`,
                amount: parseUnits(amount.toString(), swapData.source_token.decimals),
                account: selectedSourceAccount.address as `0x${string}`,
                ...(sequenceNumber != null ? { memo: numberToHex(sequenceNumber, { size: 8 }) } : {}),
                ...(gasData?.gas ? { gas: BigInt(gasData.gas) } : {}),
            })

            if (hash) {
                return hash
            }

        } catch (e) {
            setLoading(false)
            setError(e)

            throw e
        }
    }, [config, chainId, selectedSourceAccount?.address, gasData?.gas, swapData.source_token])

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

export default TempoTransferTokenButton
