import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import SubmitButton from '../../../buttons/submitButton';
import { useSwapDataState } from '../../../../context/swap';
import toast from 'react-hot-toast';
import { BackendTransactionStatus } from '../../../../lib/layerSwapApiClient';
import { useSettingsState } from '../../../../context/settings';
import WarningMessage from '../../../WarningMessage';
import { BigNumberish, cairo } from 'starknet';
import { useAuthState } from '../../../../context/authContext';
import KnownInternalNames from '../../../../lib/knownIds';
import { parseUnits } from 'viem'
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
    const { swap, depositMethods } = useSwapDataState()
    const { layers } = useSettingsState()

    const { setSwapTransaction } = useSwapTransactionStore();
    const source_network_internal_name = swap?.source_network.name
    const source_network = layers.find(n => n.name === source_network_internal_name)
    const source_layer = layers.find(n => n.name === source_network_internal_name)
    const sourceCurrency = source_network?.tokens.find(c => c.symbol?.toLowerCase() === swap?.source_token.symbol?.toLowerCase())
    const sourceChainId = source_network?.chain_id

    const provider = useMemo(() => {
        return source_layer && getProvider(source_layer)
    }, [source_layer, getProvider])

    const wallet = provider?.getConnectedWallet()

    const handleConnect = useCallback(async () => {
        if (!provider)
            throw new Error(`No provider from ${source_layer?.name}`)

        setLoading(true)
        try {
            await provider.connectWallet(source_layer?.chain_id)
        }
        catch (e) {
            toast(e.message)
        }
        setLoading(false)
    }, [source_layer, provider])

    useEffect(() => {
        const connectedChainId = wallet?.chainId
        if (source_layer && connectedChainId && connectedChainId !== sourceChainId && provider) {
            (async () => {
                setIsWrongNetwork(true)
                await provider.disconnectWallet()
            })()
        } else if (source_layer && connectedChainId && connectedChainId === sourceChainId) {
            setIsWrongNetwork(false)
        }
    }, [wallet, source_layer, sourceChainId, provider])

    const handleTransfer = useCallback(async () => {
        if (!swap || !sourceCurrency) {
            return
        }
        setLoading(true)
        try {
            if (!wallet) {
                throw Error("starknet wallet not connected")
            }
            if (!sourceCurrency.contract) {
                throw Error("starknet contract_address is not defined")
            }
            if (!amount) {
                throw Error("amount is not defined for starknet transfer")
            }
            if (!depositAddress) {
                throw Error("depositAddress is not defined for starknet transfer")
            }

            try {
                const { transaction_hash: transferTxHash } = (await wallet?.metadata?.starknetAccount?.account?.execute(depositMethods?.wallet.call_data) || {});
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
    }, [wallet, swap, source_network, depositAddress, userId, sourceCurrency])

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
                                        : <span>Please switch to {source_layer?.display_name} with your wallet and click Connect again</span>
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