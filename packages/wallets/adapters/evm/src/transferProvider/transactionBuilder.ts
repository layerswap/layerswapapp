import { TransferProps } from "@layerswap/widget-types";
import { resolveEVMTransactionGasParameters } from "../gasProviders/resolveEVMTransactionGasParameters"
import { resolveEVMTransactionRequest } from "./resolveEVMTransactionRequest"

export const transactionBuilder = async (
    params: TransferProps,
    options?: { hasAlternateGasFees?: () => Promise<boolean> },
) => {
    const { network, selectedWallet } = params
    const tx = resolveEVMTransactionRequest({ ...params, account: selectedWallet.address as `0x${string}` })

    const gasParameters = await resolveEVMTransactionGasParameters({
        network,
        account: tx.account,
        to: tx.to,
        data: tx.data,
        value: tx.value,
        hasAlternateGasFees: options?.hasAlternateGasFees,
    })

    return gasParameters ? { ...tx, ...gasParameters } : tx
}
