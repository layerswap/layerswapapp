import { FC, useCallback, useEffect, useState } from "react";
import { PublishedSwapTransactions, SwapBasicData } from "@/lib/apiClients/layerSwapApiClient";
import { WithdrawalProvider } from "@/context/withdrawalContext";
import useWallet from "@/hooks/useWallet";
import { useSelectedAccount } from "@/context/swapAccounts";
import { WithdrawPageProps } from "./Common/sharedTypes";
import { ChangeNetworkButton, ConnectWalletButton, SendTransactionButton } from "./Common/buttons";
import { useInitialSettings, useSettingsState } from "@/context/settings";
import WalletIcon from "@/components/Icons/WalletIcon";
import { useBalance } from "@/lib/balances/useBalance";
import { TransferProps } from "@/types";
import { ActionMessage } from "./Common/actionMessage";
import { ActionMessages } from "../messages/TransactionMessages";
import { useTransfer } from "@/hooks/useTransfer";
import { useRpcHealth } from "@/context/rpcHealthContext";
import RPCUnhealthyMessage from "./RPCUnhealthyMessage";

type Props = {
    swapData: SwapBasicData
    swapId: string | undefined
    refuel: boolean
    onWalletWithdrawalSuccess?: () => void
    onCancelWithdrawal?: () => void
};
export const WalletTransferAction: FC<Props> = ({ swapData, swapId, refuel, onWalletWithdrawalSuccess, onCancelWithdrawal }) => {
    const { source_network } = swapData

    const { provider, wallets } = useWallet(source_network, "withdrawal")
    const selectedSourceAccount = useSelectedAccount("from", source_network?.name);

    useEffect(() => {
        const selectedWallet = wallets.find(w => w.id === selectedSourceAccount?.id && w.addresses.some(a => a.toLowerCase() === selectedSourceAccount.address.toLowerCase()))
        if (selectedSourceAccount && selectedWallet && provider?.switchAccount) {
            provider?.switchAccount(selectedWallet, selectedSourceAccount.address)
        }
    }, [selectedSourceAccount?.address, source_network?.name])

    return <>
        {
            swapData &&
            <WithdrawalProvider onWalletWithdrawalSuccess={onWalletWithdrawalSuccess} onCancelWithdrawal={onCancelWithdrawal}>
                <WalletWithdrawal
                    swapId={swapId}
                    swapBasicData={swapData}
                    refuel={refuel}
                />
            </WithdrawalProvider>
        }
    </>;
};

export const WalletWithdrawal: FC<WithdrawPageProps> = ({
    swapBasicData,
    refuel,
    swapId
}) => {

    const { source_network, destination_network, destination_address } = swapBasicData
    const selectedSourceAccount = useSelectedAccount("from", swapBasicData.source_network.name);
    const { wallets, provider } = useWallet(source_network, "withdrawal")
    const { sameAccountNetwork } = useInitialSettings()
    const wallet = wallets.find(w => w.id === selectedSourceAccount?.id && w.withdrawalSupportedNetworks?.includes(source_network?.name))
    const networkChainId = source_network?.chain_id ?? undefined
    const [savedTransactionHash, setSavedTransactionHash] = useState<string>()

    useEffect(() => {
        if (!swapId) return;
        try {
            const data: PublishedSwapTransactions = JSON.parse(localStorage.getItem('swapTransactions') || "{}")
            const hash = data?.[swapId!]?.hash
            if (hash)
                setSavedTransactionHash(hash)
        }
        catch (e) {
            //TODO log to logger
            console.error(e.message)
        }
    }, [swapId])

    if (provider?.multiStepHandlers) {
        const MultiStepHandler = provider.multiStepHandlers.find(handler => handler.supportedNetworks.includes(source_network?.name))?.component

        if (MultiStepHandler) {
            return <MultiStepHandler
                swapId={swapId}
                swapBasicData={swapBasicData}
                refuel={refuel}
                onTransferComplete={(hash: string) => {
                    setSavedTransactionHash(hash)
                }}
            />
        }
    }

    if ((source_network?.name.toLowerCase() === sameAccountNetwork?.toLowerCase() || destination_network?.name.toLowerCase() === sameAccountNetwork?.toLowerCase())
        && (selectedSourceAccount?.address && destination_address && selectedSourceAccount?.address.toLowerCase() !== destination_address?.toLowerCase())) {
        const network = source_network?.name.toLowerCase() === sameAccountNetwork?.toLowerCase() ? source_network : destination_network
        return <ActionMessages.DifferentAccountsNotAllowedError network={network?.display_name!} />
    }

    if (!wallet) {
        return <ConnectWalletButton />
    }
    else if (wallet.chainId && wallet.chainId != networkChainId && source_network) {
        return <ChangeNetworkButton
            chainId={Number(networkChainId)}
            network={source_network}
        />
    }
    else {
        return <TransferTokenButton
            swapData={swapBasicData}
            refuel={refuel}
            chainId={Number(networkChainId)}
            savedTransactionHash={savedTransactionHash as `0x${string}`}
        />
    }
}


