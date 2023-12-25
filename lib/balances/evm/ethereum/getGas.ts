import { formatGwei } from "viem";
import formatAmount from "../../../formatAmount";
import getEVMGas from "../gas";
import { Gas } from "../../../../Models/Balance";

export default class getEthereumGas extends getEVMGas {
    resolveGas = async (): Promise<Gas | undefined> => {
        const feeData = await this.resolveFeeData()

        const estimatedGasLimit = this.contract_address ?
            await this.estimateERC20GasLimit()
            : await this.estimateNativeGasLimit()

        const multiplier = feeData.maxFeePerGas || feeData.gasPrice

        if (!multiplier)
            return undefined

        const totalGas = multiplier * estimatedGasLimit

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

}