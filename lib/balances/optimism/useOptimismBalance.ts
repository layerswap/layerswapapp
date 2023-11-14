import { createPublicClient, http } from "viem"
import { Layer } from "../../../Models/Layer"
import { Balance, BalanceProvider, Gas } from "../../../hooks/useBalance"
import resolveChain from "../../resolveChain"
import { Currency } from "../../../Models/Currency"
import { useSettingsState } from "../../../context/settings"
import { NetworkType } from "../../../Models/CryptoNetwork"
import NetworkSettings, { GasCalculation } from "../../NetworkSettings"
import { getErc20Balances, getNativeBalance, resolveERC20Balances, resolveNativeBalance } from "../evm/getBalance"
import { resolveGas } from "./getGas"

export default function useOptimismBalance(): BalanceProvider {
    const name = 'optimism'

    const { layers } = useSettingsState()
    const supportedNetworks = layers.filter(l => l.isExchange === false && l.type === NetworkType.EVM && NetworkSettings.KnownSettings[l.internal_name]?.GasCalculationType === GasCalculation.OptimismType).map(l => l.internal_name)

    const getBalance = async (layer: Layer, address: string) => {

        try {
            if (layer.isExchange) throw new Error('Provided layer is not network')

            const source_assets = layer.assets
            const source_network = source_assets?.[0].network

            const chain = resolveChain(source_network!)
            if (!chain) return

            const publicClient = createPublicClient({
                chain,
                transport: http()
            })
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

    const getGas = async (layer: Layer, address: string, currency: Currency, userDestinationAddress: string) => {

        if (!layer || !address || layer?.isExchange) {
            return
        }
        const chainId = Number(layer?.chain_id)
        const nativeToken = layer?.assets
            .find(a =>
                a.asset ===
                (layer as { native_currency: string }).native_currency)
        const network = layer.assets?.[0].network

        if (!nativeToken || !chainId || !network)
            return

        const contract_address = layer?.assets?.find(a => a?.asset === currency?.asset)?.contract_address as `0x${string}`
        const destination_address = layer?.assets?.find(c => c.asset.toLowerCase() === currency?.asset?.toLowerCase())?.network?.managed_accounts?.[0]?.address as `0x${string}`

        try {
            const publicClient = createPublicClient({
                chain: resolveChain(network),
                transport: http(),
            })

            const gas = await resolveGas({
                publicClient,
                chainId,
                contract_address,
                account: address as `0x${string}`,
                from: layer,
                currency,
                destination: destination_address,
                //TODO fix, this does not consider argent wallet
                isSweeplessTx: address !== userDestinationAddress,
                nativeToken: nativeToken
            })

            let gases: Gas[] = []

            return gases.concat(gas!)

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