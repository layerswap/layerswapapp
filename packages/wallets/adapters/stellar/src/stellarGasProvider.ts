import { Horizon } from '@stellar/stellar-sdk'
import { baseUnitsToNumber } from '@layerswap/utils/common'
import { NetworkType, type GasProvider } from '@layerswap/widget-types'

export class StellarGasProvider implements GasProvider {
    supportsNetwork: GasProvider['supportsNetwork'] = network => network.type === NetworkType.Stellar

    async getGas({ network }) {
        if (!network.token) throw new Error('Stellar network token is missing')
        const feeInStroops = await new Horizon.Server(network.node_url).fetchBaseFee()
        if (!Number.isSafeInteger(feeInStroops) || feeInStroops < 0) throw new Error('Invalid Stellar fee')
        return {
            gas: baseUnitsToNumber(BigInt(feeInStroops), network.token.decimals),
            token: network.token,
        }
    }
}
