import { NetworkType } from "@layerswap/utils"
import { GaslessProvider } from "@layerswap/wallet-core/types"
import { useConfig } from "wagmi"
import { createEVMGaslessProvider } from "./createEVMGaslessProvider"

export function useEVMGaslessSign(): GaslessProvider {
    const config = useConfig()

    return createEVMGaslessProvider(
        config,
        (network) => network.type === NetworkType.EVM && !!network.token
    )
}
