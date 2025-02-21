import { FC, useCallback, useEffect, useState } from 'react'
import { BackendTransactionStatus } from '../../../../lib/layerSwapApiClient';
import useWallet from '../../../../hooks/useWallet';
import { useSwapTransactionStore } from '../../../../stores/swapTransactionStore';
import WalletIcon from '../../../icons/WalletIcon';
import { WithdrawPageProps } from './WalletTransferContent';
import { ButtonWrapper, ChangeNetworkMessage, ConnectWalletButton } from './WalletTransfer/buttons';
import {
    useSelectNetwork,
    useFuel,
    useNetwork,
} from '@fuels/react';
import { useSwapDataState } from '../../../../context/swap';
import { datadogRum } from '@datadog/browser-rum';
import { coinQuantityfy, CoinQuantityLike, Provider, ScriptTransactionRequest } from 'fuels';
import TransactionMessages from '../messages/TransactionMessages';

const FuelWalletWithdrawStep: FC<WithdrawPageProps> = ({ network, callData, swapId, amount, depositAddress, sequenceNumber, token }) => {
    const [loading, setLoading] = useState(false);
    const [buttonClicked, setButtonClicked] = useState(false)
    const [error, setError] = useState<string | undefined>()

    const { setSwapTransaction } = useSwapTransactionStore()

    const { provider } = useWallet(network, 'withdrawal');

    const { network: fuelNetwork, refetch: refetchNetwork } = useNetwork()
    const networkChainId = Number(network?.chain_id)
    const { selectedSourceAccount } = useSwapDataState()
    const { fuel } = useFuel()

    const activeChainId = fuelNetwork?.chainId || (fuelNetwork?.url.includes('testnet') ? 0 : 9889)

    useEffect(() => {
        if (provider?.activeWallet && selectedSourceAccount) {
            provider?.switchAccount && provider?.switchAccount(selectedSourceAccount?.wallet, selectedSourceAccount?.address)
            refetchNetwork()
        }
    }, [selectedSourceAccount, provider?.activeWallet])

    const handleTransfer = useCallback(async () => {
        setButtonClicked(true)
        setError(undefined)
        try {
            setLoading(true)

            if (!network) throw Error("Network not found")
            if (!depositAddress) throw Error("Deposit address not found")
            if (!network.metadata.watchdog_contract) throw Error("Watchdog contract not found")
            if (!amount) throw Error("Amount not found")
            if (!token) throw Error("Token not found")
            if (!callData) throw Error("Call data not found")
            if (!selectedSourceAccount?.address) throw Error("No selected account")

            const fuelProvider = new Provider(network.node_url);
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

            if (swapId && transactionResponse) setSwapTransaction(swapId, BackendTransactionStatus.Completed, transactionResponse.id)

        }
        catch (e) {
            if (e?.message) {
                setError(e.message)
                if (e.message !== "User rejected the transaction!") {
                    const txError = new Error(e.message);
                    txError.name = `SwapWithdrawalError`;
                    txError.cause = e;
                    datadogRum.addError(txError);
                }
                return
            }
        }
        finally {
            setLoading(false)
        }
    }, [swapId, amount, depositAddress, network, selectedSourceAccount, token, sequenceNumber, fuel])

    if (!provider?.activeWallet) {
        return <ConnectWalletButton />
    }
    else if (network && activeChainId !== undefined && networkChainId !== activeChainId) {
        return <ChangeNetworkButton
            onChange={refetchNetwork}
            chainId={networkChainId}
            network={network.display_name}
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
                <ButtonWrapper isDisabled={!!loading} isSubmitting={!!loading} onClick={handleTransfer} icon={<WalletIcon className="stroke-2 w-6 h-6" aria-hidden="true" />} >
                    Send from wallet
                </ButtonWrapper>
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
        const renderingError = new Error(error);
        renderingError.name = `SwapWithdrawalError`;
        renderingError.cause = error;
        datadogRum.addError(renderingError);

        return <TransactionMessages.UexpectedErrorMessage message={error} />
    }
    else return <></>
}

export default FuelWalletWithdrawStep;