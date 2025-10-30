import { FC, useCallback, useEffect, useState } from "react";
import { PublishedSwapTransactions, SwapBasicData } from "@/lib/apiClients/layerSwapApiClient";
import { WithdrawalProvider } from "@/context/withdrawalContext";
import useWallet from "@/hooks/useWallet";
import { useSelectedAccount } from "@/context/balanceAccounts";
import { WithdrawPageProps } from "./Common/sharedTypes";
import { ChangeNetworkButton, ConnectWalletButton, SendTransactionButton } from "./Common/buttons";
import { useInitialSettings, useSettingsState } from "@/context/settings";
import WalletIcon from "@/components/Icons/WalletIcon";
import { useBalance } from "@/lib/balances/useBalance";
import { MultiStepHandler, TransferProps } from "@/types";
import { ActionMessage } from "./Common/actionMessage";
import { ActionMessages } from "../messages/TransactionMessages";
// import { posthog } from "posthog-js";

type Props = {
    swapData: SwapBasicData
    swapId: string | undefined
    refuel: boolean
    onWalletWithdrawalSuccess?: () => void
};
export const WalletTransferAction: FC<Props> = ({ swapData, swapId, refuel, onWalletWithdrawalSuccess }) => {
    const { source_network } = swapData

    const { provider, wallets } = useWallet(source_network, "withdrawal")
    const selectedSourceAccount = useSelectedAccount("from", source_network?.name);

    useEffect(() => {
        const selectedWallet = wallets.find(w => w.id === selectedSourceAccount?.id && w.withdrawalSupportedNetworks?.includes(source_network?.name))
        if (selectedSourceAccount && selectedWallet) {
            provider?.switchAccount(selectedWallet, selectedSourceAccount.address)
        }
    }, [selectedSourceAccount?.address, source_network?.name])

    return <>
        {
            swapData &&
            <WithdrawalProvider onWalletWithdrawalSuccess={onWalletWithdrawalSuccess}>
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
    const { wallets, provider, providerModules } = useWallet(source_network, "withdrawal")
    const { sameAccountNetwork } = useInitialSettings()
    const wallet = wallets.find(w => w.id === selectedSourceAccount?.id && w.withdrawalSupportedNetworks?.includes(source_network?.name))
    const networkChainId = Number(source_network?.chain_id) ?? undefined
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

    const multiStepHandlers = providerModules.map(module => (module.multiStepHandler && module.id === provider?.id) ? module.multiStepHandler : undefined)
        .filter(module => module !== undefined && module?.supportedNetworks.includes(source_network?.name)) as MultiStepHandler[];

    const MultiStepHandler = multiStepHandlers.find(handler => handler.supportedNetworks.includes(source_network?.name))?.component

    if (provider?.multiStepHandlers || MultiStepHandler) {
        const MultiStepHandlerComponent = provider?.multiStepHandlers ? provider.multiStepHandlers.find(handler => handler.supportedNetworks.includes(source_network?.name))?.component : MultiStepHandler

        if (MultiStepHandlerComponent) {
            return <MultiStepHandlerComponent
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
    else if (wallet.chainId && wallet.chainId !== networkChainId && source_network) {
        return <ChangeNetworkButton
            chainId={networkChainId}
            network={source_network}
        />
    }
    else {
        return <TransferTokenButton
            swapData={swapBasicData}
            refuel={refuel}
            chainId={networkChainId}
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

    const clickHandler = useCallback(async ({ amount, callData, depositAddress }: TransferProps) => {
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
            })
            if (!tx)
                throw new Error('No transaction')

            if (tx) {
                return tx
            }

        } catch (e) {
            setLoading(false)
            setError(e)

            throw e
        }
    }, [provider, chainId, selectedSourceAccount?.address])


    return <div className="w-full space-y-3 flex flex-col justify-between h-full text-primary-text">
        {
            buttonClicked &&
            <ActionMessage
                error={error}
                isLoading={loading}
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