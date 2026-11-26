import type { TransferProps } from '@layerswap/widget-types'
import { parseNativeAmount } from '../evmUtils/parseNativeAmount'

/** The same transaction payload is used when quoting gas and requesting a wallet transfer. */
export const resolveEVMTransactionRequest = ({
    amount,
    amountInBaseUnits,
    callData,
    depositAddress,
    network,
    token,
    account,
}: Pick<TransferProps, 'amount' | 'amountInBaseUnits' | 'callData' | 'depositAddress' | 'network' | 'token'> & {
    account: `0x${string}`
}) => ({
    chainId: Number(network.chain_id),
    to: depositAddress as `0x${string}`,
    value: token.contract ? 0n : parseNativeAmount(amount, token.decimals, amountInBaseUnits),
    data: (callData || '0x') as `0x${string}`,
    account,
})
