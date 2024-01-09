import { TransactionSerializedEIP1559, encodeFunctionData, formatGwei, serializeTransaction } from "viem";
import formatAmount from "../../../formatAmount";
import getEVMGas from "../gas";
import { erc20ABI } from "wagmi";
import { getL1Fee } from "./estimateFees";
import { Gas } from "../../../../Models/Balance";

export default class getOptimismGas extends getEVMGas {
    resolveGas = async (): Promise<Gas | undefined> => {
        const feeData = await this.resolveFeeData()

        const estimatedGasLimit = this.contract_address ?
            await this.estimateERC20GasLimit()
            : await this.estimateNativeGasLimit()

        const multiplier = feeData.maxFeePerGas || feeData.gasPrice

        if (!multiplier)
            return undefined

        let totalGas = (multiplier * estimatedGasLimit) + await this.GetOpL1Fee()

        const formattedGas = formatAmount(totalGas, this.nativeToken?.decimals)
        return {
            gas: formattedGas,
            token: this.currency?.asset,
            gasDetails: {
                gasLimit: Number(estimatedGasLimit),
                maxFeePerGas: feeData?.maxFeePerGas ? Number(formatGwei(feeData?.maxFeePerGas)) : undefined,
                gasPrice: feeData?.gasPrice ? Number(formatGwei(feeData?.gasPrice)) : undefined,
                maxPriorityFeePerGas: feeData?.maxPriorityFeePerGas ? Number(formatGwei(feeData?.maxPriorityFeePerGas)) : undefined,
            },
            request_time: new Date().toJSON()
        }
    }

    private GetOpL1Fee = async (): Promise<bigint> => {
        const amount = BigInt(1000)
        let serializedTransaction: TransactionSerializedEIP1559

        if (this.contract_address) {
            let encodedData = encodeFunctionData({
                abi: erc20ABI,
                functionName: "transfer",
                args: [this.destination, amount]
            })

            if (encodedData && this.isSweeplessTx) {
                encodedData = this.constructSweeplessTxData(encodedData)
            }

            serializedTransaction = serializeTransaction({
                client: this.publicClient,
                abi: erc20ABI,
                functionName: "transfer",
                chainId: this.chainId,
                args: [this.destination, amount],
                to: this.contract_address,
                data: encodedData,
                type: 'eip1559',
            }) as TransactionSerializedEIP1559
        }
        else {
            serializedTransaction = serializeTransaction({
                client: this.publicClient,
                chainId: this.chainId,
                to: this.destination,
                data: this.constructSweeplessTxData(),
                type: 'eip1559',
            }) as TransactionSerializedEIP1559
        }

        const fee = await getL1Fee({
            data: serializedTransaction,
            client: this.publicClient,
        })

        return fee;
    }

}

