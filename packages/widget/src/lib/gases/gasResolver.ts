
import { GasProps } from "../../Models/Balance";
import { EVMGasProvider } from "./providers/evmGasProvider";
// import { FuelGasProvider } from "./providers/fuelGasProvider";
// import { LoopringGasProvider } from "./providers/loopringGasProvider";
// import { SolanaGasProvider } from "./providers/solanaGasProvider";
// import { StarknetGasProvider } from "./providers/starknetGasProvider";
// import { TronGasProvider } from "./providers/tronGasProvider";
import { ZkSyncGasProvider } from "./providers/zkSyncGasProvider";

export class GasResolver {
    private providers = [
        // new StarknetGasProvider(),
        new EVMGasProvider(),
        // new FuelGasProvider(),
        // new LoopringGasProvider(),
        // new SolanaGasProvider(),
        new ZkSyncGasProvider(),
        // new TronGasProvider()
    ];

    getGas({ address, network, token, recipientAddress }: GasProps) {
        const provider = this.providers.find(p => p.supportsNetwork(network));
        if (!provider) return;

        return provider.getGas({ address, network, token, recipientAddress });
    }
}
