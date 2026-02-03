import { Lock } from 'lucide-react';
import { FC, useCallback, useEffect, useState } from 'react'
import { useAccount, useConfig } from 'wagmi';
import { ActivationTokenPicker } from './utils/ActivationTokentPicker';
import { useActivationData, useLoopringAccount, useLoopringTokens } from './utils/hooks';
import { AppSettings, SignatureIcon, WalletMessage, ButtonWrapper, ChangeNetworkButton, ConnectWalletButton, SendTransactionButton, ActionMessage, ErrorHandler } from '@layerswap/widget/internal';
import { ActionMessageType, TransferProps, WithdrawPageProps } from '@layerswap/widget/types';
import { ChainId, UnlockedAccount } from './services/defs';
import { LoopringAPI } from './services/LoopringAPI';

const LoopringMultiStepHandler: FC<WithdrawPageProps> = ({ swapBasicData, refuel }) => {
    const [loading, setLoading] = useState(false);
    const [buttonClicked, setButtonClicked] = useState(false)
    const [error, setError] = useState<Error | undefined>()
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
        setButtonClicked(true)
        setError(undefined)
        try {
            if (!accInfo)
                return
            const res = await LoopringAPI.userAPI.unlockAccount(accInfo, config)
            setUnlockedAccount(res)
        }
        catch (error) {
            (error as Error).name = ActionMessageType.UnexpectedErrorMessage
            setError(error as Error)
            ErrorHandler({
                type: "WalletError",
                message: error.message,
                name: error.name,
                stack: error.stack,
                cause: error.cause
            });
        }
        finally {
            setLoading(false)
        }
    }, [accInfo, config])

    const activateAccout = useCallback(async () => {
        setLoading(true)
        setButtonClicked(true)
        setError(undefined)
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
        catch (error) {
            (error as Error).name = ActionMessageType.UnexpectedErrorMessage
            setError(error as Error)
            ErrorHandler({
                type: "WalletError",
                message: error.message,
                name: error.name,
                stack: error.stack,
                cause: error.cause
            });
        }
        finally {
            setLoading(false)
        }
    }, [accInfo, selectedActivationAsset, refetchAccount, loopringToken])

    const handleTransfer = useCallback(async ({ amount, callData, depositAddress, swapId }: TransferProps) => {
        setLoading(true)
        setLoading(true)
        setButtonClicked(true)
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
                return transferResult.hash
            }
            else {
                throw new Error(ActionMessageType.TransactionFailed)
            }
        }
        catch (error) {
            setLoading(false)
            if (error in ActionMessageType)
                (error as Error).name = error
            else
                (error as Error).name = ActionMessageType.UnexpectedErrorMessage
            setError(error as Error)
            ErrorHandler({
                type: "TransferError",
                message: error.message,
                name: error.name,
                stack: error.stack,
                cause: error.cause
            });
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
                        buttonClicked &&
                        <ActionMessage
                            error={error}
                            isLoading={loading}
                            selectedSourceAddress={fromAddress || ''}
                            sourceNetwork={source_network}
                        />
                    }
                    {
                        (accInfo && unlockedAccount) ?
                            <SendTransactionButton
                                isDisabled={!!(loading || transferDone)}
                                onClick={handleTransfer}
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

export default LoopringMultiStepHandler