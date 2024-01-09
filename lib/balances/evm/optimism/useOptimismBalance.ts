import { useSettingsState } from "../../../../context/settings"
import { NetworkType } from "../../../../Models/CryptoNetwork"
import NetworkSettings, { GasCalculation } from "../../../NetworkSettings"
import { Balance, BalanceProps, BalanceProvider, GasProps } from "../../../../Models/Balance"

export default function useOptimismBalance(): BalanceProvider {
    const name = 'optimism'

    const { layers } = useSettingsState()
    const supportedNetworks = layers.filter(l => l.type === NetworkType.EVM && NetworkSettings.KnownSettings[l.internal_name]?.GasCalculationType === GasCalculation.OptimismType).map(l => l.internal_name)

    const getBalance = async ({ layer, address }: BalanceProps) => {

        try {
            const resolveChain = (await import("../../../resolveChain")).default
            const chain = resolveChain(layer)
            if (!chain) return

            const { createPublicClient, http } = await import("viem")
            const publicClient = createPublicClient({
                chain,
                transport: http()
            })

            const {
                getErc20Balances,
                getNativeBalance,
                resolveERC20Balances,
                resolveNativeBalance
            } = await import("../getBalance")

            const erc20BalancesContractRes = await getErc20Balances({
                address: address,
                chainId: Number(layer?.chain_id),
                assets: layer.assets,
                publicClient,
                hasMulticall: !!layer.metadata?.multicall3
            });

            const erc20Balances = (erc20BalancesContractRes && await resolveERC20Balances(
                erc20BalancesContractRes,
                layer
            )) || [];

            const nativeBalanceContractRes = await getNativeBalance(address as `0x${string}`, Number(layer.chain_id))
            const nativeBalance = (nativeBalanceContractRes
                && await resolveNativeBalance(layer, nativeBalanceContractRes)) || []

            let balances: Balance[] = []

            return balances.concat(erc20Balances, nativeBalance)
        }
        catch (e) {
            console.log(e)
        }

    }

    const getGas = async ({ layer, address, currency, userDestinationAddress }: GasProps) => {

        if (!layer || !address) {
            return
        }
        const chainId = Number(layer?.chain_id)
        const nativeToken = layer?.assets.find(a => a.is_native)

        if (!nativeToken || !chainId || !layer)
            return

        const contract_address = layer?.assets?.find(a => a?.asset === currency?.asset)?.contract_address as `0x${string}`
        const destination_address = layer?.managed_accounts?.[0]?.address as `0x${string}`

        try {
            const { createPublicClient, http } = await import("viem")
            const resolveChain = (await import("../../../resolveChain")).default
            const publicClient = createPublicClient({
                chain: resolveChain(layer),
                transport: http(),
            })
            const getOptimismGas = (await import("./getGas")).default
            const gasProvider = new getOptimismGas(
                publicClient,
                chainId,
                contract_address,
                address,
                layer,
                currency,
                destination_address,
                nativeToken,
                address !== userDestinationAddress,
            )

            const gas = await gasProvider.resolveGas()

            return [gas!]

        }
        catch (e) {
            console.log(e)
        }

    }

    return {
        getBalance,
        getGas,
        name,
        supportedNetworks
    }
}