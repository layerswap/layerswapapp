import { FC, useEffect, useState } from "react";
import { ButtonWrapper } from "./Common/buttons";
import { AddEthereumChainParams, SuggestRpcResult } from "@layerswap/widget-types";
import FailIcon from "@/components/Icons/FailIcon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@layerswap/ui-kit";
import { useCopyClipboard } from "@layerswap/utils";
import { Check, CopyIcon } from "lucide-react";
import { Network } from "@layerswap/widget-types";
import { KnownInternalNames } from "@layerswap/utils";

const HEALTH_CHECK_INTERVAL = 1500 // 1.5 seconds

type Props = {
    network: Network
    suggestRpcForCurrentChain: (rpcUrl: string, chainDetails: Omit<AddEthereumChainParams, 'chainId' | 'rpcUrls'>) => Promise<SuggestRpcResult>
    isSuggestingRpc: boolean
    checkManually: () => Promise<void>
}

const RPCUnhealthyMessage: FC<Props> = ({ network, suggestRpcForCurrentChain, isSuggestingRpc, checkManually }) => {
    const [rpcAddStatus, setRpcAddStatus] = useState<'idle' | 'success' | 'error'>('idle')

    // Poll health check while unhealthy
    useEffect(() => {
        const interval = setInterval(() => {
            checkManually()
        }, HEALTH_CHECK_INTERVAL)

        return () => clearInterval(interval)
    }, [checkManually])

    const handleAddRpc = async () => {
        setRpcAddStatus('idle')
        const isTempo = network.name === KnownInternalNames.Networks.TempoMainnet
            || network.name === KnownInternalNames.Networks.TempoTestnet
        try {
            const result = await suggestRpcForCurrentChain(network.node_url, {
                chainName: network.display_name,
                // Tempo has no native token; USD with 18 decimals is wallet compatibility metadata.
                nativeCurrency: isTempo ? { name: 'USD', symbol: 'USD', decimals: 18 } : {
                    name: network.display_name,
                    symbol: network.token?.asset,
                    decimals: network.token?.decimals
                }
            })
            setRpcAddStatus(result.success ? 'success' : 'error')
        } catch {
            setRpcAddStatus('error')
        }
    }

    return (
        <div className="w-full space-y-3 h-fit text-primary-text">
            <MessageContent
                RPCUrl={network.node_url}
                isSuggestingRpc={isSuggestingRpc}
                rpcAddStatus={rpcAddStatus}
            />
            {
                rpcAddStatus !== "success" &&
                <ButtonWrapper
                    onClick={handleAddRpc}
                    isDisabled={isSuggestingRpc}
                >
                    {isSuggestingRpc ? 'Confirm in wallet...' : 'Add RPC URL to wallet'}
                </ButtonWrapper>
            }
        </div>
    )
}

type MessageContentProps = {
    RPCUrl: string
    isSuggestingRpc: boolean
    rpcAddStatus: 'idle' | 'success' | 'error'
}

const MessageContent: FC<MessageContentProps> = ({ RPCUrl, isSuggestingRpc, rpcAddStatus }) => {
    const [isCopied, setCopied] = useCopyClipboard(2000)
    const title = rpcAddStatus === 'success'
        ? 'RPC URL added successfully'
        : rpcAddStatus === 'error'
            ? 'Could not add RPC URL'
            : 'Your wallet RPC has network issues'

    const getMessage = () => {
        if (isSuggestingRpc) {
            return <p className="text-secondary-text text-sm leading-[18px]">
                Please confirm the RPC change in your wallet...
            </p>
        }
        if (rpcAddStatus === 'success') {
            return <p className="text-secondary-text text-sm leading-[18px]">
                RPC URL added! Please switch to the new RPC in your wallet settings.
            </p>
        }
        if (rpcAddStatus === 'error') {
            return <div className="space-y-2 text-secondary-text text-sm leading-[18px]" aria-live="polite">
                <p>We couldn’t add the RPC URL automatically. Copy it below and update it in your wallet’s network settings.</p>
                <button
                    type="button"
                    onClick={() => setCopied(RPCUrl)}
                    aria-label="Copy RPC URL"
                    className="flex items-center gap-2 w-full text-left text-primary-text hover:underline"
                >
                    <span className="break-all">{RPCUrl}</span>
                    {isCopied ? <Check className="h-4 w-4 shrink-0" /> : <CopyIcon className="h-4 w-4 shrink-0" />}
                </button>
            </div>
        }
        return <p className="text-secondary-text text-sm leading-[18px] space-x-1">
            <span>Update your RPC URL manually or add our</span>
            <Tooltip>
                <TooltipTrigger onClick={() => setCopied(RPCUrl)}>
                    <span className="text-primary-text cursor-pointer underline flex items-baseline gap-1">
                        {isCopied ? (
                            <Check className="h-3 w-3" />
                        ) : <CopyIcon className="h-3 w-3" />}
                        <span>RPC URL</span>
                    </span>
                </TooltipTrigger>
                <TooltipContent sticky="always">
                    <span className="flex items-center gap-1">
                        <span>{RPCUrl}</span>
                    </span>
                </TooltipContent>
            </Tooltip>
            <span>to your wallet</span>
        </p>
    }

    return <div className="px-2 py-3 rounded-2xl bg-secondary-400">
        <div className="flex items-start gap-2 relative">
            <span className="shrink-0 p-0.5">
                {rpcAddStatus === 'success' ? (
                    <Check className="relative top-0 left-0 h-5 w-5 text-green-500" />
                ) : (
                    <FailIcon className="relative top-0 left-0 h-5 w-5" />
                )}
            </span>
            <div className="flex flex-col gap-1">
                <p className="text-white font-medium leading-4 text-base mt-0.5">
                    {title}
                </p>
                {getMessage()}
            </div>
        </div>
    </div>
}

export default RPCUnhealthyMessage
