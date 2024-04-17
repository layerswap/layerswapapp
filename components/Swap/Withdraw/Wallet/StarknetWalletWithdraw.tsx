import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import SubmitButton from '../../../buttons/submitButton';
import toast from 'react-hot-toast';
import { BackendTransactionStatus } from '../../../../lib/layerSwapApiClient';
import WarningMessage from '../../../WarningMessage';
import { useAuthState } from '../../../../context/authContext';
import KnownInternalNames from '../../../../lib/knownIds';
import useWallet from '../../../../hooks/useWallet';
import { useSwapTransactionStore } from '../../../../stores/swapTransactionStore';
import WalletIcon from '../../../icons/WalletIcon';
import { WithdrawPageProps } from './WalletTransferContent';


const StarknetWalletWithdrawStep: FC<WithdrawPageProps> = ({ network, token, callData, swapId }) => {

    const [loading, setLoading] = useState(false)
    const [transferDone, setTransferDone] = useState<boolean>()
    const { getWithdrawalProvider: getProvider } = useWallet()
    const [isWrongNetwork, setIsWrongNetwork] = useState<boolean>()

    const { userId } = useAuthState()

    const { setSwapTransaction } = useSwapTransactionStore();
    const source_network_internal_name = network?.name
    const sourceChainId = network?.chain_id

    const provider = useMemo(() => {
        return network && getProvider(network)
    }, [network, getProvider])

    const wallet = provider?.getConnectedWallet()

    const handleConnect = useCallback(async () => {
        if (!provider)
            throw new Error(`No provider from ${network?.name}`)

        setLoading(true)
        try {
            await provider.connectWallet(network?.chain_id)
        }
        catch (e) {
            toast(e.message)
        }
        setLoading(false)
    }, [network, provider])

    useEffect(() => {
        const connectedChainId = wallet?.chainId
        if (network && connectedChainId && connectedChainId !== sourceChainId && provider) {
            (async () => {
                setIsWrongNetwork(true)
                await provider.disconnectWallet()
            })()
        } else if (network && connectedChainId && connectedChainId === sourceChainId) {
            setIsWrongNetwork(false)
        }
    }, [wallet, network, sourceChainId, provider])

    const handleTransfer = useCallback(async () => {
        if (!swapId || !token) {
            return
        }
        setLoading(true)
        try {
            if (!wallet) {
                throw Error("starknet wallet not connected")
            }

            try {
                const { transaction_hash: transferTxHash } = (await wallet?.metadata?.starknetAccount?.account?.execute(JSON.parse(callData || "")) || {});
                if (transferTxHash) {
                    setSwapTransaction(swapId, BackendTransactionStatus.Completed, transferTxHash);
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
    }, [wallet, swapId, network, userId, token])

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
                                        : <span>Please switch to {network?.display_name} with your wallet and click Connect again</span>
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