import { FC, useCallback, useState } from 'react'
import useWallet from '@/hooks/useWallet';
import { useWallet as useTronWallet } from '@tronweb3/tronwallet-adapter-react-hooks';
import { useSettingsState } from '@/context/settings';
import { TronWeb } from 'tronweb'
import useSWRGas from '@/lib/gases/useSWRGas';
import { ContractParamter, Transaction, TransferContract } from 'tronweb/lib/esm/types';
import { Token } from '@/Models/Network';
import { TransferProps, WithdrawPageProps } from '../Common/sharedTypes';
import { ConnectWalletButton, SendTransactionButton } from '../Common/buttons';
import TransactionMessages from '../../messages/TransactionMessages';
import WalletIcon from '@/components/icons/WalletIcon';
import { useSelectedAccount } from '@/context/balanceAccounts';

export const TronWalletWithdraw: FC<WithdrawPageProps> = ({ swapBasicData, refuel }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | undefined>()
    const { source_network, source_token } = swapBasicData;
    const { provider } = useWallet(source_network, 'withdrawal');
    const selectedSourceAccount = useSelectedAccount("from", provider?.name);
    const wallet = selectedSourceAccount?.wallet
    const { wallet: tronWallet, signTransaction } = useTronWallet();
    const walletAddress = tronWallet?.adapter.address
    const tronNode = source_network?.node_url
    const networkName = source_network?.name
    const { networks } = useSettingsState()
    const networkWithTokens = networks.find(n => n.name === networkName)
    const { gasData, isGasLoading } = useSWRGas(walletAddress, networkWithTokens, source_token)

    const handleTransfer = useCallback(async ({ amount, callData, depositAddress, swapId }: TransferProps) => {
        setError(undefined)
        setLoading(true)
        try {
            if (!signTransaction || !swapId || !depositAddress || !amount || !source_token) throw new Error('Missing data')
            if (!walletAddress) throw new Error('Tron wallet not connected')
            if (!callData) throw new Error("No call data provided")

            const tronWeb = new TronWeb({ fullNode: tronNode, solidityNode: tronNode });

            const amountInWei = Math.pow(10, source_token?.decimals) * amount

            const initialTransaction = await buildInitialTransaction({ tronWeb, token: source_token, depositAddress, amountInWei, gas: gasData?.gas, issuerAddress: walletAddress })
            const data = Buffer.from(callData).toString('hex')
            const transaction = await tronWeb.transactionBuilder.addUpdateData(initialTransaction, data, "hex")
            const signature = await signTransaction(transaction)
            const res = await tronWeb.trx.sendRawTransaction(signature)

            if (signature && res.result) {
                return signature.txID
            } else {
                throw new Error(res.code.toString())
            }
        }
        catch (e) {
            setLoading(false)
            if (e?.message) {
                if (e?.logs?.some(m => m?.includes('insufficient funds')) || e.message.includes('Attempt to debit an account')) setError('insufficientFunds')
                else setError(e.message)
            }
            throw e
        }
    }, [walletAddress, signTransaction, source_network, gasData, source_token])

    if (!wallet || !walletAddress) {
        return <ConnectWalletButton />
    }

    return (
        <div className="w-full space-y-3 flex flex-col justify-between h-full text-primary-text">
            <TransactionMessage
                error={error}
                isLoading={loading}
            />
            {
                wallet && !loading &&
                <SendTransactionButton
                    isDisabled={!!loading || isGasLoading}
                    isSubmitting={!!loading || isGasLoading}
                    onClick={handleTransfer}
                    error={!!error}
                    refuel={refuel}
                    swapData={swapBasicData}
                />
            }
        </div>
    )
}

const TransactionMessage: FC<{ isLoading: boolean, error: string | undefined }> = ({ isLoading, error }) => {
    if (isLoading) {
        return <TransactionMessages.ConfirmTransactionMessage />
    }
    else if (error === "BANDWITH_ERROR") {
        return <TransactionMessages.InsufficientFundsMessage />
    }
    else if (error === "user reject this request") {
        return <TransactionMessages.TransactionRejectedMessage />
    }
    else if (error) {
        return <TransactionMessages.UexpectedErrorMessage message={error} />
    }
    else return <></>
}

type BuildIniitialTransactionProps = {
    tronWeb: TronWeb,
    token: Token,
    depositAddress: string,
    amountInWei: number,
    gas: number | undefined,
    issuerAddress: string
}

const buildInitialTransaction = async (props: BuildIniitialTransactionProps): Promise<Transaction<ContractParamter> | Transaction<TransferContract>> => {
    const { token, depositAddress, amountInWei, gas, issuerAddress, tronWeb } = props

    // native token
    if (!token.contract)
        return await tronWeb.transactionBuilder.sendTrx(depositAddress, amountInWei, issuerAddress)

    const estimatedFee = (gas && token) && Number((gas * Math.pow(10, token.decimals)).toFixed())

    return (await tronWeb.transactionBuilder.triggerSmartContract(
        token.contract,
        "transfer(address,uint256)",
        {
            feeLimit: estimatedFee || 100000000,
        },
        [{ type: 'address', value: depositAddress }, { type: 'uint256', value: amountInWei }],
        issuerAddress
    )).transaction

}