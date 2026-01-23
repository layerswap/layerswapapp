import type { ContractAddressCheckerProvider, Network } from "@layerswap/widget/types";
import { NetworkType } from "@layerswap/widget/types";
import resolveChain from "./evmUtils/resolveChain";
import { createPublicClient } from "viem";
import { resolveFallbackTransport } from "./evmUtils/resolveTransports";

export class EVMContractAddressProvider implements ContractAddressCheckerProvider {
    supportsNetwork(network: Network): boolean {
        return network.type === NetworkType.EVM;
    }

    async isContractAddress(address: string, network: Network): Promise<boolean> {
        if (!network || !address) {
            return false;
        }

        try {
            const chain = resolveChain(network)
            const publicClient = createPublicClient({
                chain,
                transport: resolveFallbackTransport(network.nodes)
            })
            const bytecode = await publicClient.getCode({
                address: address as `0x${string}`
            });
            if (bytecode && bytecode !== '0x' && !bytecode.startsWith('0xef0100')) {
                return true;
            } else {
                return false;
            }
        } catch {
            return false;
        }
    }
}


