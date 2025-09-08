import { ArrowLeftRight, Lock } from 'lucide-react';
import { FC, useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import { useAccount } from 'wagmi';
import { ActivationTokenPicker } from './ActivationTokentPicker';
import { useActivationData, useLoopringAccount, useLoopringTokens } from './hooks';
import { LoopringAPI } from '@/lib/loopring/LoopringAPI';
import { ChainId, UnlockedAccount } from '@/lib/loopring/defs';
import { useConfig } from 'wagmi'
import AppSettings from '@/lib/AppSettings';
import { TransferProps, WithdrawPageProps } from '../../Common/sharedTypes';
import WalletMessage from '../../../messages/Message';
import { ButtonWrapper, ChangeNetworkButton, ConnectWalletButton, SendTransactionButton } from '../../Common/buttons';
import SignatureIcon from '@/components/icons/SignatureIcon';
import WalletIcon from '@/components/icons/WalletIcon';

export const LoopringWalletWithdraw: FC<WithdrawPageProps> = ({ swapBasicData, refuel, handleClearAmount }) => {
    const [loading, setLoading] = useState(false);
    const [transferDone, setTransferDone] = useState<boolean>();
    const [activationPubKey, setActivationPubKey] = useState<{ x: string; y: string }>()
    const [selectedActivationAsset, setSelectedActivationAsset] = useState<string>()
    const { source_network, source_token } = swapBasicData;

    const { isConnected, address: fromAddress, chain } = useAccount();
    const { account: accInfo, isLoading: loadingAccount, noAccount, mutate: refetchAccount } = useLoopringAccount({ address: fromAddress })
    const { availableBalances, defaultValue, loading: activationDataIsLoading, feeData } = useActivationData(accInfo?.accountId)
    const [unlockedAccount, setUnlockedAccount] = useState<UnlockedAccount | undefined>()
    const { tokens } = useLoopringTokens()
    const loopringToken = tokens?.find(t => t.symbol === selectedActivationAsset)
    const config = useConfig()

    useEffect(() => {
        if (fromAddress) {
            setUnlockedAccount(undefined)
        }
    }, [fromAddress])

    const handleUnlockAccount = useCallback(async () => {
        setLoading(true)
        try {
            if (!accInfo)
                return
            const res = await LoopringAPI.userAPI.unlockAccount(accInfo, config)
            setUnlockedAccount(res)
        }
        catch (e) {
            toast(e.message)
            throw e
        }
        finally {
            setLoading(false)
        }
    }, [accInfo, config])

    const activateAccout = useCallback(async () => {
        setLoading(true)
        try {
            if (!accInfo || !selectedActivationAsset || !loopringToken)
                return

            const publicKey = await LoopringAPI.userAPI.activateAccount(
                {
                    accInfo,
                    token: { id: loopringToken?.tokenId, symbol: loopringToken?.symbol }
                }, config)
            setActivationPubKey(publicKey)
            await refetchAccount()
        }
        catch (e) {
            toast(e.message)
        }
        finally {
            setLoading(false)
        }
    }, [accInfo, selectedActivationAsset, refetchAccount, loopringToken])

    const handleTransfer = useCallback(async ({ amount, callData, depositAddress, swapId }: TransferProps) => {
        setLoading(true)
        try {
            if (!swapId || !accInfo || !unlockedAccount || !source_token || !amount)
                return

            const transferResult = await LoopringAPI.userAPI.transfer({
                accInfo,
                amount: amount.toString(),
                depositAddress: depositAddress as `0x${string}`,
                call_data: callData,
                token: source_token,
                unlockedAccount
            }, config)
            if (transferResult.hash) {
                setTransferDone(true)
                handleClearAmount?.()
                return transferResult.hash
            }
            else {
                toast(transferResult.resultInfo?.message || "Unexpected error.")
            }
        }
        catch (e) {
            setLoading(false)
            if (e?.message)
                toast(e.message)
        }
    }, [source_network, accInfo, unlockedAccount, source_token])

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
    let walletChainId = AppSettings.ApiVersion === "sandbox" ? ChainId.SEPOLIA : ChainId.MAINNET
    if (source_network && chain?.id !== Number(walletChainId)) {
        return (
            <ChangeNetworkButton
                chainId={Number(walletChainId)}
                network={source_network}
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
                            <SendTransactionButton
                                isDisabled={!!(loading || transferDone)}
                                onClick={handleTransfer}
                                icon={<WalletIcon className="stroke-2 w-6 h-6" />}
                                swapData={swapBasicData}
                                refuel={refuel}
                            />
                            :
                            <>
                                {shouldActivate &&
                                    <ActivationTokenPicker
                                        onSelect={setSelectedActivationAsset}
                                        selectedValue={selectedActivationAsset}
                                        availableBalances={availableBalances}
                                        defaultValue={defaultValue}
                                        feeData={feeData}
                                    />
                                }
                                <ButtonWrapper
                                    isDisabled={loadingAccount || !accInfo || loading || activationDataIsLoading}
                                    isSubmitting={loadingAccount || loading}
                                    onClick={shouldActivate ? activateAccout : handleUnlockAccount}
                                    icon={shouldActivate ?
                                        <SignatureIcon className="h-5 w-5 ml-2" aria-hidden="true" />
                                        : <Lock className="h-5 w-5 ml-2" aria-hidden="true" />
                                    }
                                >
                                    {shouldActivate ? <>Activate account</> : <>Unlock account</>}
                                </ButtonWrapper>
                            </>
                    }
                </div>
            </div>
        </>
    )
}