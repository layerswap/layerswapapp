import { TransferProps } from "@layerswap/widget-types";
import { parseEther } from "viem"

export const transactionBuilder = async (params: TransferProps) => {
    const { amount, callData, depositAddress, network, selectedWallet } = params


    const tx = {
        chainId: Number(network?.chain_id),
        to: depositAddress as `0x${string}`,
        value: parseEther(amount.toString()),
        data: (callData || '0x') as `0x${string}`,
        account: selectedWallet.address as `0x${string}`
    }

    // Fee estimates are denominated in the native token, not gas units. Let the
    // wallet estimate the actual transaction instead of blocking on a fee RPC.
    return tx
}
