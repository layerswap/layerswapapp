import { AppSettings } from '@layerswap/utils';
import { GasProvider, NetworkType, LayerswapNetwork } from "@layerswap/widget-types";

export class TonGasProvider implements GasProvider {
    supportsNetwork(network: LayerswapNetwork): boolean {
        return (network.type === NetworkType.TON && !AppSettings.isTestnet())
    }

    async getGas({ address: string, network: LayerswapNetwork, token: Token }): Promise<any> {
        return undefined;
    }
}
