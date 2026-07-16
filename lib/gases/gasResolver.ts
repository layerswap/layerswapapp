
import { GasProps } from "../../Models/Balance";
import { BitcoinGasProvider } from "./providers/bitcoinGasProvider";
import { EVMGasProvider } from "./providers/evmGasProvider";
import { FuelGasProvider } from "./providers/fuelGasProvider";
import { HyperliquidGasProvider } from "./providers/hyperliquidGasProvider";
import { LighterGasProvider } from "./providers/lighterGasProvider";
import { SolanaGasProvider } from "./providers/solanaGasProvider";
import { StarknetGasProvider } from "./providers/starknetGasProvider";
import { TronGasProvider } from "./providers/tronGasProvider";

export class GasResolver {
    private providers = [
        new BitcoinGasProvider(),
        new StarknetGasProvider(),
        new EVMGasProvider(),
        new HyperliquidGasProvider(),
        new LighterGasProvider(),
        new FuelGasProvider(),
        new SolanaGasProvider(),
        new TronGasProvider()
    ];

    getGas({ address, network, token, recipientAddress, amount, wallet }: GasProps) {
        const provider = this.providers.find(p => p.supportsNetwork(network));
        if (!provider) return;

        return provider.getGas({ address, network, token, recipientAddress, wallet, amount });
    }
}
