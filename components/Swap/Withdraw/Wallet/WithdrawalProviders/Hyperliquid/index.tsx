import { FC, useCallback, useMemo, useState } from "react";
import { useAccount, useConfig } from "wagmi";
import { Loader2 } from "lucide-react";
import posthog from "posthog-js";
import { WithdrawPageProps } from "../../Common/sharedTypes";
import { ButtonWrapper, ChangeNetworkButton, ConnectWalletButton } from "../../Common/buttons";
import WalletMessage from "../../../messages/Message";
import ActionMessages from "../../../messages/TransactionMessages";
import resolveError from "../EVMWalletWithdraw/resolveError";
import WalletIcon from "@/components/icons/WalletIcon";
import { useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import { useWalletWithdrawalState } from "@/context/withdrawalContext";
import { useSelectedAccount } from "@/context/swapAccounts";
import { useQueryState } from "@/context/query";
import { useSettingsState } from "@/context/settings";
import useWallet from "@/hooks/useWallet";
import { useBalance } from "@/lib/balances/useBalance";
import { Address } from "@/lib/address";
import { NetworkRoute } from "@/Models/Network";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { HyperliquidClient } from "@/lib/apiClients/hyperliquidClient";
import { getExtendedMapping } from "@/lib/extendedRoutes/registry";
import { resolveHyperliquidConfig } from "@/lib/wallets/hyperliquid/constants";
import { signSendToEvm } from "@/lib/wallets/hyperliquid/withdraw";
import { useExtendedRoutesStore } from "@/stores/extendedRoutesStore";

type StepError = { header: string; details: string }

export const HyperliquidWalletWithdraw: FC<WithdrawPageProps> = ({ swapBasicData, refuel, swapId }) => {
    const { source_network, source_token, destination_network, destination_token, destination_address } = swapBasicData

    const config = useConfig()
    const { address: activeAddress, chain: activeChain, isConnected } = useAccount()
    const { networks } = useSettingsState()
    const query = useQueryState()
    const { onWalletWithdrawalSuccess } = useWalletWithdrawalState()
    const { swapDetails, depositActionsResponse } = useSwapDataState()
    const { createSwap, setSwapId } = useSwapDataUpdate()

    const selectedSourceAccount = useSelectedAccount("from", source_network?.name)
    const { wallets } = useWallet(source_network, "withdrawal")
    const wallet = wallets.find(w => w.id === selectedSourceAccount?.id)
    const sourceAddress = selectedSourceAccount?.address

    // Full network (with tokens/node_url) for the shared balance pipeline.
    const sourceNetwork = useMemo(() => source_network?.name ? networks.find(n => n.name === source_network.name) : undefined, [networks, source_network?.name])
    const { mutate: refreshBalance } = useBalance(sourceAddress, sourceNetwork)

    const hlConfig = useMemo(() => resolveHyperliquidConfig(source_network?.name, networks), [source_network?.name, networks])
    const extendedMapping = useMemo(() => getExtendedMapping(source_network?.name, source_token?.symbol), [source_network?.name, source_token?.symbol])
    const isDirect = extendedMapping?.resolveMode(destination_network?.name, destination_token?.symbol) === 'direct'

    const [directRecordId, setDirectRecordId] = useState<string>()
    const recordId = isDirect ? directRecordId : swapId
    const record = useExtendedRoutesStore(s => recordId ? s.records[recordId] : undefined)

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<StepError | undefined>()
    const [rejected, setRejected] = useState(false)

    // Note: WalletTransferAction (the registry that mounts this step) already keeps
    // the wallet's active account aligned with the selected source account.

    const handleWithdraw = useCallback(async () => {
        setError(undefined)
        setRejected(false)
        setLoading(true)
        try {
            if (!hlConfig) throw new Error('Unsupported Hyperliquid network')
            if (!extendedMapping) throw new Error('No extended route mapping')
            if (!sourceAddress) throw new Error('No connected Hyperliquid account')

            const amount = swapBasicData.requested_amount.toString()
            const A = Number(amount)
            if (!A || A <= 0) throw new Error('Invalid amount')

            // 1. Resolve the withdrawal destination + the record to track it under.
            let destination: string
            let currentRecordId: string
            if (isDirect) {
                if (!destination_address) throw new Error('No destination address')
                destination = destination_address
                currentRecordId = directRecordId ?? (typeof crypto !== 'undefined' ? crypto.randomUUID() : String(Date.now()))
                if (!directRecordId) setDirectRecordId(currentRecordId)
                useExtendedRoutesStore.getState().setRecord(currentRecordId, {
                    providerId: extendedMapping.provider.id,
                    mode: 'direct',
                    extendedNetwork: source_network.name,
                    extendedToken: source_token.symbol,
                    realNetwork: extendedMapping.real.networkName,
                    realToken: extendedMapping.real.tokenSymbol,
                    sourceAddress,
                    sourceAmount: amount,
                    destinationAddress: destination,
                    createdAt: Date.now(),
                })
            } else {
                let depositActions = depositActionsResponse
                let activeSwapId = swapId
                if (!swapId || !swapDetails) {
                    setSwapId(undefined)
                    const swapValues: SwapFormValues = {
                        amount,
                        from: source_network as NetworkRoute,
                        to: destination_network as NetworkRoute,
                        fromAsset: source_token,
                        toAsset: destination_token,
                        refuel,
                        destination_address,
                        depositMethod: 'wallet',
                    }
                    const newSwap = await createSwap(swapValues, query)
                    activeSwapId = newSwap?.swap?.id
                    if (!activeSwapId) throw new Error('Swap ID is undefined')
                    setSwapId(activeSwapId)
                    depositActions = newSwap.deposit_actions
                }
                const depositAddress = depositActions?.find(a => a.type === 'transfer' || a.type === 'manual_transfer')?.to_address
                if (!depositAddress) throw new Error('No deposit address')
                destination = depositAddress
                currentRecordId = activeSwapId!
            }

            // 2. Preflight: re-read the available balance through the shared balance
            // pipeline (same source as the picker / MinMax), so the numbers can't
            // diverge. Force-fresh read; double-submit safe — the deposit address
            // tolerates any amount.
            const fresh = await refreshBalance()
            const available = fresh?.balances?.find(b => b.token === source_token.symbol)?.amount ?? 0
            if (available < A) {
                setError({ header: 'Insufficient balance', details: `Your available Hyperliquid balance (${available} ${source_token.symbol}) is below ${A} ${source_token.symbol}.` })
                return
            }

            // 3. Sign + submit (single attempt — signed, time-bound nonce).
            const client = new HyperliquidClient()
            const time = Date.now()
            let signed: Awaited<ReturnType<typeof signSendToEvm>>
            try {
                signed = await signSendToEvm(config, hlConfig, {
                    destinationRecipient: destination,
                    amount,
                    nonce: time,
                    account: sourceAddress as `0x${string}`,
                })
            } catch (signErr) {
                if (resolveError(signErr) === 'transaction_rejected') {
                    setRejected(true)
                    return
                }
                throw signErr
            }

            const response = await client.withdraw(signed.action, signed.signature, hlConfig.nodeUrl)
            if (response.status === 'err') {
                setError(resolveHyperliquidError(response.response))
                posthog.captureException(new Error(response.response), {
                    $layerswap_exception_type: 'Hyperliquid Withdrawal Error',
                    swapId: currentRecordId,
                    $fromAddress: sourceAddress,
                    $toAddress: destination,
                })
                return
            }

            // 4. Success — record the submission. No SwapCatchup / swapTransactionStore
            // write: there is no real source tx hash, and a fake one would break
            // Processing's tx polling and explorer links.
            useExtendedRoutesStore.getState().setWithdrawal(currentRecordId, {
                submittedAt: time,
                nonce: time,
                amount,
                destination,
            })
            onWalletWithdrawalSuccess?.()
        } catch (e) {
            posthog.captureException(e, {
                $layerswap_exception_type: 'Hyperliquid Withdrawal Error',
                swapId,
                $fromAddress: sourceAddress,
            })
            setError({ header: 'Withdrawal failed', details: (e as Error)?.message || 'Unexpected error occurred.' })
        } finally {
            setLoading(false)
        }
    }, [hlConfig, extendedMapping, sourceAddress, isDirect, directRecordId, destination_address, source_network, source_token, destination_network, destination_token, depositActionsResponse, swapId, swapDetails, refuel, query, config, createSwap, setSwapId, onWalletWithdrawalSuccess, swapBasicData.requested_amount, refreshBalance])

    if (record?.withdrawal) {
        return <SubmittedPanel isDirect={isDirect} destination={record.withdrawal.destination} realNetworkName={record.realNetwork} networks={networks} />
    }

    if (!isConnected || !wallet) {
        return <div className="w-full space-y-3">
            <WalletMessage status="pending" header="Connect your Hyperliquid wallet" details="Connect the wallet that owns your Hyperliquid balance to withdraw." />
            <ConnectWalletButton />
        </div>
    }

    if (sourceAddress && activeAddress && !Address.equals(activeAddress, sourceAddress, source_network)) {
        return <ActionMessages.WalletMismatchMessage address={sourceAddress} network={source_network} />
    }

    if (hlConfig && activeChain?.id !== hlConfig.signatureChainId) {
        return <ChangeNetworkButton chainId={hlConfig.signatureChainId} network={source_network} />
    }

    return <div className="w-full space-y-3 text-primary-text">
        {error && <WalletMessage status="error" header={error.header} details={error.details} />}
        {rejected && <ActionMessages.TransactionRejectedMessage />}
        {!loading &&
            <ButtonWrapper
                onClick={handleWithdraw}
                icon={<WalletIcon className="stroke-2 w-6 h-6" />}
            >
                {(error || rejected) ? 'Try again' : 'Withdraw from Hyperliquid'}
            </ButtonWrapper>
        }
        {loading &&
            <ButtonWrapper isSubmitting isDisabled icon={<Loader2 className="h-6 w-6 animate-spin" />}>
                Withdrawing
            </ButtonWrapper>
        }
    </div>
}

const SubmittedPanel: FC<{ isDirect: boolean; destination: string; realNetworkName: string; networks: ReturnType<typeof useSettingsState>['networks'] }> = ({ isDirect, destination, realNetworkName, networks }) => {
    const realNetwork = networks.find(n => n.name === realNetworkName)
    const explorerUrl = realNetwork?.account_explorer_template?.replace('{0}', destination)
    const realNetworkLabel = realNetwork?.display_name ?? 'the destination chain'

    return <div className="w-full space-y-3">
        <WalletMessage
            status="pending"
            header="Withdrawal submitted"
            details={isDirect
                ? "Hyperliquid is releasing your USDC — usually arrives in ~5 minutes."
                : `Hyperliquid is releasing your USDC on ${realNetworkLabel} — usually ~5 minutes. We'll continue automatically once it arrives.`}
        />
        {isDirect && explorerUrl &&
            <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="block text-sm text-primary underline underline-offset-2">
                View recipient on explorer
            </a>
        }
    </div>
}

function resolveHyperliquidError(message: string): StepError {
    const lower = message?.toLowerCase() || ''
    if (lower.includes('insufficient'))
        return { header: 'Insufficient balance', details: 'Your Hyperliquid balance is too low to cover this withdrawal and the 0.2 USDC fee.' }
    if (lower.includes('nonce') || lower.includes('time'))
        return { header: 'Please try again', details: 'The request expired or your device clock is out of sync. Try again.' }
    if (lower.includes('does not exist') || lower.includes('account') || lower.includes('user'))
        return { header: 'No Hyperliquid account', details: 'This wallet has no Hyperliquid account or balance.' }
    return { header: 'Withdrawal failed', details: message || 'Hyperliquid rejected the withdrawal.' }
}
