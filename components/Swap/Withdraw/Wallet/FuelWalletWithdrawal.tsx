import { FC, useCallback, useState } from 'react'
import toast from 'react-hot-toast';
import { BackendTransactionStatus } from '../../../../lib/layerSwapApiClient';
import useWallet from '../../../../hooks/useWallet';
import { useSwapTransactionStore } from '../../../../stores/swapTransactionStore';
import WalletIcon from '../../../icons/WalletIcon';
import { WithdrawPageProps } from './WalletTransferContent';
import { ButtonWrapper, ConnectWalletButton } from './WalletTransfer/buttons';
import {
    useWallet as useFuelWallet,
} from '@fuels/react';
import { Provider, Contract } from 'fuels';
import FuelWatchContractABI from '../../../../lib/abis/FuelWatchContractABI.json';

const FuelWalletWithdrawStep: FC<WithdrawPageProps> = ({ network, callData, swapId, token, amount, depositAddress }) => {
    const [loading, setLoading] = useState(false);
    const { setSwapTransaction } = useSwapTransactionStore()

    const { provider } = useWallet(network, 'withdrawal');
    const { wallet: fuelWallet } = useFuelWallet()
    const wallet = provider?.activeWallet

    const handleTransfer = useCallback(async () => {
        setLoading(true)
        try {

            if (!fuelWallet) throw Error("Fuel wallet not connected")
            if (!network) throw Error("Network not found")

            const fuelProvider = await Provider.create(network.node_url);
            const contract = new Contract('0x9599a0fee081405d22a33b1ce892b47688660a38c5f8509559f34a3f960b89f7', FuelWatchContractABI, fuelWallet);

            const { waitForResult } = await contract.functions
                .test_function(42069)
                .addTransfer({
                    destination: depositAddress as string,
                    amount: 100,
                    assetId: fuelProvider.getBaseAssetId(),
                })
                .call();

            const transactionResponse = await waitForResult()

            // if (swapId && transactionResponse) setSwapTransaction(swapId, BackendTransactionStatus.Completed, transactionResponse.id)

        }
        catch (e) {
            if (e?.message) {
                toast(e.message)
                return
            }
        }
        finally {
            setLoading(false)
        }
    }, [swapId, callData, network, token, amount, fuelWallet])

    if (!wallet) {
        return <ConnectWalletButton />
    }

    return (
        <div className="w-full space-y-5 flex flex-col justify-between h-full text-primary-text">
            {
                fuelWallet &&
                <ButtonWrapper isDisabled={!!loading} isSubmitting={!!loading} onClick={handleTransfer} icon={<WalletIcon className="stroke-2 w-6 h-6" aria-hidden="true" />} >
                    Send from wallet
                </ButtonWrapper>
            }
        </div>
    )
}

export default FuelWalletWithdrawStep;