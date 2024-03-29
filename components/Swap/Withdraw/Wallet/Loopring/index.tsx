import { ArrowLeftRight, Lock } from 'lucide-react';
import { FC, useCallback, useState } from 'react'
import SubmitButton from '../../../../buttons/submitButton';
import { useSwapDataState } from '../../../../../context/swap';
import toast from 'react-hot-toast';
import { useSettingsState } from '../../../../../context/settings';
import { useAccount, useNetwork } from 'wagmi';
import { ChangeNetworkButton, ConnectWalletButton } from '../WalletTransfer/buttons';
import WalletMessage from '../WalletTransfer/message';
import { useSwapTransactionStore } from '../../../../../stores/swapTransactionStore';
import SignatureIcon from '../../../../icons/SignatureIcon';
import { ActivationTokenPicker } from './ActivationTokentPicker';
import { useActivationData, useLoopringAccount, useLoopringTokens } from './hooks';
import { LoopringAPI } from '../../../../../lib/loopring/LoopringAPI';
import { UnlockedAccount } from '../../../../../lib/loopring/defs';
import { BackendTransactionStatus } from '../../../../../lib/layerSwapApiClient';

type Props = {
    depositAddress?: string,
    amount?: number
}

const LoopringWalletWithdraw: FC<Props> = ({ depositAddress, amount }) => {
    const [loading, setLoading] = useState(false);
    const [transferDone, setTransferDone] = useState<boolean>();
    const [activationPubKey, setActivationPubKey] = useState<{ x: string; y: string }>()
    const [selectedActivationAsset, setSelectedActivationAsset] = useState<string>()
    const { chain } = useNetwork()
    const { swap } = useSwapDataState();
    const { layers } = useSettingsState();
    const { setSwapTransaction } = useSwapTransactionStore();
    const { isConnected, address: fromAddress, connector } = useAccount();
    const { source_network: source_network_internal_name } = swap || {}
    const source_network = layers.find(n => n.internal_name === source_network_internal_name);
    const token = layers?.find(n => swap?.source_network == n?.internal_name)?.assets.find(c => c.asset == swap?.source_network_asset);
    const { account: accInfo, isLoading: loadingAccount, noAccount, mutate: refetchAccount } = useLoopringAccount({ address: fromAddress })
    const { availableBalances, defaultValue, loading: activationDataIsLoading, feeData } = useActivationData(accInfo?.accountId)
    const [unlockedAccount, setUnlockedAccount] = useState<UnlockedAccount>()
    const { tokens } = useLoopringTokens()
    const loopringToken = tokens?.find(t => t.name === selectedActivationAsset)

    const handleUnlockAccount = useCallback(async () => {
        setLoading(true)
        try {
            if (!accInfo)
                return
            const res = await LoopringAPI.userAPI.unlockAccount(accInfo)
            setUnlockedAccount(res)
        }
        catch (e) {
            toast(e.message)
        }
        finally {
            setLoading(false)
        }
    }, [accInfo])

    const activateAccout = useCallback(async () => {
        setLoading(true)

        try {
            if (!accInfo || !selectedActivationAsset || !loopringToken)
                return

            await LoopringAPI.userAPI.activateAccount({ accInfo, token: { id: loopringToken?.tokenId, symbol: loopringToken?.name } })
            await refetchAccount()
        }
        catch (e) {
            toast(e.message)
        }
        finally {
            setLoading(false)
        }
    }, [accInfo, selectedActivationAsset, refetchAccount, loopringToken])

    const handleTransfer = useCallback(async () => {
        setLoading(true)
        try {

            if (!swap || !accInfo || !unlockedAccount || !token)
                return

            const transferResult = await LoopringAPI.userAPI.transfer({
                accInfo,
                amount: swap.requested_amount.toString(),
                depositAddress: depositAddress as `0x${string}`,
                sequence_number: swap?.sequence_number.toString(),
                token,
                unlockedAccount
            })
            if (transferResult.hash) {
                setSwapTransaction(swap.id, BackendTransactionStatus.Pending, transferResult.hash);
                setTransferDone(true)
            }
            else {
                toast(transferResult.resultInfo?.message || "Unexpected error.")
            }
        }
        catch (e) {
            if (e?.message)
                toast(e.message)
        }
        setLoading(false)
    }, [swap, source_network, depositAddress, accInfo, unlockedAccount, token])

    if (noAccount) {
        //TODO fix text
        return <WalletMessage
            status="error"
            header='Account is not activated'
            details={`Make a deposit to your address for activating Loopring account`} />
    }

    if (accInfo?.frozen) {
        if (accInfo.publicKey.x === activationPubKey?.x
            && accInfo.publicKey.y === activationPubKey?.y) {
            return <WalletMessage
                status="pending"
                header='Your account is beeing activated'
                details={`You will be able to make transfers in 3-5 minutes.`} />
        }
        else {
            return <WalletMessage
                status="pending"
                header='Your account is frozen'
                details={`If you have just activated your account it will be unfrozen in couple of minutes.`} />
        }
    }

    if (!isConnected) {
        return <ConnectWalletButton />
    }

    if (source_network && chain?.id !== Number(source_network.chain_id)) {
        return (
            <ChangeNetworkButton
                chainId={Number(source_network?.chain_id)}
                network={source_network?.display_name}
            />
        )
    }

    const shouldActivate = accInfo && !(accInfo.publicKey.x
        || accInfo.publicKey.y)

    if (shouldActivate && !activationDataIsLoading && (!availableBalances || !defaultValue || !feeData))
        return <WalletMessage
            status="error"
            header='Not enough fee'
            details={`The balance of the account is not enough to activate it․`} />

    return (
        <>
            <div className="w-full space-y-5 flex flex-col justify-between h-full text-secondary-text">
                <div className='space-y-4'>
                    {
                        (accInfo && unlockedAccount) ?
                            <SubmitButton isDisabled={!!(loading || transferDone)} isSubmitting={!!(loading || transferDone)} onClick={handleTransfer} icon={<ArrowLeftRight className="h-5 w-5 ml-2" aria-hidden="true" />} >
                                Send from wallet
                            </SubmitButton>
                            :
                            <>
                                {shouldActivate &&
                                    <ActivationTokenPicker
                                        onChange={setSelectedActivationAsset}
                                        availableBalances={availableBalances}
                                        defaultValue={defaultValue}
                                        feeData={feeData}
                                    />
                                }
                                <SubmitButton
                                    isDisabled={loadingAccount || !accInfo || loading || activationDataIsLoading}
                                    isSubmitting={loadingAccount || loading}
                                    onClick={shouldActivate ? activateAccout : handleUnlockAccount}
                                    icon={shouldActivate ?
                                        <SignatureIcon className="h-5 w-5 ml-2" aria-hidden="true" />
                                        : <Lock className="h-5 w-5 ml-2" aria-hidden="true" />
                                    }
                                >
                                    {shouldActivate ? <>Activate account</> : <>Unlock account</>}
                                </SubmitButton>
                            </>
                    }
                </div>
            </div>
        </>
    )
}

export default LoopringWalletWithdraw