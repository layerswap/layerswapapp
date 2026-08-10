import { NetworkType } from '@layerswap/widget-types';
import { GaslessProvider } from "@layerswap/utils";
import { useConfig } from "wagmi"
import { createEVMGaslessProvider } from "./createEVMGaslessProvider"

export function useEVMGaslessSign(): GaslessProvider {
    const config = useConfig()

    return createEVMGaslessProvider(
        config,
        (network) => network.type === NetworkType.EVM && !!network.token
    )
}
