import { FC, useCallback, useState } from 'react'
import { useSwapTransactionStore } from '../../../../../stores/swapTransactionStore';
import { BackendTransactionStatus } from '../../../../../lib/layerSwapApiClient';
import { ButtonWrapper, ChangeNetworkButton, ConnectWalletButton } from './WalletTransfer/buttons';
import { useAccount, useConfig } from 'wagmi';
import useWallet from '../../../../../hooks/useWallet';
import { WithdrawPageProps } from './WalletTransferContent';
import { sophon, sophonTestnet } from 'viem/chains';
import { createWalletClient, custom, JsonRpcAccount } from 'viem';
import { eip712WalletActions, getGeneralPaymasterInput } from 'viem/zksync';
import KnownInternalNames from '../../../../../lib/knownIds';
import TransactionMessages from '../Messages/TransactionMessages';
import { datadogRum } from '@datadog/browser-rum';
import WalletIcon from '../../../../AllIcons/WalletIcon';
import { getTransactionCount } from '@wagmi/core'

const SophonWalletWithdraw: FC<WithdrawPageProps> = ({ amount, depositAddress, network, token, swapId, callData }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | undefined>(undefined)

    const { setSwapTransaction } = useSwapTransactionStore();
    const { chain: activeChain, connector } = useAccount();

    const networkChainId = Number(network?.chain_id) ?? undefined
    const { provider } = useWallet(network, 'withdrawal')
    const wallet = provider?.activeWallet
    const config = useConfig()

    const handleTransfer = useCallback(async () => {

        if (!wallet?.address || !swapId || !depositAddress || !token || amount == undefined || !callData || !network?.metadata.zks_paymaster_contract) return

        try {
            setLoading(true)

            const walletProvider = await connector?.getProvider({ chainId: networkChainId }) as any

            if (!walletProvider) throw new Error('Could not get provider')

            const account = {
                address: wallet?.address,
                type: 'json-rpc'
            } as JsonRpcAccount

            const walletClient = createWalletClient({
                chain: network.name === KnownInternalNames.Networks.SophonSepolia ? sophonTestnet : sophon,
                transport: custom(walletProvider),
                account: account,
            }).extend(eip712WalletActions());

            const generalPaymasterInput = getGeneralPaymasterInput({ innerInput: '0x' })
            const transactionCount = await getTransactionCount(config, {
                address: account.address,
                chainId: networkChainId,
            })

            const request = await walletClient.prepareTransactionRequest({
                to: depositAddress as `0x${string}`,
                data: callData as `0x${string}`,
                paymaster: network?.metadata.zks_paymaster_contract,
                paymasterInput: generalPaymasterInput,
                nonce: transactionCount,
            })

            const signature = await walletClient.signTransaction(request as any)
            const hash = await walletClient.sendRawTransaction({
                serializedTransaction: signature
            })

            if (hash) {
                setSwapTransaction(swapId, BackendTransactionStatus.Pending, hash);
            }
        }
        catch (e) {
            if (e?.message) {
                setError(e.message)
                return
            }
        }
        finally {
            setLoading(false)
        }
    }, [swapId, depositAddress, token, amount, callData, connector, wallet?.address])

    if (!wallet) {
        return <ConnectWalletButton />
    }

    else if (activeChain?.id !== networkChainId && network) {
        return <ChangeNetworkButton
            chainId={networkChainId}
            network={network.display_name}
        />
    }

    return (
        <div className="w-full space-y-3 flex flex-col justify-between h-full text-primary-text">
            <TransactionMessage
                error={error}
                isLoading={loading}
            />
            {
                wallet && !loading &&
                <ButtonWrapper isDisabled={!!loading} isSubmitting={!!loading} onClick={handleTransfer} icon={<WalletIcon className="stroke-2 w-6 h-6" aria-hidden="true" />} >
                    {error ? 'Try again' : 'Send from wallet'}
                </ButtonWrapper>
            }
        </div>
    )
}

const TransactionMessage: FC<{ isLoading: boolean, error: string | undefined }> = ({ isLoading, error }) => {
    if (isLoading) {
        return <TransactionMessages.ConfirmTransactionMessage />
    }
    else if (error?.includes('User rejected the request')) {
        return <TransactionMessages.TransactionRejectedMessage />
    }
    else if (error === "EstimateGasExecutionError") {
        return <TransactionMessages.InsufficientFundsMessage />
    }
    else if (error) {
        const swapWithdrawalError = new Error(error);
        swapWithdrawalError.name = `SwapWithdrawalError`;
        swapWithdrawalError.cause = error;
        datadogRum.addError(swapWithdrawalError);

        return <TransactionMessages.UexpectedErrorMessage message={error} />
    }
    else return <></>
}
export default SophonWalletWithdraw;