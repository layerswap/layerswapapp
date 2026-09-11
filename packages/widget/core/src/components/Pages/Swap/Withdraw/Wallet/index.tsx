import { NetworkType, type TransferBlockedReasonCode } from '@layerswap/widget-types';
import { FC, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { PublishedSwapTransactions, SwapBasicData } from "@/lib/apiClients/layerSwapApiClient";
import { WithdrawalProvider } from "@/context/withdrawalContext";
import useWallet from "@/hooks/useWallet";
import { useSelectedAccount } from "@/context/swapAccounts";
import { useSwapDataState } from "@/context/swap";
import { WithdrawPageProps } from "./Common/sharedTypes";
import { ChangeNetworkButton, ConnectWalletButton, SendTransactionButton } from "./Common/buttons";
import { GaslessSigner } from "./Common/depositExecution";
import { useInitialSettings, useSettingsState } from "@/context/settings";
import { WalletIcon } from "@layerswap/ui-kit/components";
import { useBalance } from "@/lib/balances/useBalance";
import { TransferProps } from "@layerswap/widget-types";
import { ActionMessage } from "./Common/actionMessage";
import { ActionMessages } from "../messages/TransactionMessages";
import { useTransfer } from "@/hooks/useTransfer";
import { useGasless } from "@/hooks/useGasless";
import { useRpcHealth } from "@/context/rpcHealthContext";
import RPCUnhealthyMessage from "./RPCUnhealthyMessage";
import { isExtendedSourceNetwork } from "@/lib/extendedRoutes/registry";
import { HyperliquidWalletWithdraw } from "../WithdrawalProviders/Hyperliquid";
import { PolymarketWalletWithdraw } from "../WithdrawalProviders/Polymarket";
import { useCallbacks } from "@/context/callbackProvider";
import { lifecycleContextFromSwap, lifecycleErrorDetails } from "@/lib/swapLifecycle";
import { useTransferBlocked } from "@/hooks/useTransferBlocked";
import { useGaslessPreferenceStore } from "@/stores/gaslessPreferenceStore";
import { isUserRejection } from "./Common/isUserRejection";

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
    const { swapDetails } = useSwapDataState()
    const { onSwapLifecycle } = useCallbacks()
    const wallet = wallets.find(w => w.id === selectedSourceAccount?.id && w.withdrawalSupportedNetworks?.includes(source_network?.name))
    const networkChainId = source_network?.chain_id ?? undefined
    const [savedTransactionHash, setSavedTransactionHash] = useState<string>()
    const lifecycleContext = useMemo(
        () => lifecycleContextFromSwap(swapBasicData, swapDetails),
        [
            swapBasicData.destination_address,
            swapBasicData.destination_network.name,
            swapBasicData.destination_token.symbol,
            swapBasicData.requested_amount,
            swapBasicData.source_network.name,
            swapBasicData.source_token.symbol,
            swapBasicData.use_deposit_address,
            swapDetails?.id,
            swapDetails?.source_address,
        ],
    )
    const sameAccountMismatch = (
        source_network?.name.toLowerCase() === sameAccountNetwork?.toLowerCase()
        || destination_network?.name.toLowerCase() === sameAccountNetwork?.toLowerCase()
    ) && !!(
        selectedSourceAccount?.address
        && destination_address
        && selectedSourceAccount.address.toLowerCase() !== destination_address.toLowerCase()
    )

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

    const isExtendedSource = source_network?.type === NetworkType.Polymarket || isExtendedSourceNetwork(source_network?.name)
    const hasMultiStepHandler = !!provider?.multiStepHandlers?.some(handler => handler.supportedNetworks.includes(source_network?.name))
    // A connected account whose wallet cannot withdraw on this network only
    // sees the connect button again; report that as a blocked transfer step.
    const blockedReason: TransferBlockedReasonCode | undefined = isExtendedSource || hasMultiStepHandler ? undefined
        : sameAccountMismatch ? 'same_account_required'
        : selectedSourceAccount && !wallet ? 'wallet_unsupported_for_network'
        : undefined
    useTransferBlocked(blockedReason, lifecycleContext, 'WalletWithdrawal',
        blockedReason === 'same_account_required' ? 'The selected source and destination accounts must match for this route'
        : blockedReason === 'wallet_unsupported_for_network' ? `${selectedSourceAccount?.providerName ?? 'The selected wallet'} cannot send from ${source_network?.name}`
        : undefined)

    // Extended sources (Hyperliquid, Polymarket) have their own withdraw flow — the chain
    // logic comes from the wallet package's TransferProvider, the UI lives here. Polymarket
    // is checked first: its synthesized networks are also extended sources.
    if (source_network?.type === NetworkType.Polymarket) {
        return <PolymarketWalletWithdraw
            swapId={swapId}
            swapBasicData={swapBasicData}
            refuel={refuel}
        />
    }
    if (isExtendedSourceNetwork(source_network?.name)) {
        return <HyperliquidWalletWithdraw
            swapId={swapId}
            swapBasicData={swapBasicData}
            refuel={refuel}
        />
    }

    if (provider?.multiStepHandlers) {
        const MultiStepHandler = provider.multiStepHandlers.find(handler => handler.supportedNetworks.includes(source_network?.name))?.component

        if (MultiStepHandler) {
            return <Suspense fallback={null}>
                <MultiStepHandler
                    swapId={swapId}
                    swapBasicData={swapBasicData}
                    refuel={refuel}
                    onTransferComplete={(hash: string) => {
                        setSavedTransactionHash(hash)
                        onSwapLifecycle({
                            step: 'transaction_submitted',
                            stage: 'input_transfer',
                            outcome: 'succeeded',
                            path: 'MultiStepWalletTransfer',
                            action: 'send_transaction',
                            provider: wallet?.providerName || provider?.name,
                            transactionHash: hash,
                            ...lifecycleContext,
                        })
                    }}
                    onTransferError={(error: unknown) => {
                        // Optional: handlers that report failures make them visible like the shared path.
                        const rejected = isUserRejection(error)
                        const errorDetails = lifecycleErrorDetails(error)
                        onSwapLifecycle({
                            step: rejected ? 'wallet_action_rejected' : 'wallet_action_failed',
                            stage: 'wallet_action',
                            outcome: rejected ? 'rejected' : 'failed',
                            path: 'MultiStepWalletTransfer',
                            action: 'send_transaction',
                            provider: wallet?.providerName || provider?.name,
                            ...errorDetails,
                            reasonCode: rejected ? 'user_rejected' : errorDetails.reasonCode,
                            ...lifecycleContext,
                        })
                    }}
                />
            </Suspense>
        }
    }

    if (sameAccountMismatch) {
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
    const { swapDetails, swapError, depositActionsError } = useSwapDataState()
    const gaslessUnavailable = useGaslessPreferenceStore(s => s.gaslessUnavailable)
    const gaslessErrorMessage = useGaslessPreferenceStore(s => s.gaslessErrorMessage)

    const selectedSourceAccount = useSelectedAccount("from", swapData.source_network.name);

    const { networks } = useSettingsState()
    const networkWithTokens = networks.find(n => n.name === swapData.source_network.name)

    const { provider, wallets } = useWallet(swapData.source_network, "withdrawal")
    const { balances } = useBalance(selectedSourceAccount?.address, networkWithTokens)
    const wallet = wallets.find(w => w.id === selectedSourceAccount?.id)
    const { executeTransfer } = useTransfer()
    const { signGaslessDeposit, isGaslessSupported } = useGasless()
    const rpcHealth = useRpcHealth(swapData.source_network)
    const lifecycleContext = useMemo(
        () => lifecycleContextFromSwap(swapData, swapDetails),
        [
            swapData.destination_address,
            swapData.destination_network.name,
            swapData.destination_token.symbol,
            swapData.requested_amount,
            swapData.source_network.name,
            swapData.source_token.symbol,
            swapData.use_deposit_address,
            swapDetails?.id,
            swapDetails?.source_address,
        ],
    )

    // Every state that replaces the send button with a message, in display priority.
    const blockedReason: TransferBlockedReasonCode | undefined =
        rpcHealth?.health.status === 'unhealthy' ? 'rpc_unhealthy'
        : gaslessUnavailable ? 'gasless_unavailable'
        : depositActionsError ? 'deposit_actions_unavailable'
        : swapError ? 'swap_error'
        : undefined
    useTransferBlocked(blockedReason, lifecycleContext, 'TransferTokenButton',
        blockedReason === 'rpc_unhealthy' ? (rpcHealth?.health.status === 'unhealthy' ? rpcHealth.health.reason : undefined)
        : blockedReason === 'gasless_unavailable' ? gaslessErrorMessage ?? undefined
        : blockedReason === 'deposit_actions_unavailable' ? depositActionsError
        : blockedReason === 'swap_error' ? swapError ?? undefined
        : undefined)

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

    const signHandler: GaslessSigner = useCallback(async (signAction) => {
        if (!signAction.typed_data)
            throw new Error('Missing typed data for gasless deposit')
        if (!selectedSourceAccount?.address)
            throw new Error('No selected account')
        return signGaslessDeposit({
            network: swapData.source_network,
            address: selectedSourceAccount.address,
            typedData: signAction.typed_data,
            wallet,
        })
    }, [signGaslessDeposit, swapData.source_network, selectedSourceAccount?.address, wallet])

    // Show RPC health message if available and unhealthy (EVM wallets only)
    if (rpcHealth?.health.status === 'unhealthy') {
        return <RPCUnhealthyMessage
            network={swapData.source_network}
            suggestRpcForCurrentChain={rpcHealth.suggestRpcForCurrentChain}
            isSuggestingRpc={rpcHealth.isSuggestingRpc}
            checkManually={rpcHealth.checkManually}
        />
    }

    return <div className="w-full space-y-2 flex flex-col justify-between h-full text-primary-text">
        {
            (buttonClicked || !!swapError) &&
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
                onSign={isGaslessSupported(swapData.source_network) ? signHandler : undefined}
                icon={<WalletIcon className="stroke-2 w-6 h-6" />}
                error={!!error && buttonClicked}
                swapData={swapData}
                refuel={refuel}
            />
        }
    </div>
}
