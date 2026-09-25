
import { GasProps } from "@layerswap/widget-types";
import { GasProvider } from "@layerswap/widget-types";
import { widgetTelemetry } from '../widgetTelemetry';

export class GasResolver {
    private providers: GasProvider[];

    constructor(providers?: GasProvider[]) {
        this.providers = providers || [];
    }

    getGas({ address, network, token, recipientAddress, amount, wallet }: GasProps) {
        const provider = this.providers.find(p => p.supportsNetwork(network));
        if (!provider) return;

        const finishTelemetry = widgetTelemetry.beginOperation('gas_estimation', { network: network.name, token: token?.symbol })
        try {
            return provider.getGas({ address, network, token, recipientAddress, wallet, amount }).then(result => {
                finishTelemetry(result ? 'succeeded' : 'unavailable')
                return result
            }, error => {
                finishTelemetry('failed')
                throw error
            })
        } catch (error) {
            finishTelemetry('failed')
            throw error
        }
    }
}
