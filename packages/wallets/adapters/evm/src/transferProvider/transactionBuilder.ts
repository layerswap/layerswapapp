import type { TransferProps } from '@layerswap/widget-types'
import { parseEther } from 'viem'

/** Hand transaction intent to the wallet; it owns gas and fee selection. */
export const transactionBuilder = async (params: TransferProps) => {
    const { amount, callData, depositAddress, network, selectedWallet } = params
    return {
        chainId: Number(network.chain_id),
        to: depositAddress as `0x${string}`,
        value: parseEther(amount.toString()),
        data: (callData || '0x') as `0x${string}`,
        account: selectedWallet.address as `0x${string}`,
    }
}
