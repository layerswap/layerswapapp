import { Token } from '@layerswap/widget/types';
import { TronWeb } from 'tronweb';
// @ts-ignore
import { ContractParamter, Transaction, TransferContract } from 'tronweb/lib/esm/types';

type BuildIniitialTransactionProps = {
    tronWeb: TronWeb,
    token: Token,
    depositAddress: string,
    amountInWei: number,
    gas: number | undefined,
    issuerAddress: string
}

export const buildInitialTransaction = async (props: BuildIniitialTransactionProps): Promise<Transaction<ContractParamter> | Transaction<TransferContract>> => {
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