import { TransferProps } from "@/lib/wallets/types/transfer"
import { parseEther } from "viem"

export const transactionBuilder = async (params: TransferProps) => {
    const { amount, callData, depositAddress, network, selectedWallet } = params

    const tx = {
        chainId: Number(network?.chain_id),
        to: depositAddress as `0x${string}`,
        value: parseEther(amount.toString()),
        gas: undefined,
        data: callData as `0x${string}`,
        account: selectedWallet.address as `0x${string}`
    }

    return tx

}