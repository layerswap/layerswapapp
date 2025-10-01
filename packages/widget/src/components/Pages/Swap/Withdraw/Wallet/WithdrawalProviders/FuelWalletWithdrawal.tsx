import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import useWallet from '@/hooks/useWallet';
import WalletIcon from '@/components/Icons/WalletIcon';
import { ButtonWrapper, ChangeNetworkMessage, ConnectWalletButton, SendTransactionButton } from '../Common/buttons';
import {
    useSelectNetwork,
    useFuel,
    useNetwork,
} from '@fuels/react';
import { coinQuantityfy, CoinQuantityLike, Provider, ScriptTransactionRequest } from 'fuels';
import { TransferProps, WithdrawPageProps } from '../Common/sharedTypes';
import TransactionMessages from '../../messages/TransactionMessages';
import { useSelectedAccount } from '@/context/balanceAccounts';

export const FuelWalletWithdrawStep: FC<WithdrawPageProps> = ({ swapBasicData, refuel }) => {
    const [loading, setLoading] = useState(false);
    const [buttonClicked, setButtonClicked] = useState(false)
    const [error, setError] = useState<string | undefined>()
    const { source_network, source_token } = swapBasicData;
    const { provider } = useWallet(source_network, 'withdrawal');
    const selectedSourceAccount = useSelectedAccount("from", source_network?.name);
    const { network: fuelNetwork, refetch: refetchNetwork } = useNetwork()
    const networkChainId = Number(source_network?.chain_id)
    const { fuel } = useFuel()

    const activeChainId = fuelNetwork?.chainId || (fuelNetwork?.url.includes('testnet') ? 0 : 9889)

    useEffect(() => {
        if (selectedSourceAccount && selectedSourceAccount?.address) {
            provider?.switchAccount && provider?.switchAccount(selectedSourceAccount.wallet, selectedSourceAccount?.address)
            refetchNetwork()
        }
    }, [selectedSourceAccount])

    const handleTransfer = useCallback(async ({ amount, callData, depositAddress, swapId }: TransferProps) => {
        setButtonClicked(true)
        setError(undefined)
        try {
            setLoading(true)

            if (!source_network) throw Error("Network not found")
            if (!depositAddress) throw Error("Deposit address not found")
            if (!source_network.metadata?.watchdog_contract) throw Error("Watchdog contract not found")
            if (!amount) throw Error("Amount not found")
            if (!source_token) throw Error("Token not found")
            if (!callData) throw Error("Call data not found")
            if (!selectedSourceAccount?.address) throw Error("No selected account")

            const fuelProvider = new Provider(source_network.node_url);
            const fuelWallet = await fuel.getWallet(selectedSourceAccount.address, fuelProvider);

            if (!fuelWallet) throw Error("Fuel wallet not found")

            type FuelPrepareData = {
                script: ScriptTransactionRequest,
                quantities: CoinQuantityLike[]
            }
            var parsedCallData: FuelPrepareData = JSON.parse(callData);
            var scriptTransaction = ScriptTransactionRequest.from(parsedCallData.script);
            var quantitiesParsed = parsedCallData.quantities.map(q => coinQuantityfy(q));

            await scriptTransaction.estimateAndFund(fuelWallet, {
                quantities: quantitiesParsed
            });

            await fuelProvider.simulate(scriptTransaction);

            const transactionResponse = await fuelWallet.sendTransaction(scriptTransaction);

            if (swapId && transactionResponse) {
                return transactionResponse.id;
            }

        }
        catch (e) {
            setLoading(false)
            if (e?.message) {
                setError(e.message)
            }
            throw e
        }
    }, [source_network, selectedSourceAccount, source_token, fuel])

    if (!selectedSourceAccount) {
        return <ConnectWalletButton />
    }
    else if (source_network && activeChainId !== undefined && networkChainId !== activeChainId) {
        return <ChangeNetworkButton
            onChange={refetchNetwork}
            chainId={networkChainId}
            network={source_network.display_name}
        />
    }
    return (
        <div className="w-full space-y-3 flex flex-col justify-between h-full text-primary-text">
            {
                buttonClicked &&
                <TransactionMessage
                    error={error}
                    isLoading={loading}
                />
            }
            {
                !loading &&
                <SendTransactionButton
                    isDisabled={!!loading}
                    isSubmitting={!!loading}
                    onClick={handleTransfer}
                    icon={<WalletIcon className="stroke-2 w-6 h-6" aria-hidden="true" />}
                    swapData={swapBasicData}
                    refuel={refuel}
                />
            }
        </div>
    )
}

const ChangeNetworkButton: FC<{ chainId: number, network: string, onChange: () => void }> = ({ chainId, network, onChange }) => {
    const { selectNetworkAsync, error, isPending, isError } = useSelectNetwork();

    const clickHandler = useCallback(async () => {
        await selectNetworkAsync({ chainId });
        onChange();
    }, [selectNetworkAsync, chainId])

    return <div className="w-full space-y-3 flex flex-col justify-between h-full text-primary-text">

        {
            <ChangeNetworkMessage
                data={{
                    isPending: isPending,
                    isError: isError,
                    error
                }}
                network={network}
            />
        }
        {
            !isPending &&
            <ButtonWrapper
                onClick={clickHandler}
                icon={<WalletIcon className="stroke-2 w-6 h-6" />}
            >
                {
                    error ? <span>Try again</span>
                        : <span>Switch network</span>
                }
            </ButtonWrapper>
        }
    </div>
}

const TransactionMessage: FC<{ isLoading: boolean, error: string | undefined }> = ({ isLoading, error }) => {
    if (isLoading) {
        return <TransactionMessages.ConfirmTransactionMessage />
    }
    else if (error === "The account(s) sending the transaction don't have enough funds to cover the transaction."
        || error === "the target cannot be met due to no coins available or exceeding the 255 coin limit."
    ) {
        return <TransactionMessages.InsufficientFundsMessage />
    }
    else if (error === "Request cancelled without user response!" || error === "User rejected the transaction!" || error === "User canceled sending transaction") {
        return <TransactionMessages.TransactionRejectedMessage />
    }
    else if (error) {
        return <TransactionMessages.UexpectedErrorMessage message={error} />
    }
    else return <></>
}