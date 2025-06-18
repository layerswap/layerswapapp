import { WalletIcon } from 'lucide-react';
import { FC, useCallback, useState } from 'react'
import useWallet from '@/hooks/useWallet';
import { useSettingsState } from '@/context/settings';
import KnownInternalNames from '@/lib/knownIds';
import toast from 'react-hot-toast';
import { AuthorizeStarknet } from '@/lib/wallets/paradex/Authorize/Starknet';
import { TransferProps, WithdrawPageProps } from '../../Common/sharedTypes';
import { SendTransactionButton } from '../../Common/buttons';

const StarknetComponent: FC<WithdrawPageProps> = ({ token }) => {

    const [loading, setLoading] = useState(false)

    const { networks } = useSettingsState();
    const starknet = networks.find(n => n.name === KnownInternalNames.Networks.StarkNetMainnet || n.name === KnownInternalNames.Networks.StarkNetGoerli || n.name === KnownInternalNames.Networks.StarkNetSepolia);

    const { provider } = useWallet(starknet, 'withdrawal')
    const wallet = provider?.activeWallet

    const handleTransfer = useCallback(async ({ amount, callData, swapId }: TransferProps) => {
        if (!swapId || !token) {
            return
        }
        setLoading(true)
        try {
            if (!wallet) {
                throw Error("Starknet wallet not connected")
            }

            if (amount == undefined && !amount)
                throw Error("No amount")

            try {
                const snAccount = wallet?.metadata?.starknetAccount
                if (!snAccount) {
                    throw Error("Starknet account not found")
                }
                const paradexAccount = await AuthorizeStarknet(snAccount)

                const parsedCallData = JSON.parse(callData || "")

                const res = await paradexAccount.execute(parsedCallData, undefined, { maxFee: '1000000000000000' });

                if (res.transaction_hash) {
                    return res.transaction_hash
                }
            }
            catch (e) {
                toast(e.message)
            }
        }
        catch (e) {
            if (e?.message)
                toast(e.message)
        }
        setLoading(false)
    }, [wallet?.address, starknet, token])


    return (
        <div className="w-full space-y-5 flex flex-col justify-between h-full text-secondary-text">
            {
                wallet &&
                <div className="flex flex-row
                    text-primary-text text-base space-x-2">
                    <SendTransactionButton
                        isDisabled={!!(loading)}
                        isSubmitting={!!(loading)}
                        onClick={handleTransfer}
                        icon={<WalletIcon className="h-5 w-5 ml-2" aria-hidden="true" />} >
                        Send from Starknet wallet
                    </SendTransactionButton>
                </div>
            }
        </div >
    )
}
export default StarknetComponent;