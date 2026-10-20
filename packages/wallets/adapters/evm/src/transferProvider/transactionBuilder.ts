import type { TransferProps } from '@layerswap/widget-types'
import { parseEther, type PublicClient } from 'viem'
import { estimateTransferFee } from '../gasProviders/estimateTransferFee'

export const transactionBuilder = async (params: TransferProps, walletClient?: PublicClient) => {
    const { amount, callData, depositAddress, network, selectedWallet } = params
    const tx = {
        chainId: Number(network.chain_id),
        to: depositAddress as `0x${string}`,
        value: parseEther(amount.toString()),
        data: (callData || '0x') as `0x${string}`,
        account: selectedWallet.address as `0x${string}`,
    }
    // Direct consumers can still hand intent to their own wallet. The bundled
    // adapter supplies the selected connector's RPC for exact fee budgeting.
    if (!walletClient) return tx
    const estimate = await estimateTransferFee(network, tx, walletClient)
    const balance = await estimate.client.getBalance({ address: tx.account, blockTag: 'latest' })
    if (tx.value + estimate.fee > balance) {
        throw Object.assign(new Error('Insufficient funds for the transfer and network fee. Reduce the amount and try again.'), {
            code: 'INSUFFICIENT_FUNDS',
            // Decimal strings preserve units and precision in error telemetry.
            cause: {
                message: 'Transfer fee budget exceeded',
                details: JSON.stringify({
                    balanceWei: String(balance), valueWei: String(tx.value),
                    gasUnits: String(estimate.gas), feeWei: String(estimate.fee),
                    l1FeeWei: String(estimate.l1Fee),
                    maxFeePerGasWei: estimate.fees.maxFeePerGas?.toString(),
                    maxPriorityFeePerGasWei: estimate.fees.maxPriorityFeePerGas?.toString(),
                    gasPriceWei: estimate.fees.gasPrice?.toString(),
                }),
            },
        })
    }
    // Pass the exact gas units and fee caps we budgeted; the wallet may still
    // let users edit these, but it need not independently choose higher caps.
    return { ...tx, gas: estimate.gas, ...estimate.fees }
}
