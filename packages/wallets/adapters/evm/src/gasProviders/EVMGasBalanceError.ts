import type { Network } from '@layerswap/widget-types'
import { formatUnits, InsufficientFundsError } from 'viem'

/** A measured shortage, distinct from an RPC's inferred insufficient-funds error. */
export class EVMGasBalanceError extends InsufficientFundsError {
    constructor({ network, account, balance, requiredFee, value }: {
        network: Network
        account: `0x${string}`
        balance: bigint
        requiredFee: bigint
        value: bigint
    }) {
        super()
        const nativeToken = network.token
        const formatAmount = (amount: bigint) => nativeToken
            ? `${formatUnits(amount, nativeToken.decimals)} ${nativeToken.symbol}`
            : `${amount} native base units`

        // viem's InsufficientFundsError ignores custom cause text in its own
        // message. Keep the measured amounts in the message rendered and logged.
        this.shortMessage = `Insufficient native balance on ${network.display_name ?? network.name}. ` +
            `Required maximum gas fee: ${formatAmount(requiredFee)}. ` +
            `Available native balance: ${formatAmount(balance)}. ` +
            (value > 0n ? `Transfer amount: ${formatAmount(value)}. ` : '') +
            `Add ${nativeToken?.symbol ?? 'native currency'} to source account ${account} before sending.`
        this.message = this.shortMessage
    }
}
