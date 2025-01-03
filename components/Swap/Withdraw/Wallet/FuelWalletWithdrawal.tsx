import { FC, useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import { BackendTransactionStatus } from '../../../../lib/layerSwapApiClient';
import useWallet from '../../../../hooks/useWallet';
import { useSwapTransactionStore } from '../../../../stores/swapTransactionStore';
import WalletIcon from '../../../icons/WalletIcon';
import { WithdrawPageProps } from './WalletTransferContent';
import { ButtonWrapper, ChangeNetworkMessage, ConnectWalletButton } from './WalletTransfer/buttons';
import {
    useWallet as useFuelWallet,
    useChain,
    useSelectNetwork,
} from '@fuels/react';
import { useSwapDataState } from '../../../../context/swap';
import { datadogRum } from '@datadog/browser-rum';

const FuelWalletWithdrawStep: FC<WithdrawPageProps> = ({ network, callData, swapId }) => {
    const [loading, setLoading] = useState(false);
    const { setSwapTransaction } = useSwapTransactionStore()

    const { provider } = useWallet(network, 'withdrawal');
    const { wallet: fuelWallet } = useFuelWallet()
    const { chain, refetch } = useChain()
    const wallet = provider?.activeWallet
    const networkChainId = Number(network?.chain_id)
    const activeChainId = Number(chain?.consensusParameters.chainId)
    const { selectedSourceAccount } = useSwapDataState()

    useEffect(() => {
        if (provider?.activeWallet && !fuelWallet && selectedSourceAccount) {
            provider?.switchAccount && provider?.switchAccount(selectedSourceAccount?.wallet, selectedSourceAccount?.address)
        }
    }, [selectedSourceAccount, provider?.activeWallet, fuelWallet])

    const handleTransfer = useCallback(async () => {
        try {
            setLoading(true)

            if (!fuelWallet) throw Error("Fuel wallet not connected")
            if (!callData) throw Error("Call data not found")

            const tx = JSON.parse(callData)
            datadogRum.addAction('fuelTransfer', tx);

            const transactionResponse = await fuelWallet.sendTransaction(tx)

            if (swapId && transactionResponse) setSwapTransaction(swapId, BackendTransactionStatus.Completed, transactionResponse.id)

        }
        catch (e) {
            if (e?.message) {
                toast(e.message)
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
    }, [swapId, callData, fuelWallet])

    if (!wallet) {
        return <ConnectWalletButton />
    }
    else if (network && activeChainId !== undefined && networkChainId !== activeChainId) {
        return <ChangeNetworkButton
            onChange={refetch}
            chainId={networkChainId}
            network={network.display_name}
        />
    }
    return (
        <div className="w-full space-y-5 flex flex-col justify-between h-full text-primary-text">
            {
                wallet &&
                <ButtonWrapper isDisabled={!!loading || !fuelWallet} isSubmitting={!!loading || !fuelWallet} onClick={handleTransfer} icon={<WalletIcon className="stroke-2 w-6 h-6" aria-hidden="true" />} >
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

    return <>
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
    </>
}

export default FuelWalletWithdrawStep;