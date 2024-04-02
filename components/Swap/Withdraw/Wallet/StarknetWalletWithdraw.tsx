import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import SubmitButton from '../../../buttons/submitButton';
import { useSwapDataState } from '../../../../context/swap';
import toast from 'react-hot-toast';
import { BackendTransactionStatus } from '../../../../lib/layerSwapApiClient';
import { useSettingsState } from '../../../../context/settings';
import WarningMessage from '../../../WarningMessage';
import { useAuthState } from '../../../../context/authContext';
import KnownInternalNames from '../../../../lib/knownIds';
import useWallet from '../../../../hooks/useWallet';
import { useSwapTransactionStore } from '../../../../stores/swapTransactionStore';
import WalletIcon from '../../../icons/WalletIcon';

type Props = {
    depositAddress?: string;
    amount?: number
}

const StarknetWalletWithdrawStep: FC<Props> = ({ depositAddress, amount }) => {

    const [loading, setLoading] = useState(false)
    const [transferDone, setTransferDone] = useState<boolean>()
    const { getWithdrawalProvider: getProvider } = useWallet()
    const [isWrongNetwork, setIsWrongNetwork] = useState<boolean>()

    const { userId } = useAuthState()
    const { swapResponse, swapPrepareData } = useSwapDataState()
    const { swap } = swapResponse || {}
    const { source_network, source_token } = swap || {}

    const { setSwapTransaction } = useSwapTransactionStore();
    const source_network_internal_name = source_network?.name
    const sourceChainId = source_network?.chain_id

    const provider = useMemo(() => {
        return source_network && getProvider(source_network)
    }, [source_network, getProvider])

    const wallet = provider?.getConnectedWallet()
    const callData = swapPrepareData?.deposit_actions?.find(da => da.type == 'transfer')?.call_data

    const handleConnect = useCallback(async () => {
        if (!provider)
            throw new Error(`No provider from ${source_network?.name}`)

        setLoading(true)
        try {
            await provider.connectWallet(source_network?.chain_id)
        }
        catch (e) {
            toast(e.message)
        }
        setLoading(false)
    }, [source_network, provider])

    useEffect(() => {
        const connectedChainId = wallet?.chainId
        if (source_network && connectedChainId && connectedChainId !== sourceChainId && provider) {
            (async () => {
                setIsWrongNetwork(true)
                await provider.disconnectWallet()
            })()
        } else if (source_network && connectedChainId && connectedChainId === sourceChainId) {
            setIsWrongNetwork(false)
        }
    }, [wallet, source_network, sourceChainId, provider])

    const handleTransfer = useCallback(async () => {
        if (!swap || !source_token) {
            return
        }
        setLoading(true)
        try {
            if (!wallet) {
                throw Error("starknet wallet not connected")
            }
            if (!source_token.contract) {
                throw Error("starknet contract_address is not defined")
            }
            if (!amount) {
                throw Error("amount is not defined for starknet transfer")
            }
            if (!depositAddress) {
                throw Error("depositAddress is not defined for starknet transfer")
            }

            try {
                const { transaction_hash: transferTxHash } = (await wallet?.metadata?.starknetAccount?.account?.execute(JSON.parse(callData || "")) || {});
                if (transferTxHash) {
                    setSwapTransaction(swap.id, BackendTransactionStatus.Completed, transferTxHash);
                    setTransferDone(true)
                }
                else {
                    toast('Transfer failed or terminated')
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
    }, [wallet, swap, source_network, depositAddress, userId, source_token])

    return (
        <>
            <div className="w-full space-y-5 flex flex-col justify-between h-full text-secondary-text">
                <div className='space-y-4'>
                    {

                        isWrongNetwork &&
                        <WarningMessage messageType='warning'>
                            <span className='flex'>
                                {
                                    source_network_internal_name === KnownInternalNames.Networks.StarkNetMainnet
                                        ? <span>Please switch to Starknet Mainnet with your wallet and click Connect again</span>
                                        : <span>Please switch to {source_network?.display_name} with your wallet and click Connect again</span>
                                }
                            </span>
                        </WarningMessage>
                    }
                    {
                        !wallet &&
                        <div className="flex flex-row
                         text-primary-text text-base space-x-2">
                            <SubmitButton
                                isDisabled={loading}
                                isSubmitting={loading}
                                onClick={handleConnect}
                                icon={
                                    <WalletIcon
                                        className="stroke-2 w-6 h-6"
                                        aria-hidden="true"
                                    />
                                } >
                                Connect a wallet
                            </SubmitButton>
                        </div>
                    }
                    {
                        wallet
                        && depositAddress
                        && !isWrongNetwork
                        && <div className="flex flex-row
                        text-primary-text text-base space-x-2">
                            <SubmitButton
                                isDisabled={!!(loading || transferDone)}
                                isSubmitting={!!(loading || transferDone)}
                                onClick={handleTransfer}
                                icon={
                                    <WalletIcon
                                        className="h-6 w-6 stroke-2"
                                        aria-hidden="true"
                                    />
                                } >
                                Send from wallet
                            </SubmitButton>
                        </div>
                    }
                </div>
            </div >
        </>
    )
}


export default StarknetWalletWithdrawStep;