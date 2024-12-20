import { FC, useCallback, useState } from 'react'
import toast from 'react-hot-toast';
import { BackendTransactionStatus } from '../../../../lib/layerSwapApiClient';
import useWallet from '../../../../hooks/useWallet';
import { useSwapTransactionStore } from '../../../../stores/swapTransactionStore';
import WalletIcon from '../../../icons/WalletIcon';
import { WithdrawPageProps } from './WalletTransferContent';
import { ButtonWrapper, ConnectWalletButton } from './WalletTransfer/buttons';
import { useSettingsState } from '../../../../context/settings';
import {
    useWallet as useFuelWallet,
} from '@fuels/react';
import { bn } from 'fuels';

const FuelWalletWithdrawStep: FC<WithdrawPageProps> = ({ network, callData, swapId, token, amount }) => {
    const [loading, setLoading] = useState(false);
    const { setSwapTransaction } = useSwapTransactionStore()

    const { provider } = useWallet(network, 'withdrawal');
    const { wallet: fuelWallet } = useFuelWallet()

    const wallet = provider?.activeWallet
    const networkName = network?.name

    const { networks } = useSettingsState()
    const networkWithTokens = networks.find(n => n.name === networkName)

    const handleTransfer = useCallback(async () => {
        setLoading(true)
        try {

            if (!fuelWallet) throw Error("Fuel wallet not connected")

            // The amount of coins to transfer.
            const bnAmount = bn(amount);

            // Create a transaction request using wallet helper
            const transactionRequest = token?.contract ? await fuelWallet.createTransfer('0x9E22044B082B1ff5B2b824De1068F9A04A02ff0E1d36807B2b9Dda8bB65071C3', bnAmount, token?.contract) : await fuelWallet.createTransfer('0x9E22044B082B1ff5B2b824De1068F9A04A02ff0E1d36807B2b9Dda8bB65071C3', bnAmount);

            // Broadcast the transaction to the network
            const transactionResponse = await fuelWallet.sendTransaction(
                transactionRequest, // The transaction to send
            )

            if (swapId && transactionResponse) setSwapTransaction(swapId, BackendTransactionStatus.Completed, transactionResponse.id)

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

    if (!fuelWallet) {
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