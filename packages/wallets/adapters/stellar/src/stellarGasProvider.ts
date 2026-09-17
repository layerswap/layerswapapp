import { baseUnitsToNumber } from '@layerswap/utils/common'
import { NetworkType, type GasProvider } from '@layerswap/widget-types'
import { resolveStellarNetworkPassphrase } from './stellarNetwork'
import { getStellarHorizonServer } from './stellarServers'

export class StellarGasProvider implements GasProvider {
    supportsNetwork: GasProvider['supportsNetwork'] = network => network.type === NetworkType.Stellar

    async getGas({ network }) {
        if (!network.token) throw new Error('Stellar network token is missing')
        const networkPassphrase = resolveStellarNetworkPassphrase(network)
        const server = await getStellarHorizonServer(network, networkPassphrase)
        const feeInStroops = await server.fetchBaseFee()
        if (!Number.isSafeInteger(feeInStroops) || feeInStroops < 0) throw new Error('Invalid Stellar fee')
        return {
            gas: baseUnitsToNumber(BigInt(feeInStroops), network.token.decimals),
            token: network.token,
        }
    }
}
