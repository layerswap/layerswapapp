import { createPublicClient, http } from "viem"
import { Balance, BalanceProps, BalanceProvider, GasProps } from "../../../hooks/useBalance"
import resolveChain from "../../resolveChain"
import { useSettingsState } from "../../../context/settings"
import { NetworkType } from "../../../Models/CryptoNetwork"
import NetworkSettings, { GasCalculation } from "../../NetworkSettings"
import { getErc20Balances, getNativeBalance, resolveERC20Balances, resolveNativeBalance } from "./getBalance"
import getEthereumGas from "./ethereum/getGas"

export default function useEVMBalance(): BalanceProvider {
    const name = 'eth'

    const { layers } = useSettingsState()
    const supportedNetworks = layers.filter(l => l.isExchange === false && l.type === NetworkType.EVM && NetworkSettings.KnownSettings[l.internal_name]?.GasCalculationType !== GasCalculation.OptimismType).map(l => l.internal_name)

    const getBalance = async ({ layer, address }: BalanceProps) => {

        try {
            if (layer.isExchange) throw new Error('Provided layer is not network')

            const chain = resolveChain(layer)
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

    const getGas = async ({ layer, address, currency, userDestinationAddress }: GasProps) => {

        if (!layer || !address || layer?.isExchange) {
            return
        }
        const chainId = Number(layer?.chain_id)
        const nativeToken = layer?.assets
            .find(a => a.is_native)

        if (!nativeToken || !chainId || !layer)
            return

        const contract_address = layer?.assets?.find(a => a?.asset === currency?.asset)?.contract_address as `0x${string}`
        const destination_address = layer?.managed_accounts?.[0]?.address as `0x${string}`

        try {
            const publicClient = createPublicClient({
                chain: resolveChain(layer),
                transport: http(),
            })

            const gasProvider = new getEthereumGas(
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