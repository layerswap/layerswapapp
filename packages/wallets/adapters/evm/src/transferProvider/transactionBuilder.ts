import { TransferProps } from "@layerswap/widget-types";
import { parseEther } from "viem"
import { resolveEVMTransactionGasParameters } from "../gasProviders/resolveEVMTransactionGasParameters"

export const transactionBuilder = async (params: TransferProps) => {
    const { amount, callData, depositAddress, network, selectedWallet, token } = params
    const isNativeSource = !token?.contract

    const tx = {
        chainId: Number(network?.chain_id),
        to: depositAddress as `0x${string}`,
        value: isNativeSource ? parseEther(amount.toString()) : 0n,
        data: callData as `0x${string}`,
        account: selectedWallet.address as `0x${string}`
    }

    const gasParameters = await resolveEVMTransactionGasParameters({
        network,
        account: tx.account,
        to: tx.to,
        data: tx.data,
        value: tx.value,
    })

    return gasParameters ? { ...tx, ...gasParameters } : tx
}
