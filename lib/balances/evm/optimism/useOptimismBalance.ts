import { useSettingsState } from "../../../../context/settings"
import { NetworkType } from "../../../../Models/Network"
import NetworkSettings, { GasCalculation } from "../../../NetworkSettings"
import { Balance, BalanceProps, BalanceProvider, GasProps, NetworkBalancesProps } from "../../../../Models/Balance"

export default function useOptimismBalance(): BalanceProvider {
    const { networks } = useSettingsState()
    const supportedNetworks = networks.filter(l => l.type === NetworkType.EVM && NetworkSettings.KnownSettings[l.name]?.GasCalculationType === GasCalculation.OptimismType).map(l => l.name)

    const getNetworkBalances = async ({ network, address }: NetworkBalancesProps) => {

        try {
            const resolveChain = (await import("../../../resolveChain")).default
            const chain = resolveChain(network)
            if (!chain) return

            const { createPublicClient, http } = await import("viem")
            const publicClient = createPublicClient({
                chain,
                transport: http()
            })

            const {
                getErc20Balances,
                getTokenBalance,
                resolveERC20Balances,
                resolveBalance,
            } = await import("../getBalance")

            const erc20BalancesContractRes = await getErc20Balances({
                address: address,
                chainId: Number(network?.chain_id),
                assets: network.tokens,
                publicClient,
                hasMulticall: !!network.metadata?.evm_multi_call_contract
            });

            const erc20Balances = (erc20BalancesContractRes && await resolveERC20Balances(
                erc20BalancesContractRes,
                network
            )) || [];

            const nativeTokens = network.tokens.filter(t => !t.contract)
            const nativeBalances: Balance[] = []

            for (let i = 0; i < nativeTokens.length; i++) {
                const token = nativeTokens[i]
                const nativeBalanceData = await getTokenBalance(address as `0x${string}`, Number(network.chain_id))
                const nativeBalance = (nativeBalanceData
                    && await resolveBalance(network, token, nativeBalanceData))
                if (nativeBalance)
                    nativeBalances.push(nativeBalance)
            }

            let balances: Balance[] = []

            return balances.concat(erc20Balances, nativeBalances)
        }
        catch (e) {
            console.log(e)
        }

    }

    const getBalance = async ({ network, token, address }: BalanceProps) => {
        try {
            const resolveChain = (await import("../../../resolveChain")).default
            const chain = resolveChain(network)
            if (!chain) return

            const { createPublicClient, http } = await import("viem")
            const publicClient = createPublicClient({
                chain,
                transport: http()
            })

            const {
                getTokenBalance,
                resolveBalance,
            } = await import("../getBalance")

            const balanceData = await getTokenBalance(address as `0x${string}`, Number(network.chain_id))
            const balance = (balanceData
                && await resolveBalance(network, token, balanceData))

            return balance
        }
        catch (e) {
            console.log(e)
        }
    }

    // const getGas = async ({ layer, address, currency, userDestinationAddress }: GasProps) => {

    //     if (!layer || !address) {
    //         return
    //     }
    //     const chainId = Number(layer?.chain_id)
    //     const nativeToken = layer?.tokens.find(a => a.is_native)

    //     if (!nativeToken || !chainId || !layer)
    //         return

    //     const contract_address = layer?.tokens?.find(a => a?.symbol === currency?.symbol)?.contract as `0x${string}`
    //     const destination_address = layer?.managed_accounts?.[0]?.address as `0x${string}`

    //     try {
    //         const { createPublicClient, http } = await import("viem")
    //         const resolveChain = (await import("../../../resolveChain")).default
    //         const publicClient = createPublicClient({
    //             chain: resolveChain(layer),
    //             transport: http(),
    //         })
    //         const getOptimismGas = (await import("./getGas")).default
    //         const gasProvider = new getOptimismGas(
    //             publicClient,
    //             chainId,
    //             contract_address,
    //             address,
    //             layer,
    //             currency,
    //             destination_address,
    //             nativeToken,
    //             address !== userDestinationAddress,
    //         )

    //         const gas = await gasProvider.resolveGas()

    //         return [gas!]

    //     }
    //     catch (e) {
    //         console.log(e)
    //     }

    // }

    return {
        getBalance,
        getNetworkBalances,
        // getGas,
        supportedNetworks
    }
}