type TransferTokenButtonProps = {
    savedTransactionHash?: string;
    chainId?: number;
    swapData: SwapBasicData,
    refuel: boolean,
}
const TransferTokenButton: FC<TransferTokenButtonProps> = ({
    savedTransactionHash,
    chainId,
    swapData,
    refuel
}) => {
    const [buttonClicked, setButtonClicked] = useState(false)
    const [error, setError] = useState<Error | undefined>()
    const [loading, setLoading] = useState(false)

    const selectedSourceAccount = useSelectedAccount("from", swapData.source_network.name);

    const { networks } = useSettingsState()
    const networkWithTokens = networks.find(n => n.name === swapData.source_network.name)

    const { provider, wallets } = useWallet(swapData.source_network, "withdrawal")
    const { balances } = useBalance(selectedSourceAccount?.address, networkWithTokens)
    const wallet = wallets.find(w => w.id === selectedSourceAccount?.id)
    const { executeTransfer } = useTransfer()
    const rpcHealth = useRpcHealth(swapData.source_network)

    const clickHandler = useCallback(async ({ amount, callData, depositAddress, swapId }: TransferProps) => {
        setButtonClicked(true)
        setError(undefined)
        setLoading(true)
        try {
            if (!depositAddress)
                throw new Error('Missing deposit address')
            if (amount == undefined)
                throw new Error('Missing amount')
            if (!wallet)
                throw new Error('No selected account')

            try {
                const tx = await executeTransfer({
                    token: swapData.source_token,
                    amount,
                    depositAddress,
                    callData,
                    selectedWallet: wallet,
                    network: swapData.source_network,
                    balances: balances,
                    userDestinationAddress: swapData.destination_address,
                    swapId,
                }, wallet)

                if (!tx)
                    throw new Error('No transaction')

                if (tx) {
                    return tx
                }
            } catch (e) {
                if (typeof e === 'string' && e?.includes('No transfer provider found for network:')) {
                    if (!provider?.transfer) throw new Error('No provider transfer')

                    const tx = await provider.transfer({
                        token: swapData.source_token,
                        amount,
                        depositAddress,
                        callData,
                        selectedWallet: wallet,
                        network: swapData.source_network,
                        balances: balances,
                        userDestinationAddress: swapData.destination_address,
                    }, wallet)

                    if (!tx)
                        throw new Error('No transaction')

                    if (tx) {
                        return tx
                    }
                } else {
                    throw e
                }

            }
        } catch (e) {
            setLoading(false)
            setError(e)

            throw e
        }
    }, [executeTransfer, chainId, selectedSourceAccount?.address, wallet, swapData, balances])

    // Show RPC health message if available and unhealthy (EVM wallets only)
    if (rpcHealth?.health.status === 'unhealthy') {
        return <RPCUnhealthyMessage
            network={swapData.source_network}
            suggestRpcForCurrentChain={rpcHealth.suggestRpcForCurrentChain}
            isSuggestingRpc={rpcHealth.isSuggestingRpc}
            checkManually={rpcHealth.checkManually}
        />
    }

    return <div className="w-full space-y-3 flex flex-col justify-between h-full text-primary-text">
        {
            buttonClicked &&
            <ActionMessage
                error={error}
                isLoading={loading}
                selectedSourceAddress={selectedSourceAccount?.address || ''}
                sourceNetwork={swapData.source_network}
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